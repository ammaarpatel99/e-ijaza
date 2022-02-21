import {
  SchemaNames
} from '../schemas/schema-types'
import {AppType, Config} from '../'

export class CredentialDefinitions {
  private static _instance: CredentialDefinitions|undefined
  static get instance() {
    if (this._instance === undefined) {
      this._instance = new CredentialDefinitions()
    }
    return this._instance
  }
  private constructor() { }

  private readonly masterCredDefIDs = new Map<SchemaNames, string>()
  private readonly credDefIDs = new Map<SchemaNames, string>()

  get credDefs() {
    return Array.from(this.credDefIDs.entries())
  }

  getCredDefID(name: SchemaNames) {
    const id = this.credDefIDs.get(name)
    if (!id) {
      throw new Error(`No cred def for schema ${name}`)
    }
    return id
  }

  initialise(credDefIDs: [SchemaNames, string][], masterCredDefIDs?: [SchemaNames, string][]) {
    const isUser = Config.instance.appType === AppType.USER
    if (isUser) {
      if (!masterCredDefIDs) throw new Error(`lacking necessary credential definitions`)
      for (const credDef of masterCredDefIDs) {
        this.masterCredDefIDs.set(...credDef)
      }
    }
    for (const credDef of credDefIDs) {
      this.credDefIDs.set(...credDef)
    }
  }
}
