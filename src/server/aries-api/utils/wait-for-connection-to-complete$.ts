import {from, Observable, tap} from "rxjs";
import {WebhookMonitor} from "../../webhook";
import {deleteConnection} from "../connections";

export function waitForConnectionToComplete$(conn_id: string) {
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
