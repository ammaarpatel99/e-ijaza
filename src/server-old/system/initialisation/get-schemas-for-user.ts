import {
  AriesAgentAPIWrapper, Config, ProofRequest, repeatWithBackoff
} from '../'
import {CredentialDefinitions, SchemaNames, Schemas} from "../credentials";

function initialDataProofRequest(connectionID: string): ProofRequest {
  return {
    connection_id: connectionID,
    presentation_request: {
      indy: {
        name: "Initialisation Data",
        version: "1.0",
        requested_attributes: {
          schemas: {
            name: "schema"
          },
          credential_definitions: {
            name: "credential_definitions"
          }
        },
        requested_predicates: {}
      }
    }
  }
}

export async function getSchemasForUser() {
  const aries = AriesAgentAPIWrapper.instance
  const config = Config.instance
  const connectionID = await aries.connectViaPublicDID(config.masterDID)
  try {
    const reqBody = initialDataProofRequest(connectionID)
    const proofID = await aries.requestProof(connectionID, reqBody)
    try {
      const proof = await repeatWithBackoff({
        callback: async () => {
          const proof = await aries.getProof(proofID)
          return [proof.state === 'presentation-received', proof]
        }
      })
      const schemas = JSON.parse(proof.by_format.pres.indy.requested_proof.self_attested_attrs['schemas']) as [SchemaNames, string][]
      const credDefs = JSON.parse(proof.by_format.pres.indy.requested_proof.self_attested_attrs['credential_definitions']) as [SchemaNames, string][]
      return [schemas, credDefs] as [[SchemaNames, string][], [SchemaNames, string][]]
    } finally {
      await aries.deleteProof(proofID)
    }
  } finally {
    await aries.deleteConnection(connectionID)
  }
}

export async function respondToSchemasForUserRequest(proofID: string) {
  await AriesAgentAPIWrapper.instance.sendProof(proofID, {
    indy: {
      requested_attributes: {},
      requested_predicates: {},
      self_attested_attributes: {
        schemas: JSON.stringify(Schemas.instance.schemas),
        credential_definitions: JSON.stringify(CredentialDefinitions.instance.credDefs)
      }
    }
  })
}
