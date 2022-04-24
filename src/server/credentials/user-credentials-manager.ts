import {
  catchError,
  combineLatestWith,
  first,
  forkJoin,
  from,
  Observable,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {Immutable} from "@project-utils";
import {Server, API} from '@project-types'
import {CredentialIssueProtocol} from "../aries-based-protocols";
import {map, shareReplay} from "rxjs/operators";
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
  readonly heldCredentials$ = this._heldCredentials$.asObservable()
  readonly issuedCredentials$ = CredentialIssueProtocol.instance.issuedCredentials$
  private readonly _reachableSubjects$ = new ReplaySubject<Immutable<Server.ReachableSubjects>>(1)
  readonly reachableSubjects$ = this._reachableSubjects$.asObservable()
  readonly masterCredentials$ = this._masterCreds$()

  userInitialise$() {
    return CredentialIssueProtocol.instance.userInitialise$().pipe(
      map(() => {
        this._heldCredentials$.next(new Set())
        this.watchHeldCredentials()
        this.watchReachable()
      })
    )
  }

  updatePublicStatus$(newHeldCredential: API.HeldCredential) {
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

  deleteCred$(heldCredential: API.HeldCredential) {
    const credLocalID = UserCredentialsManager.heldCredentialID({subject: heldCredential.subject, issuerDID: heldCredential.did})
    return this._heldCredentials$.pipe(
      first(),
      map(state => {
        const cred = [...state].filter(_cred => credLocalID === UserCredentialsManager.heldCredentialID(_cred)).shift()
        if (!cred) throw new Error(`deleting non-existent cred`)
        return from(deleteCredential({credential_id: cred.credentialID})).pipe(
          map(() => {
            const newState = new Set(state)
            newState.delete(cred)
            this._heldCredentials$.next(newState)
          })
        )
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
            .filter(_cred => UserCredentialsManager.heldCredentialID(_cred) === UserCredentialsManager.heldCredentialID(cred))
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

  private watchReachable() {
    const obs$: Observable<void> = this._heldCredentials$.pipe(
      combineLatestWith(State.instance.subjectOntology$, State.instance.controllerDID$),
      switchMap(([state, _, controllerDID]) => {
        const allSubjects = new Set([...state].map(cred => cred.subject))
        const masterSubjects = new Set([...state]
          .filter(cred => cred.issuerDID === controllerDID)
          .map(cred => cred.subject))
        return forkJoin([
          SubjectOntology.instance.getAllReachable$(allSubjects),
          SubjectOntology.instance.getAllReachable$(masterSubjects)
        ])
      }),
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

  private _masterCreds$() {
    return this._heldCredentials$.pipe(
      withLatestFrom(State.instance.controllerDID$),
      map(([state, controllerDID]) => {
        const newState: Server.UserHeldCredentials = new Set()
        state.forEach(cred => {
          if (cred.issuerDID === controllerDID) newState.add(cred)
        })
        return newState as typeof state
      }),
      shareReplay(1)
    )
  }
}
