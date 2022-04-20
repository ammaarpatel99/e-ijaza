import {CredentialIssuer, MasterCredsStoreProtocol} from '../aries-based-protocols'
import {catchError, first, forkJoin, mergeMap, Observable, ReplaySubject, switchMap, withLatestFrom} from "rxjs";
import {Server} from '@project-types'
import {map} from "rxjs/operators";
import {Immutable} from "@project-utils";
import {State} from "../state";

export class MasterCredentialsManager {
  static readonly instance = new MasterCredentialsManager()
  private constructor() { }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasters>>(1)
  readonly state$ = this._state$.asObservable()

  initialise$() {
    return MasterCredsStoreProtocol.instance.getFromStore$().pipe(
      map(state => this._state$.next(state)),
      map(() => this.watchSubjectOntology())
    )
  }

  addMaster$(did: string, subject: string) {
    return this.state$.pipe(
      first(),
      map(state => {
        if (!!state.get(did)?.get(subject))
          throw new Error(`Adding master when ${did} already is master in ${subject}`)
        return state
      }),
      switchMap(state =>
        CredentialIssuer.instance.issue$(did, subject).pipe(
          map(credInfo => ({state, credInfo}))
        )
      ),
      map(({credInfo, state}) => {
        const data = [...state].map(([did, subjects]) => {
          const map = new Map(subjects)
          return [did, map] as [typeof did, typeof map]
        })
        const newState = new Map(data)
        let subjectMap = newState.get(did)
        if (!subjectMap) {
          subjectMap = new Map()
          newState.set(did, subjectMap)
        }
        subjectMap.set(subject, credInfo)
        this._state$.next(newState)
      })
    )
  }

  removeMaster$(did: string, subject: string) {
    return this.state$.pipe(
      first(),
      switchMap(state => {
        const credInfo = state.get(did)?.get(subject)
        if (!credInfo) throw new Error(`Removing master when ${did} is not master in ${subject}`)
        return CredentialIssuer.instance.revoke$(credInfo)
          .pipe(map(() => state))
      }),
      map(state => {
        const data = [...state].map(([did, subjects]) => {
          const map = new Map(subjects)
          return [did, map] as [typeof did, typeof map]
        })
        const newState = new Map(data)
        let subjectMap = newState.get(did)
        if (!subjectMap) return
        subjectMap.delete(subject)
        this._state$.next(newState)
      })
    )
  }

  private watchSubjectOntology() {
    const obs$: Observable<void> = State.instance.subjectOntology$.pipe(
      map(data => new Set(...data.keys())),
      withLatestFrom(this._state$),
      mergeMap(([subjects, masters]) => {
        const revokeRequests = [...masters]
          .flatMap(([did, data]) => [...data]
            .filter(([subject, _]) => !subjects.has(subject))
            .map(([subject, credInfo]) =>
              CredentialIssuer.instance.revoke$(credInfo)
                .pipe(map(() => ({did, subject})))
            )
          )
        return forkJoin(revokeRequests).pipe(
          map(revoked => ({masters, revoked}))
        )
      }),
      map(({masters, revoked}) => {
        const data = [...masters].map(([did, subjects]) => {
          const map = new Map(subjects)
          return [did, map] as [typeof did, typeof map]
        })
        const newState = new Map(data)
        let changed = false
        revoked.forEach(({did, subject}) => {
          let subjectMap = newState.get(did)
          if (subjectMap) {
            subjectMap.delete(subject)
            changed = true
          }
        })
        if (changed) {
          [...newState].forEach(([did, data]) => {
            if (data.size === 0) newState.delete(did)
          })
          this._state$.next(newState)
        }
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
