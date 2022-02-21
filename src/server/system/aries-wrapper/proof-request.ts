export interface ProofRequest {
  connection_id: string
  presentation_request: {
    indy: {
      name: string
      version: string
      requested_attributes: {
        [key: string]: {
          name: string
          restrictions?: Restrictions[]
        }
      }
      requested_predicates: {
        [key: string]: {
          name: string
          p_type: '>='
          p_value: number
          restrictions?: Restrictions[]
        }
      }
    }
  }
}

interface Restrictions {
  schema_id?: string
  schema_issuer_did?: string
  schema_name?: string
  schema_version?: string
  issuer_did?: string
  cred_def_id?: string
}
