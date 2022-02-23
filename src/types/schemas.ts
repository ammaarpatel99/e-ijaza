type DID = string
type Subject = string
type CredRef = string


export enum ProposalAction {
  Add = 'add',
  REMOVE = 'remove'
}

export type SchemaToJSON<Schema> = {
  [key in keyof Schema]: string
}

export interface MastersInternalSchema {
  credentials: {
    [key: DID]: {
      subject: string,
      cred_ex_id: string,
      connection_id: string
    }[]
  }
}

export interface PublicSchema {
  credentials: {
    [key: DID]: {
      subject: string
    }[]
  }
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
