import {
  catchError,
  combineLatestWith, defer, filter,
  first,
  forkJoin,
  from, mergeMap,
  Observable,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {Immutable} from "@project-utils";
import {Server, API} from '@project-types'
import {CredentialIssueProtocol} from "../aries-based-protocols";
import {map} from "rxjs/operators";
import {deleteCredential} from "../aries-api";
import {State} from "../state";
import {SubjectOntology} from "../subject-ontology";

export class UserCredentialsManager {
  static readonly instance = new UserCredentialsManager()
  private constructor() { }

  static heldCredentialID(heldCredential: Pick<Immutable<Server.UserHeldCredential>, 'subject' | 'issuerDID'>) {
    return `${heldCredential.issuerDID}-${heldCredential.subject}`
  }

  static issuedCredentialID(heldCredential: Pick<Immutable<Server.UserIssuedCredential>, 'subject' | 'theirDID'>) {
    return `${heldCredential.theirDID}-${heldCredential.subject}`
  }

  private readonly _heldCredentials$ = new ReplaySubject<Immutable<Server.UserHeldCredentials>>(1)
  private readonly _reachableSubjects$ = new ReplaySubject<Immutable<Server.ReachableSubjects>>(1)
  readonly heldCredentials$ = this._heldCredentials$.asObservable()
  readonly reachableSubjects$ = this._reachableSubjects$.asObservable()
  readonly issuedCredentials$ = CredentialIssueProtocol.instance.issuedCredentials$

  userInitialise$() {
    return CredentialIssueProtocol.instance.userInitialise$().pipe(
      map(() => {
        this._heldCredentials$.next(new Set())
        this.watchHeldCredentials()
        this.watchStates()
      })
    )
  }

  updatePublicStatus$(newHeldCredential: Immutable<API.HeldCredential>) {
    const credLocalID = UserCredentialsManager.heldCredentialID({subject: newHeldCredential.subject, issuerDID: newHeldCredential.did})
    const newPublic = newHeldCredential.public
    return this._heldCredentials$.pipe(
      first(),
      map(state => {
        const cred = [...state].filter(_cred => credLocalID === UserCredentialsManager.heldCredentialID(_cred)).shift()
        if (!cred) throw new Error(`updating public status of non-existent cred`)
        if (cred.public === newPublic) return
        const newCred: typeof cred = {...cred, public: newPublic}
        const newState = new Set(state)
        newState.delete(cred)
        newState.add(newCred)
        this._heldCredentials$.next(newState)
      })
    )
  }

  deleteCred$(heldCredential: Immutable<API.HeldCredential>) {
    const credLocalID = UserCredentialsManager.heldCredentialID({subject: heldCredential.subject, issuerDID: heldCredential.did})
    return this._heldCredentials$.pipe(
      first(),
      map(state => {
        const cred = [...state].filter(_cred => credLocalID === UserCredentialsManager.heldCredentialID(_cred)).shift()
        if (!cred) throw new Error(`deleting non-existent cred`)
        return this.deleteCredentials$([cred])
      })
    )
  }

  issue$(data: Immutable<API.IssuedCredential>) {
    return State.instance.reachableSubjects$.pipe(
      first(),
      map(subjects => {
        if (!subjects.has(data.subject)) throw new Error(`Can't issue in ${data.subject}`)
      }),
      switchMap(() => CredentialIssueProtocol.instance.userIssue$(data.did, data.subject))
    )
  }

  revoke$(data: Immutable<API.IssuedCredential>) {
    return this.issuedCredentials$.pipe(
      first(),
      switchMap(creds => {
        const cred = [...creds].filter(cred => cred.theirDID === data.did && cred.subject === data.subject).shift()
        if (!cred) throw new Error(`Can't revoke credential that isn't issued`)
        return CredentialIssueProtocol.instance.userRevoke$(cred)
      })
    )
  }

  private watchHeldCredentials() {
    const obs$: Observable<void> =CredentialIssueProtocol.instance.heldCredentials$.pipe(
      withLatestFrom(this._heldCredentials$),
      map(([state, _oldState]) => {
        const newState: Server.UserHeldCredentials = new Set()
        const oldState = [..._oldState]
        state.forEach(cred => {
          const oldCred = oldState
            .filter(oldCred => UserCredentialsManager.heldCredentialID(oldCred) === UserCredentialsManager.heldCredentialID(cred))
            .shift()
          if (oldCred) newState.add(oldCred)
          else newState.add(cred)
        })
        this._heldCredentials$.next(newState)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchStates() {
    const obs$: Observable<void> = State.instance.subjectOntology$.pipe(
      combineLatestWith(State.instance.controllerDID$, this._heldCredentials$, this.issuedCredentials$),
      mergeMap(([subjects, controllerDID, heldCreds, issuedCreds]) => {
        const deletions = [...heldCreds]
          .filter(cred => !subjects.has(cred.subject))
          .map(cred => from(deleteCredential({credential_id: cred.credentialID})))
        const revocations = [...issuedCreds]
          .filter(cred => !subjects.has(cred.subject))
          .map(cred => CredentialIssueProtocol.instance.userRevoke$(cred))
        if (deletions.length !== 0 || revocations.length !== 0) {
          return forkJoin([...deletions, ...revocations])
            .pipe(map(() => null))
        }
        const heldSubjects = new Set([...heldCreds].map(cred => cred.subject))
        const masterSubjects = new Set([...heldCreds]
          .filter(cred => cred.issuerDID === controllerDID)
          .map(cred => cred.subject)
        )
        return forkJoin([
          SubjectOntology.instance.getAllReachable$(heldSubjects),
          SubjectOntology.instance.getAllReachable$(masterSubjects)
        ])
      }),
      filter(res => res !== null),
      map(res => res as Exclude<typeof res, null>),
      map(([subjects, masterSubjects]) => {
        const reachableSubjects: Server.ReachableSubjects = new Map()
        subjects.forEach(subject => reachableSubjects.set(subject, false))
        masterSubjects.forEach(subject => reachableSubjects.set(subject, true))
        this._reachableSubjects$.next(reachableSubjects)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private deleteCredentials$(creds: Immutable<Server.UserHeldCredential[]>) {
    const obsArr = creds.map(cred => defer(() =>
      from(deleteCredential({credential_id: cred.credentialID}))
    ))
    return forkJoin(obsArr).pipe(
      switchMap(() => this._heldCredentials$),
      first(),
      map(state => {
        const newState = new Set(state)
        creds.forEach(cred => newState.delete(cred))
        this._heldCredentials$.next(newState)
      })
    )
  }
}
