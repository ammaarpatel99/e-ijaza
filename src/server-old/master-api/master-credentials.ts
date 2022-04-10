import {connectViaPublicDID, getHeldCredential, offerCredentialFromProposal, proposeCredential} from "../../server-old2/aries-wrapper";
import {Config} from "../../server-old2/config";
import {mastersPublicSchema} from "../../server-old2/schemas";
import {MastersPublicSchema} from "@project-types";
import {Masters} from "../master/master-credentials/masters";
import {repeatWithBackoff} from "../../server-old2/utils";
import {Masters as UserMasters} from '../user/masters'

class MasterCredentialsAPI {
  private static _instance: MasterCredentialsAPI|undefined
  static get instance() {
    if (!this._instance) this._instance = new MasterCredentialsAPI()
    return this._instance
  }
  private constructor() { }


}

export async function initialiseMasterCredsOnUser() {
  const connectionID = await connectViaPublicDID(Config.instance.getMasterDID())
  const res = await proposeCredential<MastersPublicSchema>({
    connection_id: connectionID,
    auto_remove: false,
    schema_id: mastersPublicSchema.getSchemaID(),
    credential_proposal: {
      attributes: [{
        name: 'credentials',
        value: ''
      }]
    }
  })
  await repeatWithBackoff({
    callback: async () => {
      try {
        const cred = await getHeldCredential<MastersPublicSchema>(res.credential_id)
        const credentials: MastersPublicSchema['credentials'] = JSON.parse(cred.attrs.credentials)
        UserMasters.instance.setMasters(credentials)
        console.log(credentials)
        return [true, null]
      } catch (e) {
        return [false, null]
      }
    }
  })
}

export async function initialiseMasterCredsForUser(cred_ex_id: string) {
  await offerCredentialFromProposal<MastersPublicSchema>({cred_ex_id}, {
    counter_proposal: {
      cred_def_id: mastersPublicSchema.getCredID(),
      credential_proposal: {
        attributes: [{
          name: 'credentials',
          value: JSON.stringify(Masters.instance.getPublicData()),
          "mime-type": 'text/plain'
        }]
      }
    }
  })
}

