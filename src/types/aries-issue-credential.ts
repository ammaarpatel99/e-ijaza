interface Attribute<T> {
  "mime-type"?: string
  name: keyof T
  value: string
}

export interface IssueCredData<Schema> {
  auto_remove?: boolean
  comment?: string
  connection_id: string
  cred_def_id?: string
  issuer_did?: string
  schema_id?: string
  schema_issuer_did?: string
  schema_name?: string
  schema_version?: string
  trace?: boolean
  credential_proposal: {
    attributes: Attribute<Schema>[]
  }
}

export interface IssuedCredential<Schema> {
  revoc_reg_id: string
  revocation_id: string
  credential_exchange_id: string
  credential_offer_dict: {
    comment: string
    credential_preview: {
      attributes: Attribute<Schema>[]
    }
  }
  role: 'issuer'|'holder'
  state: 'proposal_sent'|'proposal_received'|'offer_sent'|'offer_received'|'request_sent'|
    'request_received'|'credential_sent'|'credential_received'|'credential_acked'|'credential_revoked'
}

export interface IssuedCredentials<Schema> {
  results: IssuedCredential<Schema>[]
}
