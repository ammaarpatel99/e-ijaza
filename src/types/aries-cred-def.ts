export interface CreateCredDefData {
  schema_id: string
  tag: string
}

export interface CreateCredDefRes {
  sent: {
    credential_definition_id: string
  }
}

export interface GetCredDefsRes {
  credential_definition_ids: string[]
}
