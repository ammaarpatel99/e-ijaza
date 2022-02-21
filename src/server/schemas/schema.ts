import {
  getSchemaID,
  createSchema,
  getCredDefID, createCredDef
} from '../aries-wrapper'

export class Schema {
  private createSchemaFlag = true
  private schemaID: string|undefined
  private attributes: string[]
  private credID: string|undefined

  constructor(name: string, schemaAttributes: string[], createCredFlag?: boolean)
  constructor(name: string, schemaID: string, createCredFlag?: boolean)
  constructor(readonly name: string, data: string[]|string, private createCredFlag: boolean = true) {
    if (typeof data === 'string') {
      this.schemaID = data
      this.attributes = []
    } else {
      this.attributes = data
    }
  }

  async fetchOrSetSchemaID() {
    try {
      this.setSchemaID(await getSchemaID(this.name))
    } catch (e) {
     this.setSchemaID(await createSchema(this.name, this.attributes))
    }
  }

  async fetchOrSetCredID() {
    try {
      this.setCredID(await getCredDefID(this.getSchemaID()))
    } catch (e) {
      this.setCredID(await createCredDef(this.getSchemaID(), this.name))
    }
  }

  getCreateSchemaFlag() {
    return this.createSchemaFlag
  }

  getCreateCredFlag() {
    return this.createCredFlag
  }

  getSchemaAttributes() {
    if (this.createSchemaFlag) {
      return this.attributes
    }
    return null
  }

  getSchemaID() {
    if (this.createSchemaFlag) {
      throw new Error(`Schema not created`)
    } else if (this.schemaID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this.schemaID
  }

  setSchemaID(schemaID: string) {
    if (!this.createSchemaFlag) {
      throw new Error(`schema ID already set`)
    }
    this.createSchemaFlag = false
    this.schemaID = schemaID
  }

  getCredID() {
    if (this.createCredFlag) {
      throw new Error(`Schema not created`)
    } else if (this.credID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this.credID
  }

  private setCredID(credID: string) {
    if (!this.createCredFlag) {
      throw new Error(`schema ID already set`)
    }
    this.createSchemaFlag = false
    this.credID = credID
  }
}
