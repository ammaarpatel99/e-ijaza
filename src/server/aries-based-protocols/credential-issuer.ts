import {connectViaPublicDID$, issueCredential, revokeCredential} from "../aries-api";
import {from, last, switchMap} from "rxjs";
import {teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Server} from '@project-types'
import {voidObs$} from "@project-utils";

export class CredentialIssuer {
  static readonly instance = new CredentialIssuer()
  private constructor() { }

  issue$(did: string, subject: string) {
    return connectViaPublicDID$({their_public_did: did}).pipe(
      switchMap(connection_id => from(issueCredential({
        connection_id,
        auto_remove: false,
        cred_def_id: teachingSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'subject',
            value: subject
          }]
        }
      }))),
      switchMap(({credential_exchange_id}) =>
        WebhookMonitor.instance.monitorCredential$(credential_exchange_id!).pipe(
          last(),
          map(data => ({
            connection_id: data.connection_id!,
            rev_reg_id: data.revoc_reg_id!,
            cred_rev_id: data.revocation_id!
          } as Server.CredentialInfo))
        )
      )
    )
  }

  revoke$(credInfo: Server.CredentialInfo) {
    return voidObs$.pipe(
      switchMap(() => from(revokeCredential({
        connection_id: credInfo.connection_id,
        cred_rev_id: credInfo.cred_rev_id,
        rev_reg_id: credInfo.rev_reg_id,
        publish: true,
        notify: true
      })))
    )
  }
}
