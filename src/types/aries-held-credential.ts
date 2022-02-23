export interface HeldCredentialsRes<Schema> {
  results: HeldCredential<Schema>[]
}

export interface HeldCredential<Schema> {
  attrs: {[key in keyof Schema]: string},
  cred_def_id: string
  cred_rev_id: string
  referent: string
  rev_reg_id: string
  schema_id: string
}

export interface HeldCredRevokedRes {
  revoked: boolean
}
