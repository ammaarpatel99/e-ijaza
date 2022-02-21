import {AriesAgentAPIWrapper} from "../aries-agent-api-wrapper";
import {CredentialDefinitions, SchemaNames, Schemas} from "../credentials";

export class MasterCredentials {
  private static _instance: MasterCredentials|undefined
  static get instance() {
    if (this._instance === undefined) {
      this._instance = new MasterCredentials()
    }
    return this._instance
  }
  private constructor() { }

  private readonly masters = new Map<string, string[]>() // DID -> subjects

  async load() {
    const creds = await AriesAgentAPIWrapper.instance.getCredentialsByDef(CredentialDefinitions.instance.getCredDefID(SchemaNames.MASTER_CREDENTIALS))
    if (creds.length > 0) {
      const masterCreds = JSON.parse(creds[0].attrs.credentials) as [string, string[]][]
      for (const cred of masterCreds) this.masters.set(...cred)
      return
    }
    await this.issueMasterCred()
  }

  private async issueMasterCred() {
    const connectionID = await AriesAgentAPIWrapper.instance.connectToSelf()
    return AriesAgentAPIWrapper.instance.issueCredential({
      "connection_id": connectionID,
      "cred_def_id": CredentialDefinitions.instance.getCredDefID(SchemaNames.MASTER_CREDENTIALS),
      "credential_proposal": {
        "attributes": [
          {
            "mime-type": "text/plain",
            "value": JSON.stringify(Array.from(this.masters.entries())),
            "name": "credentials"
          }
        ]
      },
      "schema_id": Schemas.instance.getSchemaID(SchemaNames.MASTER_CREDENTIALS)
    })
  }

  async addByDID(did: string) {
    this.masters.set(did, ['everything'])
    await this.issueMasterCred()
    await this.issueToDID(did)
  }

  async issueToDID(did: string) {
    const connectionID = await AriesAgentAPIWrapper.instance.connectViaPublicDID(did)
    await AriesAgentAPIWrapper.instance.issueCredential({
      "connection_id": connectionID,
      "cred_def_id": CredentialDefinitions.instance.getCredDefID(SchemaNames.TEACHING_CREDENTIAL),
      "credential_proposal": {
        "attributes": [
          {
            "mime-type": "text/plain",
            "name": 'subject',
            "value": "everything"
          }
        ]
      },
      "schema_id": Schemas.instance.getSchemaID(SchemaNames.TEACHING_CREDENTIAL)
    })
  }
}
