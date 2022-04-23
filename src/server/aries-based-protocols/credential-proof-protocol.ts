import {connectViaPublicDID$, presentProof, rejectProof, requestProof} from "../aries-api";
import {filter, forkJoin, from, last, switchMap} from "rxjs";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {voidObs$} from "@project-utils";
import {teachingSchema} from "../../server-old2/schemas";

interface SubjectToProve {
  subject: string
  issuerDID: string
}

interface ControllerSubjectToProve extends SubjectToProve {
  subject: string
  issuerDID: string
  cred_id: string
}

export class CredentialProofProtocol {

  requestProof$(did: string, subject: string) {
    return connectViaPublicDID$({their_public_did: did}).pipe(
      switchMap(connectionID => {
        return this.requestProofForSubjects$(connectionID, subject).pipe(
          switchMap(subjects =>
            this.requestProofForCredentials$(connectionID, subjects)
              .pipe(map(() => subjects))
          )
        )
      })
    )
  }

  private requestProofForSubjects$(connection_id: string, subject: string) {
    return voidObs$.pipe(
      switchMap(connectionID => from(requestProof({
        connection_id,
        proof_request: {
          name: 'Authorization - Subjects to Prove Subject',
          version: '1.0',
          requested_predicates: {},
          requested_attributes: {
            'subjects': {
              name: subject
            }
          }
        }
      }))),
      switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
      last(),
      map(({presentation}) => {
        const subjects = JSON.parse(presentation!.requested_proof!.self_attested_attrs!['subjects']) as SubjectToProve[]
        // TODO: check subjects are valid to reach target
        return subjects
      })
    )
  }

  private requestedProofsForSubjects$() {
    return WebhookMonitor.instance.proofs$.pipe(
      filter(({presentation_request, state}) => presentation_request?.name === 'Authorization - Subjects to Prove Subject' && state === 'request_received'),
      map(({presentation_request, presentation_exchange_id, connection_id}) => {
        const subject = presentation_request!.requested_attributes['subjects'].name
        return {subject, presentation_exchange_id, connection_id}
      })
    )
  }

  private replyToProofForSubjects$(connection_id: string, pres_ex_id: string, subjects: ControllerSubjectToProve[]) {
    return voidObs$.pipe(
      switchMap(() => from(presentProof({
        pres_ex_id
      }, {
        requested_attributes: {},
        requested_predicates: {},
        self_attested_attributes: {
          subjects: JSON.stringify(subjects)
        }
      }))),
      switchMap(() => forkJoin([
        WebhookMonitor.instance.monitorProof$(pres_ex_id).pipe(last()),
        this.replyToProofForCredentials$(connection_id, subjects)
      ]))
    )
  }

  private replyToProofForCredentials$(connectionID: string, subjects: ControllerSubjectToProve[]) {
    return WebhookMonitor.instance.proofs$.pipe(
      filter(({presentation_request, state, connection_id}) =>
        presentation_request?.name === 'Authorization - Credentials to Prove Subjects' &&
        state === 'request_received' && connection_id === connectionID
      ),
      switchMap(({presentation_exchange_id}) => from(presentProof({pres_ex_id: presentation_exchange_id!}, {
        self_attested_attributes: {},
        requested_predicates: {},
        requested_attributes: Object.fromEntries(subjects.map(subject => {
          const key = subject.subject
          const data = {
            cred_id: subject.cred_id,
            revealed: true
          }
          return [key, data] as [typeof key, typeof data]
        }))
      }))),
      switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
      last()
    )
  }

  private rejectProofForSubjects$(pres_ex_id: string) {
    return voidObs$.pipe(
      switchMap(() => from(rejectProof({pres_ex_id}, {
        description: 'Refused to present proof of authority in subject'
      })))
    )
  }

  private requestProofForCredentials$(connection_id: string, subjects: SubjectToProve[]) {
    const time = Date.now().toString()
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id,
        proof_request: {
          name: 'Authorization - Credentials to Prove Subjects',
          version: '1.0',
          requested_predicates: {},
          non_revoked: {
            from: time, to: time
          },
          requested_attributes: Object.fromEntries(subjects.map(subject => [subject.subject, {
            name: 'subject',
            restrictions: [{
              schema_id: teachingSchema.schemaID,
              [`attr::subject::value`]: subject.subject,
              issuer_did: subject.issuerDID
            }]
          }]))
        }
      }))),
      switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
      last()
    )
  }
}
