import {Aries} from '@project-types'
import {requestConnectionAgainstDID} from "../did";
import {from, of, switchMap} from "rxjs";
import {map} from "rxjs/operators";
import {waitForConnectionToComplete$} from "./wait-for-connection-to-complete$";

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

