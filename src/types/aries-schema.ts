export interface CreateSchemaData {
  schema_name: string
  schema_version: string
  attributes: string[]
}

export interface CreateSchemaRes {
  sent: {
    schema_id: string
  }
}

export interface GetSchemasRes {
  schema_ids: string[]
}
