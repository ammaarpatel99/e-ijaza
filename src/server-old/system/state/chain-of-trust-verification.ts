import {Config} from "../config";
import {AriesAgentAPIWrapper} from "../aries-agent-api-wrapper";
import {SchemaNames, Schemas} from "../credentials";
import {repeatWithBackoff} from "../utils";

export class ChainOfTrustVerification {
  static didFromCredDef(credDef: string) {
    return credDef.split(':')[0]
  }

  private readonly dids: string[]
  constructor(did: string) {
    this.dids = [did]
  }

  async prove() {
    while (true) {
      const did = this.dids[this.dids.length - 1]
      if (Config.instance.masterDID === did) return this.dids
      const connID = await AriesAgentAPIWrapper.instance.connectViaPublicDID(did)
      const proofID = await AriesAgentAPIWrapper.instance.requestProof(connID, {
        connection_id: connID,
        presentation_request: {
          indy: {
            name: 'Prove Subject',
            version: '1.0',
            requested_predicates: {},
            requested_attributes: {
              subject: {
                name: 'subject',
                restrictions: [{
                  schema_id: Schemas.instance.getSchemaID(SchemaNames.TEACHING_CREDENTIAL)
                }]
              }
            }
          }
        }
      })
      const proof = await repeatWithBackoff({
        callback: async () => {
          const proof = await AriesAgentAPIWrapper.instance.getProof(proofID)
          return [proof.state === "presentation-received", proof]
        }
      })
      // TODO: verify proof
      this.dids.push(ChainOfTrustVerification.didFromCredDef(proof.by_format.pres.indy.identifiers[0].cred_def_id))
    }
  }

}
