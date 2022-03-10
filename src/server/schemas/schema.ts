import {
  getSchemaIDs,
  createSchema,
  getCredDefIDs,
  createCredentialDefinition
} from '@server/aries-wrapper'

export class Schema {
  private _schemaID: string|undefined
  private _credID: string|undefined

  get schemaID() {
    if (this._schemaID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this._schemaID
  }

  set schemaID(id: string) {
    if (this._schemaID !== undefined) {
      throw new Error(`Schema ID already defined`)
    }
    this._schemaID = id
  }

  get credID() {
    if (this._credID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this._credID
  }

  set credID(id: string) {
    if (this._credID !== undefined) {
      throw new Error(`Cred def ID already defined`)
    }
    this._credID = id
  }

  constructor(readonly name: string, readonly attributes: string[]) { }

  async fetchOrSetSchemaID() {
    const schemaID = (await getSchemaIDs({schema_name: this.name})).schema_ids?.shift()
    if (schemaID) {
      this.schemaID = schemaID
    } else {
      this.schemaID = await createSchema({},
        {schema_name: this.name, attributes: this.attributes, schema_version: '1.0'}
      )
    }
  }

  async fetchOrSetCredID() {
    if (!this.schemaID) throw new Error(`Can't get cred def ID with non-existent schemaID`)
    const credID = (await getCredDefIDs({schema_id: this.schemaID})).credential_definition_ids?.shift()
    if (credID) {
      this.credID = credID
    } else {
      this.credID = await createCredentialDefinition({}, {schema_id: this.schemaID, tag: this.name, support_revocation: true})
    }
  }
}
