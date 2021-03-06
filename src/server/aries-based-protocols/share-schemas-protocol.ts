import {WebhookMonitor} from "../webhook";
import {catchError, defer, filter, from, last, mergeMap, Observable, switchMap} from "rxjs";
import {connectToController$, deleteConnection, deleteProof, presentProof, requestProof} from "../aries-api";
import {
  mastersPublicSchema,
  masterVoteSchema,
  subjectDataSchema,
  subjectsListSchema,
  subjectVoteSchema,
  teachingSchema
} from "../schemas";
import {voidObs$} from "@project-utils";
import {map} from "rxjs/operators";


export class ShareSchemasProtocol {
  private static _instance: ShareSchemasProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new ShareSchemasProtocol()
    return this._instance
  }
  private constructor() { }

  private static PROOF_NAME = 'Schema Set Up'

  initialiseController$() {
    return voidObs$.pipe(
      map(() => {
        this.watchRequests()
      })
    )
  }

  getSchemasFromController$() {
    return connectToController$().pipe(
      switchMap(conn_id =>
        this.proofRequest$(conn_id)
          .pipe(map(pres_ex_id => ({conn_id, pres_ex_id})))
      ),
      switchMap(({pres_ex_id, conn_id}) =>
        this.processProofResult$(pres_ex_id)
          .pipe(map(() => ({pres_ex_id, conn_id})))
      ),
      switchMap(({pres_ex_id, conn_id}) => this.deleteConnectionAndProof$(conn_id, pres_ex_id))
    )
  }

  private watchRequests() {
    const obs$: Observable<void> = WebhookMonitor.instance.proofs$.pipe(
      filter(proof => proof.presentation_request?.name === ShareSchemasProtocol.PROOF_NAME && proof.state === 'request_received'),
      mergeMap(proof => from(
        presentProof({pres_ex_id: proof.presentation_exchange_id!}, {
          requested_attributes: {},
          requested_predicates: {},
          self_attested_attributes: {
            subjectDataSchema: subjectDataSchema.schemaID,
            subjectsListSchema: subjectsListSchema.schemaID,
            subjectVoteSchema: subjectVoteSchema.schemaID,
            mastersPublicSchema: mastersPublicSchema.schemaID,
            masterVoteSchema: masterVoteSchema.schemaID,
            teachingSchema: teachingSchema.schemaID
          }
        })
      )),
      switchMap(({connection_id, presentation_exchange_id}) =>
        this.deleteConnectionAndProof$(connection_id!, presentation_exchange_id!)
      ),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private proofRequest$(conn_id: string) {
    return defer(() => from(requestProof({
      connection_id: `${conn_id}`,
      proof_request : {
        name: ShareSchemasProtocol.PROOF_NAME,
        version: '1.0',
        requested_attributes: {
          subjectDataSchema: {
            name: 'subjectDataSchema'
          },
          subjectsListSchema: {
            name: 'subjectsListSchema'
          },
          subjectVoteSchema: {
            name: 'subjectVoteSchema'
          },
          mastersPublicSchema: {
            name: 'mastersPublicSchema'
          },
          masterVoteSchema: {
            name: 'masterVoteSchema'
          },
          teachingSchema: {
            name: 'teachingSchema'
          }
        },
        requested_predicates: {}
      }
    }))).pipe(
      map(data => data.presentation_exchange_id!)
    )
  }

  private processProofResult$(pres_ex_id: string) {
    return WebhookMonitor.instance.monitorProof$(pres_ex_id).pipe(
      last(),
      map(result => {
        if (!result.presentation?.requested_proof?.self_attested_attrs) {
          throw new Error(`invalid proof result from request for schemas and credentials`)
        }
        return {
          subjectDataSchema: result.presentation.requested_proof.self_attested_attrs['subjectDataSchema'],
          subjectsListSchema: result.presentation.requested_proof.self_attested_attrs['subjectsListSchema'],
          subjectVoteSchema: result.presentation.requested_proof.self_attested_attrs['subjectVoteSchema'],
          mastersPublicSchema: result.presentation.requested_proof.self_attested_attrs['mastersPublicSchema'],
          masterVoteSchema: result.presentation.requested_proof.self_attested_attrs['masterVoteSchema'],
          teachingSchema: result.presentation.requested_proof.self_attested_attrs['teachingSchema']
        }
      }),
      map(data => {
        mastersPublicSchema.schemaID = data.mastersPublicSchema
        masterVoteSchema.schemaID = data.masterVoteSchema
        subjectsListSchema.schemaID = data.subjectsListSchema
        subjectDataSchema.schemaID = data.subjectDataSchema
        subjectVoteSchema.schemaID = data.subjectVoteSchema
        teachingSchema.schemaID = data.teachingSchema
      })
    )
  }

  private deleteConnectionAndProof$(conn_id: string, pres_ex_id: string) {
    return defer(() => from(deleteProof({pres_ex_id}))).pipe(
      switchMap(() => from(deleteConnection({conn_id})))
    )
  }
}
