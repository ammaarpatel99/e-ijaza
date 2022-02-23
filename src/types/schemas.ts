type DID = string
type Subject = string
type CredRef = string


export enum ProposalAction {
  Add = 'add',
  REMOVE = 'remove'
}

export interface MastersInternalSchema {
  credentials: [DID, [Subject, CredRef][]][]
}

export interface PublicSchema {
  credentials: [DID, Subject[]][]
}

export interface ProposalSchema {
  did: DID
  subject: Subject
  action: ProposalAction
  votes: [DID, boolean | CredRef][]
}

export interface VoteSchema {
  did: DID
  subject: Subject
  action: ProposalAction
  voterDID: DID
}

export interface TeachingSchema {
  subject: string
}
