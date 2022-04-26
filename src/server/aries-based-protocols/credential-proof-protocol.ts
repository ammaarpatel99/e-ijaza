import {connectViaPublicDID$, getConnection, presentProof, rejectProof, requestProof} from "../aries-api";
import {
  catchError,
  filter,
  first,
  from,
  last,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap
} from "rxjs";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Immutable, voidObs$} from "@project-utils";
import {teachingSchema} from "../schemas";
import {SubjectOntology} from "../subject-ontology";

interface SubjectToProve {
  subject: string
  issuerDID: string
}

interface CredToProve extends SubjectToProve {
  cred_id: string
}

interface IncomingRequest {
  subject: string
  pres_ex_id: string
  did: string
}

export class CredentialProofProtocol {
  private static _instance: CredentialProofProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new CredentialProofProtocol()
    return this._instance
  }
  private constructor() { }

  private static SUBJECTS_PROOF_NAME = 'Authorization - Subjects to Prove Subject'
  private static CREDENTIALS_PROOF_NAME = 'Authorization - Subjects to Prove Subject'

  // OUTGOING

  requestProof$(did: string, subject: string) {
    return connectViaPublicDID$({their_public_did: did}).pipe(
      switchMap(connectionID => {
        return this.requestProofForSubjects$(connectionID, subject).pipe(
          switchMap(data => {
            if (!data) return of(undefined)
            return this.requestProofForCredentials$(connectionID, data)
          })
        )
      })
    )
  }

  private requestProofForSubjects$(connection_id: string, subject: string) {
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id,
        proof_request: {
          name: CredentialProofProtocol.SUBJECTS_PROOF_NAME,
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
      switchMap(({presentation}) => {
        const subjects = JSON.parse(presentation!.requested_proof!.self_attested_attrs!['subjects']) as SubjectToProve[]
        return SubjectOntology.instance.canReachFromSubjects$(new Set(subjects.map(x => x.subject)), subject).pipe(
          map(reached => {
            if (reached) return subjects
            return undefined
          })
        )
      }),
      catchError(e => {
        console.error(e)
        return of(undefined)
      })
    )
  }

  private requestProofForCredentials$(connection_id: string, subjects: SubjectToProve[]) {
    const time = Date.now().toString()
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id,
        proof_request: {
          name: CredentialProofProtocol.CREDENTIALS_PROOF_NAME,
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
      last(),
      map(() => subjects),
      catchError(e => {
        console.error(e)
        return of(undefined)
      })
    )
  }

  // INCOMING

  private readonly _incomingRequest$ = new ReplaySubject<Immutable<IncomingRequest>>(1)
  readonly incomingRequest$ = this._incomingRequest$.asObservable()

  initialiseUser$() {
    return voidObs$.pipe(
      map(() => {this.watchRequests()})
    )
  }

  respondToRequest$(pres_ex_id: string, proof: Immutable<CredToProve[]>) {
    return voidObs$.pipe(
      switchMap(() => from(presentProof({pres_ex_id}, {
        requested_predicates: {},
        requested_attributes: {},
        self_attested_attributes: {
          subjects: JSON.stringify(proof.map(cred => ({...cred, cred_id: undefined})))
        }
      }))),
      switchMap(({connection_id}) => this.watchForCredsRequest$(connection_id!, proof))
    )
  }

  rejectProof$(pres_ex_id: string) {
    return voidObs$.pipe(
      switchMap(() => from(rejectProof({pres_ex_id}, {
        description: 'Refused to present proof of authority in subject'
      })))
    )
  }

  private watchRequests() {
    const obs$: Observable<void> = WebhookMonitor.instance.proofs$.pipe(
      filter(({state, presentation_request}) => state === 'request_received'
        && presentation_request?.name === CredentialProofProtocol.SUBJECTS_PROOF_NAME
      ),
      mergeMap(({presentation_request, presentation_exchange_id, connection_id}) => {
        const subject = presentation_request!.requested_attributes['subjects'].name!
        return from(getConnection({conn_id: connection_id!})).pipe(
          map(({their_public_did}) => ({
            subject, pres_ex_id: presentation_exchange_id!, did: their_public_did!
          })),
        )
      }),
      map(data => { this._incomingRequest$.next(data) }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchForCredsRequest$(connectionID: string, proof: Immutable<CredToProve[]>) {
    return WebhookMonitor.instance.proofs$.pipe(
      filter(({state, presentation_request, connection_id}) =>
        connection_id === connectionID
        && state === 'request_received'
        && presentation_request?.name === CredentialProofProtocol.CREDENTIALS_PROOF_NAME
      ),
      first(),
      switchMap(({presentation_exchange_id}) => from(presentProof({pres_ex_id: presentation_exchange_id!}, {
        self_attested_attributes: {},
        requested_predicates: {},
        requested_attributes: Object.fromEntries(proof.map(cred => [cred.subject, {
          cred_id: cred.cred_id, revealed: true
        }] as [string, {cred_id: string; revealed: true}]))
      }))),
      switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
      last(),
      map(() => undefined as void)
    )
  }
}
