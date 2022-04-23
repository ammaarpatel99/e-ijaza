export enum AppType {
  USER = 'USER',
  CONTROLLER = 'CONTROLLER'
}

export enum ProposalType {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export enum SubjectProposalType {
  CHILD = 'CHILD',
  COMPONENT_SET = 'COMPONENT_SET'
}




export interface SubjectsSchema {
  subjects: string[]
}

export interface SubjectSchema {
  subject: {
    name: string
    children: string[]
    componentSets: string[][]
  }
}




export interface SubjectProposal {
  subject: string
  action: ProposalType
  change: {
    type: SubjectProposalType.CHILD
    child: string
  } | {
    type: SubjectProposalType.COMPONENT_SET
    component_set: string[]
  }
}

export interface SubjectProposalStateSchema {
  proposal: {
    votes: {
      [DID: string]: {
        cred_rev_id: string
        rev_reg_id: string
        connection_id: string
      } | boolean
    }
  } & SubjectProposal
}

export interface SubjectProposalVoteSchema {
  voteDetails: {
    voterDID: string
  } & SubjectProposal
}




export interface MastersInternalSchema {
  credentials: {
    [DID: string]: {
      subject: string,
      cred_rev_id: string
      rev_reg_id: string
      connection_id: string
    }[]
  }
}

export interface MastersPublicSchema {
  credentials: {
    [DID: string]: string[]
  }
}



export interface MasterProposal {
  did: string,
  subject: string
  action: ProposalType
}

export interface MasterProposalStateSchema {
  proposal: {
    votes: {
      [DID: string]: {
        cred_rev_id: string
        rev_reg_id: string
        connection_id: string
      } | boolean
    }
  } & MasterProposal
}

export interface MasterProposalVoteSchema {
  voteDetails: {
    voterDID: string
  } & MasterProposal
}




export interface TeachingSchema {
  subject: string
}
