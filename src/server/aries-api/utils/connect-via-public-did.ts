import {Aries} from '@project-types'
import {requestConnectionAgainstDID} from "../did";
import {first, from, last, switchMap} from "rxjs";
import {map} from "rxjs/operators";
import {State} from "../../state";
import {WebhookMonitor} from "../../webhook";

export function connectViaPublicDID$ (
  pathOptions: Omit<Aries.paths['/didexchange/create-request']['post']['parameters']['query'], 'my_label'>
) {
  return State.instance.name$.pipe(
    first(),
    map(my_label => {
      const options = {...pathOptions, my_label}
      if (!options.their_public_did.startsWith(`did:sov:`)) {
        options.their_public_did = `did:sov:${options.their_public_did}`
      }
      return options
    }),
    switchMap(options => from(requestConnectionAgainstDID(options))),
    map(res => res.connection_id!),
    switchMap(conn_id =>
      WebhookMonitor.instance.monitorConnection$(conn_id).pipe(
        last(),
        map(() => conn_id)
      )
    )
  )
}

