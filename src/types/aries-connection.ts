export interface ConnectionRecord {
  connection_id: string
  rfc23_state: string|'response-received'|'completed'
}

export interface GetConnectionsRes {
  results: ConnectionRecord[]
}

export interface CreateInvitationRes {
  connection_id: string
  invitation: object
}

export interface DIDConnectionRes {
  connection_id: string
}
