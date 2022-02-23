import {
  connectViaPublicDID, deleteConnection, deleteProof, getProof,
  requestProof, sendProof
} from '../aries-wrapper'
import {Config} from "@server/config";
import {repeatWithBackoff} from "@server/utils";
import {teachingSchema, publicSchema} from '@server/schemas'

export async function initialiseUserSchemas() {
  const connectionID = await connectViaPublicDID(Config.instance.getMasterDID())
  try {
    const {presentation_exchange_id} = await requestProof({
      connection_id: `${connectionID}`,
      proof_request : {
        name: "Set Up",
        version: '1.0',
        requested_attributes: {
          teachingSchema: {
            name: "teachingSchema"
          }
        },
        requested_predicates: {}
      }
    })
    try {
      const proof = await repeatWithBackoff({
        initialTimeout: 1000,
        callback: async () => {
          const proof = await getProof(presentation_exchange_id)
          return [['presentation_received', 'presentation_acked', 'verified'].includes(proof.state), proof]
        }
      })
      teachingSchema.setSchemaID(proof.presentation.requested_proof.self_attested_attrs['teachingSchema'])
    } finally {
      await deleteProof(presentation_exchange_id)
    }
  } finally {
    await deleteConnection(connectionID)
  }
}

export async function respondToUserRequestForSchemas(pres_ex_id: string) {
  await sendProof(pres_ex_id, {
    requested_attributes: {},
    requested_predicates: {},
    self_attested_attributes: {
      teachingSchema: teachingSchema.getSchemaID()
    }
  })
}



