import {
  connectViaPublicDID$, deleteCredential, getConnection,
  getHeldCredentials, getIssuedCredentials,
  isCredentialRevoked,
  issueCredential,
  revokeCredential$
} from "../aries-api";
import {filter, forkJoin, from, last, mergeMap, of, ReplaySubject, switchMap} from "rxjs";
import {teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Server, Schemas} from '@project-types'
import {voidObs$} from "@project-utils";

export class CredentialIssueProtocol {
  static readonly instance = new CredentialIssueProtocol()
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
    return revokeCredential$(credInfo)
  }

  private _heldCredentials = new ReplaySubject(1)
  private _issuedCredentials = new ReplaySubject(1)

  private getHeldCredentials$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${teachingSchema.schemaID}"}`})
      )),
      map(({results: creds}) => {
        const currentTime = Date.now().toString()
        return creds!.map(cred =>
          from(isCredentialRevoked(
          {credential_id: cred.referent!},
          {from: currentTime, to: currentTime}
          )).pipe(
            switchMap(({revoked}) => {
              if (revoked) {
                return from(deleteCredential({credential_id: cred.referent!}))
              } else return of(cred)
            })
          )
        )
      }),
      switchMap(creds => forkJoin(creds)),
      map(creds => creds.filter(cred => !!cred) as typeof creds extends (infer T)[] ? Exclude<T, void>[] : never),
      map(creds => creds.map(cred => ({
        credentialID: cred.referent!,
        subject: cred.attrs!['subject']!,
        issuerDID: cred.cred_def_id!.split(':')[0]
      })))
    )
  }

  private getIssuedCredentials$() {
    voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(({results}) => results!.filter(cred => cred.schema_id === teachingSchema.schemaID)),
      map(creds => creds.map(cred =>
        from(getConnection({conn_id: cred.connection_id!})).pipe(
          map(({their_label}) => ({
            subject: cred.credential!.attrs!['subject'] as Schemas.TeachingSchema['subject'],
            connection_id: cred.connection_id!,
            rev_eg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!,
            label: their_label || ''
          }))
        )
      )),
      switchMap(creds => forkJoin(creds))
    )
  }

  private watchRevocations$() {
    return WebhookMonitor.instance.revocations$.pipe(
      filter(({thread_id}) => thread_id.includes(teachingSchema.name)),
      mergeMap(() => this.getHeldCredentials$()),
      map(creds => this._heldCredentials.next(creds))
    )
  }
}
