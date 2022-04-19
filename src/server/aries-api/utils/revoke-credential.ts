import {Server} from '@project-types'
import {voidObs$} from "@project-utils";
import {from, switchMap} from "rxjs";
import {revokeCredential} from "../issue-credentials";

export function revokeCredential$(credInfo: Server.CredentialInfo, comment?: string) {
  return voidObs$.pipe(
    switchMap(() => from(revokeCredential({
      connection_id: credInfo.connection_id,
      cred_rev_id: credInfo.cred_rev_id,
      rev_reg_id: credInfo.rev_reg_id,
      publish: true,
      notify: true,
      comment
    })))
  )
}
