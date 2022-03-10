import {Master} from "./master";
import {
  connectToSelf,
  deleteCredential,
  getHeldCredentials,
  getIssuedCredentials,
  deleteConnection
} from "@server/aries-wrapper";
import {
  HeldCredential, IssuedCredentials,
  MastersInternalSchema, MastersPublicSchema
} from "@types";
import {mastersInternalSchema, mastersPublicSchema} from "@server/schemas";
import {issueCredential} from "@server/aries-wrapper/issue-credentials/issue-credential";
import {revokeCredential} from "@server/aries-wrapper/issue-credentials/revoke-credential";


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
      .filter(cred => cred.schema_id === mastersInternalSchema.getSchemaID()) as HeldCredential<MastersInternalSchema>[]
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
    try {
      const res = await issueCredential<MastersInternalSchema>({
        connection_id,
        cred_def_id: mastersInternalSchema.getCredID(),
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
      await this.clearPublicData()
    } finally {
      await deleteConnection(connection_id)
    }
  }

  private async clearPublicData() {
    const creds = (await getIssuedCredentials()).results
      .filter(x => x.credential_definition_id === mastersPublicSchema.getCredID()) as IssuedCredentials<MastersPublicSchema>['results']
    await Promise.all(creds.map(x => revokeCredential({
      connection_id: x.connection_id,
      publish: false,
      cred_ex_id: x.credential_exchange_id
    })))
  }

  getPublicData(): MastersPublicSchema['credentials'] {
    const data: MastersPublicSchema['credentials'] = {};
    [...this.masters.entries()].forEach(x => data[x[0]] = x[1].subjects.map(y => ({subject: y[1].subject})))
    return data
  }
}
