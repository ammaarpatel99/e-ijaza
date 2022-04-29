import {CredentialIssueProtocol, MastersStoreProtocol, MastersShareProtocol} from '../aries-based-protocols'
import {
  catchError, combineLatestWith,
  first,
  mergeMap,
  Observable, pairwise,
  ReplaySubject,
  switchMap,
  tap
} from "rxjs";
import {Server} from '@project-types'
import {map, startWith} from "rxjs/operators";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {State} from "../state";

export class MasterCredentialsManager {
  private static _instance: MasterCredentialsManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new MasterCredentialsManager()
    return this._instance
  }
  private constructor() { }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasters>>(1)
  readonly state$ = this._state$.asObservable()

  initialiseController$() {
    return MastersStoreProtocol.instance.initialiseController$().pipe(
      map(state => {
        this._state$.next(state)
        this.watchState()
      }),
      switchMap(() => MastersShareProtocol.instance.initialiseController$())
    )
  }

  addMaster$(did: string, subject: string) {
    return this._state$.pipe(
      first(),
      map(state => {
        if (!!state.get(did)?.get(subject))
          throw new Error(`Adding master when ${did} already is master in ${subject}`)
        const newState = new Map(state)
        const oldMap = newState.get(did)
        const newMap = new Map(oldMap || [])
        newMap.set(subject, {connection_id: '', cred_rev_id: '', rev_reg_id: ''})
        newState.set(did, newMap)
        this._state$.next(newState)
      })
    )
  }

  removeMaster$(did: string, subject: string) {
    return this._state$.pipe(
      first(),
      map(state => {
        const credInfo = state.get(did)?.get(subject)
        if (!credInfo) throw new Error(`Removing master when ${did} is not master in ${subject}`)
        const newState = new Map(state)
        const oldMap = newState.get(did)
        const newMap = new Map(oldMap || [])
        newMap.delete(subject)
        newState.set(did, newMap)
        if (newMap.size === 0) newState.delete(did)
        this._state$.next(newState)
      })
    )
  }

  private issueAndRevokeCreds$(state: Immutable<Server.ControllerMasters>, previous: Immutable<Server.ControllerMasters>) {
    const revoke$ = [...previous]
      .flatMap(([did, oldCredMap]) => {
        const newCredMap = state.get(did)
        return [...oldCredMap]
          .filter(([subject, _]) => !newCredMap?.has(subject))
          .map(([_, cred]) => CredentialIssueProtocol.instance.controllerRevoke$(cred))
      })

    const add$ = [...state]
      .flatMap(([did, newCredMap]) => {
        const oldCredMap = previous.get(did)
        return [...newCredMap]
          .filter(([subject, _]) => !oldCredMap?.has(subject))
          .map(([subject, _]) =>
            CredentialIssueProtocol.instance.controllerIssue$(did, subject).pipe(
              map(cred => ({did, subject, cred}))
            )
          )
      })

    return forkJoin$(revoke$).pipe(
      switchMap(() => forkJoin$(add$)),
      map(added => {
        if (added.length === 0) return
        const data = [...state].map(([did, credMap]): [typeof did, typeof credMap] => {
          const toAdd = added.filter(({did: _did}) => did === _did)
          if (toAdd.length === 0) return [did, credMap]
          else {
            const newCredMap = new Map(credMap)
            toAdd.forEach(({subject, cred}) => newCredMap.set(subject, cred))
            return [did, newCredMap]
          }
        })
        return new Map(data) as typeof state
      })
    )
  }

  private removeInvalidated(state: Immutable<Server.ControllerMasters>, subjects: Immutable<Server.Subjects>) {
    let changed = false
    const newState = [...state]
      .map(([did, credMap]) => {
        let newMap = new Map([...credMap]
          .filter(([subject, _]) => subjects.has(subject)))
        const _changed = credMap.size !== newMap.size
        if (_changed) changed = true
        return [did, _changed ? newMap : credMap] as [typeof did, typeof credMap]
      })
      .filter(([_, credMap]) => credMap.size !== 0)
    if (changed) return new Map(newState)
    return
  }

  private watchState() {
    const obs$: Observable<void> = this._state$.pipe(
      startWith(null),
      pairwise(),
      combineLatestWith(State.instance._subjectOntology$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([[oldState, state], subjects]) => {
        const newState = this.removeInvalidated(state!, subjects)
        if (!oldState) {
          if (newState) this._state$.next(newState)
          return voidObs$
        }
        return this.issueAndRevokeCreds$(newState || state!, oldState).pipe(
          switchMap(_newState => {
            if (_newState) this._state$.next(_newState)
            else if (newState) this._state$.next(newState)
            return voidObs$
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
}
