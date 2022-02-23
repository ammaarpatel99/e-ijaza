import {Master} from "./master";
import {deleteCredential, getHeldCredentials} from "@server/aries-wrapper";
import {
  HeldCredential,
  MastersInternalSchema
} from "@types";
import {internalSchema} from "@server/schemas";


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
    const creds = (await getHeldCredentials())
      .filter(cred => cred.schema_id === internalSchema.getSchemaID()) as HeldCredential<MastersInternalSchema>[]
    if (creds.length === 0) {
      await this.updateInternalCredential()
    }
    creds[0].attrs.credentials.forEach(cred => this.masters.set(cred[0], new Master(cred[0], cred[1])))
  }

  async updateInternalCredential() {
    if (this.internalCredID !== undefined) {
      await deleteCredential(this.internalCredID)
    }
    // TODO: issue credential
  }
}
