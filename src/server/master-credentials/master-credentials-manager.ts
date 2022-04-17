import {CredentialIssuer, MasterCredsStoreProtocol} from '../aries-based-protocols'
import {first, ReplaySubject, switchMap} from "rxjs";
import {Server} from '@project-types'
import {map} from "rxjs/operators";
import {Immutable} from "@project-utils";

export class MasterCredentialsManager {
  static readonly instance = new MasterCredentialsManager()
  private constructor() { }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasters>>(1)
  readonly state$ = this._state$.asObservable()

  initialise$() {
    return MasterCredsStoreProtocol.instance.getFromStore$().pipe(
      map(state => this._state$.next(state))
    )
  }

  addMaster$(did: string, subject: string) {
    this.state$.pipe(
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
    this.state$.pipe(
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
}
