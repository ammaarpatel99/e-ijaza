import {WebhookMonitor} from "../webhook";
import {catchError, filter, first, from, last, switchMap} from "rxjs";
import {deleteConnection, deleteProof, presentProof, requestProof} from "../aries-api";
import {State} from '../state'
import {
  mastersPublicSchema,
  masterVoteSchema,
  subjectSchema,
  subjectsSchema,
  subjectVoteSchema,
  teachingSchema,
  appStateSchema
} from "../schemas";
import {voidObs$} from "@project-utils";
import {map} from "rxjs/operators";
import {connectViaPublicDID$} from "../aries-api";


export class ShareSchemasProtocol {
  static readonly instance = new ShareSchemasProtocol()
  private constructor() { }

  initialiseController() {
    const obs$ = WebhookMonitor.instance.proofs$.pipe(
      filter(proof => proof.presentation_request?.name === 'Schema Set Up' && proof.state === 'request_received'),
      switchMap(proof => from(
        presentProof({pres_ex_id: proof.presentation_exchange_id!}, {
          requested_attributes: {},
          requested_predicates: {},
          self_attested_attributes: {
            subjectSchema: subjectSchema.schemaID,
            subjectsSchema: subjectsSchema.schemaID,
            subjectVoteSchema: subjectVoteSchema.schemaID,
            mastersPublicSchema: mastersPublicSchema.schemaID,
            mastersVoteSchema: masterVoteSchema.schemaID,
            teachingSchema: teachingSchema.schemaID,
            appStateSchema: appStateSchema.schemaID
          }
        })
      ))
    )
    obs$.pipe(
      catchError(e => {
        console.error(e)
        return obs$
      })
    ).subscribe()
  }

  getSchemasAndCredDefsFromController$() {
    return State.instance.controllerDID$.pipe(
      first(),
      switchMap(controllerDID => connectViaPublicDID$({their_public_did: controllerDID})),
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

  private proofRequest$(conn_id: string) {
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id: `${conn_id}`,
        proof_request : {
          name: "Set Up",
          version: '1.0',
          requested_attributes: {
            subjectSchema: {
              name: 'subjectSchema'
            },
            subjectsSchema: {
              name: 'subjectsSchema'
            },
            subjectVoteSchema: {
              name: 'subjectVoteSchema'
            },
            mastersPublicSchema: {
              name: 'mastersPublicSchema'
            },
            mastersVoteSchema: {
              name: 'mastersVoteSchema'
            },
            teachingSchema: {
              name: 'teachingSchema'
            },
            appStateSchema: {
              name: 'appStateSchema'
            }
          },
          requested_predicates: {}
        }
      }))),
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
          subjectSchema: result.presentation.requested_proof.self_attested_attrs['subjectSchema'],
          subjectsSchema: result.presentation.requested_proof.self_attested_attrs['subjectsSchema'],
          subjectVoteSchema: result.presentation.requested_proof.self_attested_attrs['subjectVoteSchema'],
          mastersPublicSchema: result.presentation.requested_proof.self_attested_attrs['mastersPublicSchema'],
          mastersVoteSchema: result.presentation.requested_proof.self_attested_attrs['mastersVoteSchema'],
          teachingSchema: result.presentation.requested_proof.self_attested_attrs['teachingSchema'],
          appStateSchema: result.presentation.requested_proof.self_attested_attrs['appStateSchema']
        }
      }),
      map(data => {
        mastersPublicSchema.schemaID = data.mastersPublicSchema
        masterVoteSchema.schemaID = data.mastersVoteSchema
        subjectsSchema.schemaID = data.subjectsSchema
        subjectSchema.schemaID = data.subjectSchema
        subjectVoteSchema.schemaID = data.subjectVoteSchema
        teachingSchema.schemaID = data.teachingSchema
        appStateSchema.schemaID = data.appStateSchema
      })
    )
  }

  private deleteConnectionAndProof$(conn_id: string, pres_ex_id: string) {
    return voidObs$.pipe(
      switchMap(() => from(deleteProof({pres_ex_id}))),
      switchMap(() => from(deleteConnection({conn_id})))
    )
  }
}
