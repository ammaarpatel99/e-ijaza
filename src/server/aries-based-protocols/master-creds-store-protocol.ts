import {Schemas, Server} from '@project-types'
import {Immutable, voidObs$} from "@project-utils";
import {catchError, debounceTime, forkJoin, from, last, switchMap} from "rxjs";
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

export class MasterCredsStoreProtocol {
  static readonly instance = new MasterCredsStoreProtocol()
  private constructor() { }

  initialise$() {
    return voidObs$.pipe(
      map(() => this.watchState())
    )
  }

  getFromStore$() {
    return this.getStored$().pipe(
      map(creds => creds.results?.shift()),
      map(store => {
        if (!store) return new Map()
        const credentials = JSON.parse(store.attrs!['credentials']) as Schemas.MastersInternalSchema['credentials']
        return MasterCredsStoreProtocol.schemaToState({credentials})
      })
    )
  }

  private watchState() {
    const obs$ = State.instance.controllerMasters$.pipe(
      debounceTime(1000),
      switchMap(state => this.update$(state))
    )
    obs$.pipe(
      catchError(e => {
        console.error(e)
        return obs$
      })
    ).subscribe()
  }

  private update$(masterState: Immutable<Server.ControllerMasters>) {
    return this.deleteStored$().pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections =>
        this.storeData$(MasterCredsStoreProtocol.stateToSchema(masterState), connections[0])
          .pipe(map(() => connections))
      ),
      switchMap(connections => deleteSelfConnections$(connections))
    )
  }

  private getStored$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${mastersInternalSchema.schemaID}"}`})
      ))
    )
  }

  private deleteStored$() {
    return this.getStored$().pipe(
      map(res => res.results),
      map(creds => creds?.map(
        cred => from(deleteCredential({credential_id: cred.referent!}))
      )),
      switchMap(arr => {
        if (!arr) return voidObs$
        return forkJoin(arr).pipe(map(() => undefined as void))
      })
    )
  }

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

  private storeData$(data: Schemas.MastersInternalSchema, connection_id: string) {
    return voidObs$.pipe(
      switchMap(() => from(issueCredential({
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
      }))),
      switchMap(({credential_exchange_id}) =>
        WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)
          .pipe(last())
      ),
      map(() => undefined as void)
    )
  }
}
