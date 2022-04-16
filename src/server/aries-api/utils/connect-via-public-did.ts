import {Aries} from '@project-types'
import {WebhookMonitor} from "../../webhook";
import {deleteConnection} from '../connections'
import {requestConnectionAgainstDID} from "../did";
import {from, Observable, of, switchMap, tap} from "rxjs";
import {map} from "rxjs/operators";

export function connectViaPublicDID$ (
  pathOptions: Aries.paths['/didexchange/create-request']['post']['parameters']['query']
) {
  if (!pathOptions.their_public_did.startsWith(`did:sov:`)) {
    pathOptions.their_public_did = `did:sov:${pathOptions.their_public_did}`
  }
  return of(pathOptions).pipe(
    switchMap(options => from(requestConnectionAgainstDID(options))),
    map(res => res.connection_id!),
    switchMap(conn_id => waitForConnectionToComplete$(conn_id))
  )
}

function waitForConnectionToComplete$(conn_id: string) {
  return new Observable<string>(subscriber => {
    WebhookMonitor.instance.monitorConnection$(conn_id).pipe(
      tap({
        complete: () => {
          subscriber.next(conn_id)
          subscriber.complete()
        },
        error: e => {
          from(deleteConnection({conn_id}))
            .subscribe({
              complete: () => subscriber.error(e),
              error: _e => subscriber.error(_e)
            })
        }
      })
    ).subscribe()
  })
}
