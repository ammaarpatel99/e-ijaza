import {State} from "../../state";
import {first, switchMap} from "rxjs";
import {connectViaPublicDID$} from "./connect-via-public-did";

export function connectToController$() {
  return State.instance._controllerDID$.pipe(
    first(),
    switchMap(did => connectViaPublicDID$({their_public_did: did}))
  )
}
