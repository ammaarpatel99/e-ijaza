import {
  connectViaPublicDID,
  deleteConnection,
  requestProof,
  presentProof
} from '../aries-wrapper'
import {Config} from "@server/config";
import {
  mastersPublicSchema,
  masterVoteSchema,
  subjectSchema,
  subjectsSchema,
  subjectVoteSchema,
  teachingSchema
} from '@server/schemas'
import {WebhookMonitor} from "@server/webhook/webhook-monitor";
import {UserMasterCredentials} from "@server/teaching-credentials";

export async function initialiseUserSchemas() {
  const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})
  try {
    const {presentation_exchange_id} = await requestProof({
      connection_id: `${connectionID}`,
      proof_request : {
        name: "Set Up",
        version: '1.0',
        requested_attributes: {
          subjectSchema: {
            name: 'subjectSchema'
          },
          subjectCredDefID: {
            name: 'subjectCredDefID'
          },
          subjectsSchema: {
            name: 'subjectsSchema'
          },
          subjectsCredDefID: {
            name: 'subjectsCredDefID'
          },
          subjectVoteSchema: {
            name: 'subjectVoteSchema'
          },
          subjectVoteCredDefID: {
            name: 'subjectVoteCredDefID'
          },
          mastersPublicSchema: {
            name: 'mastersPublicSchema'
          },
          mastersPublicCredDefID: {
            name: 'mastersPublicCredDefID'
          },
          mastersVoteSchema: {
            name: 'mastersVoteSchema'
          },
          mastersVoteCredDefID: {
            name: 'mastersVoteCredDefID'
          },
          teachingSchema: {
            name: 'teachingSchema'
          },
          teachingCredDefID: {
            name: 'teachingCredDefID'
          }
        },
        requested_predicates: {}
      }
    })
    await WebhookMonitor.instance.monitorProofPresentation(presentation_exchange_id!, (result, resolve, reject) => {
      if (result.state === 'verified') {
        if (!result.presentation?.requested_proof?.self_attested_attrs) {
          reject(result)
          return
        }
        subjectSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['subjectSchema']
        subjectSchema.credID = result.presentation.requested_proof.self_attested_attrs['subjectCredDefID']
        subjectsSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['subjectsSchema']
        subjectsSchema.credID = result.presentation.requested_proof.self_attested_attrs['subjectsCredDefID']
        subjectVoteSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['subjectVoteSchema']
        subjectVoteSchema.credID = result.presentation.requested_proof.self_attested_attrs['subjectVoteCredDefID']
        mastersPublicSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['mastersPublicSchema']
        mastersPublicSchema.credID = result.presentation.requested_proof.self_attested_attrs['mastersPublicCredDefID']
        masterVoteSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['mastersVoteSchema']
        masterVoteSchema.credID = result.presentation.requested_proof.self_attested_attrs['mastersVoteCredDefID']
        teachingSchema.schemaID = result.presentation.requested_proof.self_attested_attrs['teachingSchema']
        UserMasterCredentials.instance.masterTeachingCredID = result.presentation.requested_proof.self_attested_attrs['teachingCredDefID']
        resolve(teachingSchema.fetchOrSetCredID())
      }
    })

  } finally {
    await deleteConnection({conn_id: connectionID})
  }
}

export async function respondToUserRequestForSchemas(pres_ex_id: string) {
  await presentProof({pres_ex_id}, {
    requested_attributes: {},
    requested_predicates: {},
    self_attested_attributes: {
      subjectSchema: subjectSchema.schemaID,
      subjectCredDefID: subjectSchema.credID,
      subjectsSchema: subjectsSchema.schemaID,
      subjectsCredDefID: subjectsSchema.credID,
      subjectVoteSchema: subjectVoteSchema.schemaID,
      subjectVoteCredDefID: subjectVoteSchema.credID,
      mastersPublicSchema: mastersPublicSchema.schemaID,
      mastersPublicCredDefID: mastersPublicSchema.credID,
      mastersVoteSchema: masterVoteSchema.schemaID,
      mastersVoteCredDefID: masterVoteSchema.credID,
      teachingSchema: teachingSchema.schemaID,
      teachingCredDefID: teachingSchema.credID
    }
  })
}



