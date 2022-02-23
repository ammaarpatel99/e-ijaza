import {Master} from "./master";
import {connectToSelf, deleteCredential, getHeldCredentials} from "@server/aries-wrapper";
import {
  HeldCredential,
  MastersInternalSchema
} from "@types";
import {internalSchema} from "@server/schemas";
import {issueCredential} from "@server/aries-wrapper/issue-credential";


export class Masters {
  private static _instance: Masters|undefined
  static get instance() {
    if (!this._instance) this._instance = new Masters()
    return this._instance
  }
  private constructor() { }

  private masters = new Map<string, Master>()
  private internalCredID: string|undefined

  getMaster(did: string) {
    return this.masters.get(did)
  }

  async loadCredentials() {
    const creds = (await getHeldCredentials()).results
      .filter(cred => cred.schema_id === internalSchema.getSchemaID()) as HeldCredential<MastersInternalSchema>[]
    if (creds.length === 0) {
      await this.updateInternalCredential()
      return
    }
    Object.entries(JSON.parse(creds[0].attrs.credentials) as MastersInternalSchema['credentials'])
      .forEach(cred => this.masters.set(cred[0], new Master(cred[0], cred[1])))
  }

  async updateInternalCredential() {
    if (this.internalCredID !== undefined) {
      await deleteCredential(this.internalCredID)
    }
    const data: MastersInternalSchema['credentials'] = {};
    [...this.masters.entries()].forEach(x => data[x[0]] = x[1].subjects.map(y => y[1]))
    const connection_id = await connectToSelf()
    const res = await issueCredential<MastersInternalSchema>({
      connection_id,
      cred_def_id: internalSchema.getSchemaID(),
      auto_remove: true,
      credential_proposal: {
        attributes: [{
          "mime-type": 'text/plain',
          name: 'credentials',
          value: JSON.stringify(data)
        }]
      }
    })
    this.internalCredID = res.credential_exchange_id
  }
}
