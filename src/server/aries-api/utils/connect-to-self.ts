import {voidObs$} from "@project-utils";
import {forkJoin, from, switchMap} from "rxjs";
import {createInvitation, deleteConnection, receiveInvitation} from "../connections";
import {map} from "rxjs/operators";
import {waitForConnectionToComplete$} from "./wait-for-connection-to-complete$";

export function connectToSelf$() {
  return voidObs$.pipe(
    switchMap(() => from(
      createInvitation({auto_accept: true, alias: 'me 2'}, {my_label: 'me 1'})
    )),
    switchMap(({connection_id: conn_id1, invitation}) =>
      from(receiveInvitation({auto_accept: true}, invitation)).pipe(
        map(({connection_id: conn_id2}) => [conn_id1!, conn_id2!] as [string, string])
      )
    ),
    switchMap(connections =>
      waitForConnectionToComplete$(connections[0])
        .pipe(map(() => connections))
    )
  )
}

export function deleteSelfConnections$(connections: [string, string]) {
  return voidObs$.pipe(
    switchMap(() =>
      forkJoin([
        from(deleteConnection({conn_id: connections[0]})),
        from(deleteConnection({conn_id: connections[1]}))
      ]).pipe(map(() => undefined as void))
    )
  )
}
