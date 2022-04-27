import {Schemas, Server} from '@project-types'
import {forkJoin$, Immutable} from "@project-utils";
import {catchError, defer, from, last, mergeMap, Observable, switchMap} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {mastersInternalSchema} from "../schemas";
import {map} from "rxjs/operators";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";

export class MastersStoreProtocol {
  private static _instance: MastersStoreProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new MastersStoreProtocol()
    return this._instance
  }
  private constructor() { }

  private static stateToSchema(state: Immutable<Server.ControllerMasters>): Schemas.MastersInternalSchema {
    const data = [...state]
      .map(([did, creds]) => {
        const subjectsWithData = [...creds]
          .map(([subject, credData]) => ({subject, ...credData}))
        return [did, subjectsWithData] as [typeof did, typeof subjectsWithData]
      })
    return { credentials: Object.fromEntries(data) }
  }

  private static schemaToState(schema: Schemas.MastersInternalSchema): Server.ControllerMasters {
    const data = [...Object.entries(schema.credentials)]
      .map(([did, subjects]) => {
        const data = subjects.map(subjectData =>
          [subjectData.subject, subjectData] as
            [string, Omit<typeof subjectData, 'subject'>]
        )
        const map = new Map(data)
        return [did, map] as [typeof did, typeof map]
      })
    return new Map(data)
  }

  initialiseController$() {
    return this.getFromStore$().pipe(
      map(data => {
        this.watchState()
        return data
      })
    )
  }

  private getFromStore$() {
    return this.getStored$().pipe(
      map(creds => creds.shift()),
      map(store => {
        if (!store) return new Map()
        const credentials = JSON.parse(store.attrs!['credentials']) as Schemas.MastersInternalSchema['credentials']
        return MastersStoreProtocol.schemaToState({credentials})
      })
    )
  }

  private getStored$() {
    return defer(() => from(
      getHeldCredentials({wql: `{"schema_id": "${mastersInternalSchema.schemaID}"}`})
    )).pipe(
      map(results => results.results || [])
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance.controllerMasters$.pipe(
      mergeMap(state => this.update$(state)),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private update$(masterState: Immutable<Server.ControllerMasters>) {
    return this.deleteStored$().pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections =>
        this.storeData$(MastersStoreProtocol.stateToSchema(masterState), connections[0])
          .pipe(map(() => connections))
      ),
      switchMap(connections => deleteSelfConnections$(connections))
    )
  }

  private deleteStored$() {
    return this.getStored$().pipe(
      map(creds => creds.map(
        cred => from(deleteCredential({credential_id: cred.referent!}))
      )),
      switchMap(arr => forkJoin$(arr)),
      map(() => undefined as void)
    )
  }

  private storeData$(data: Schemas.MastersInternalSchema, connection_id: string) {
    return defer(() => from(issueCredential({
      connection_id,
      auto_remove: true,
      cred_def_id: mastersInternalSchema.credID,
      credential_proposal: {
        attributes: [{
          name: 'credentials',
          value: JSON.stringify(data.credentials)
        }]
      },
      comment: 'Store of data related to master teaching credentials'
    }))).pipe(
      switchMap(({credential_exchange_id}) =>
        WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)
      ),
      last(),
      map(() => undefined as void)
    )
  }
}
