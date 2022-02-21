
import {
  SchemaNames
} from '../schemas/schema-types'

export class Schemas {
  private static _instance: Schemas|undefined
  static get instance() {
    if (this._instance === undefined) {
      this._instance = new Schemas()
    }
    return this._instance
  }
  private constructor() { }

  private readonly schemaIDs = new Map<SchemaNames, string>()

  get schemas() {
    return Array.from(this.schemaIDs.entries())
  }

  getSchemaID(name: SchemaNames) {
    const id = this.schemaIDs.get(name)
    if (!id) throw new Error(`Schema with name ${name} can't be found`)
    return id
  }

  initialise(schemas: [SchemaNames, string][]) {
    for (const schema of schemas) {
      this.schemaIDs.set(...schema)
    }
  }
}
