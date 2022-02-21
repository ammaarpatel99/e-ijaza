import {SchemaNames} from "./schema-types";

export abstract class Schemas {
  private readonly schemaIDs = new Map<SchemaNames, string>()

  abstract updateSchemasIDs(): Promise<void>;

  getSchemaID(name: SchemaNames) {
    const id = this.schemaIDs.get(name)
    if (!id) throw new Error(`Schema with name ${name} can't be found`)
    return id
  }

  protected setSchemaIDs(ids: Map<SchemaNames, string>) {
    ids.forEach((value, key) => {
      this.schemaIDs.set(key, value)
    })
  }
}
