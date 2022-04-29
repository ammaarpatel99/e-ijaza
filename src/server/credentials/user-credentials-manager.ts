import {
  catchError,
  combineLatestWith, defer, filter,
  first,
  from, mergeMap,
  Observable, of,
  ReplaySubject,
  switchMap, tap,
  withLatestFrom
} from "rxjs";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {Server, API} from '@project-types'
import {CredentialIssueProtocol} from "../aries-based-protocols";
import {map} from "rxjs/operators";
import {deleteCredential} from "../aries-api";
import {State} from "../state";
import {SubjectOntology} from "../subject-ontology";

export class UserCredentialsManager {
  private static _instance: UserCredentialsManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new UserCredentialsManager()
    return this._instance
  }
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

  initialiseUser$() {
    return CredentialIssueProtocol.instance.initialiseUser$().pipe(
      map(() => {
        this._heldCredentials$.next(new Set())
        this.watchStateForHeldCreds()
        this.watchStateForIssuedCreds()
        this.watchStateForReachable()
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
      tap(() => State.instance.startUpdating()),
      mergeMap(state => {
        const cred = [...state].filter(_cred => credLocalID === UserCredentialsManager.heldCredentialID(_cred)).shift()
        if (!cred) throw new Error(`deleting non-existent cred`)
        return defer(() => from(
          deleteCredential({credential_id: cred.credentialID})
        )).pipe(
          map(() => {
            const newState = new Set(state)
            newState.delete(cred)
            this._heldCredentials$.next(newState)
          })
        )
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      })
    )
  }

  issue$(data: Immutable<API.IssuedCredential>) {
    return State.instance._reachableSubjects$.pipe(
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

  private watchStateForHeldCreds() {
    const obs$: Observable<void> = CredentialIssueProtocol.instance.heldCredentials$.pipe(
      combineLatestWith(State.instance._subjectOntology$),
      withLatestFrom(this._heldCredentials$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([[state, subjects], oldState]) => {
        let changed = false
        const newState: Server.UserHeldCredentials = new Set()
        const toDelete: Server.UserHeldCredentials = new Set()
        const _oldState = [...oldState]
        state.forEach(cred => {
          if (!subjects.has(cred.subject)) {
            toDelete.add(cred)
            changed = true
          } else {
            const oldCred = _oldState
              .filter(oldCred => UserCredentialsManager.heldCredentialID(oldCred) === UserCredentialsManager.heldCredentialID(cred))
              .shift()
            if (oldCred) newState.add(oldCred)
            else {
              newState.add(cred)
              changed = true
            }
          }
        })
        if (!changed && newState.size === oldState.size) return voidObs$
        return forkJoin$([...toDelete].map(cred => defer(() => from(
          deleteCredential({credential_id: cred.credentialID})
        )))).pipe(
          map(() => {
            this._heldCredentials$.next(newState)
          })
        )
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchStateForIssuedCreds() {
    const obs$: Observable<void> = this.issuedCredentials$.pipe(
      combineLatestWith(State.instance._subjectOntology$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([state, subjects]) => {
        const toRevoke: Server.UserIssuedCredentials = new Set()
        state.forEach(cred => {
          if (!subjects.has(cred.subject)) {
            toRevoke.add(cred)
          }
        })
        return forkJoin$(
          [...toRevoke].map(cred => CredentialIssueProtocol.instance.userRevoke$(cred))
        ).pipe(map(() => undefined as void))
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchStateForReachable() {
    const obs$: Observable<void> = State.instance._subjectOntology$.pipe(
      combineLatestWith(State.instance._controllerDID$, this._heldCredentials$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([_, controllerDID, heldCreds]) => {
        const heldSubjects = new Set([...heldCreds].map(cred => cred.subject))
        const masterSubjects = new Set([...heldCreds]
          .filter(cred => cred.issuerDID === controllerDID)
          .map(cred => cred.subject)
        )
        return forkJoin$([
          heldSubjects.size > 0 ? SubjectOntology.instance.getAllReachable$(heldSubjects) : of([]),
          masterSubjects.size > 0 ? SubjectOntology.instance.getAllReachable$(masterSubjects) : of([])
        ])
      }),
      map(([subjects, masterSubjects]) => {
        const reachableSubjects: Server.ReachableSubjects = new Map()
        subjects.forEach(subject => reachableSubjects.set(subject, false))
        masterSubjects.forEach(subject => reachableSubjects.set(subject, true))
        this._reachableSubjects$.next(reachableSubjects)
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
