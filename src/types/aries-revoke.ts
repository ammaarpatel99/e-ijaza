export interface RevocationStateRes {
  state: 'issued'|'revoked'
}

export interface RevokeRequestData {
  comment?: string
  connection_id?: string
  cred_ex_id?: string
  cred_rev_id?: string
  notify?: boolean
  publish?: boolean
  rev_reg_id?: string
  thread_id?: string
}

export interface RevokeRequestRes {}
