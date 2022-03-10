export enum ProposalAction {
  ADD = 'add',
  REMOVE = 'remove'
}

export enum SubjectProposalType {
  CHILD = 'child',
  COMPONENT_SET = 'component_set'
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

export interface SubjectProposalSchema {
  proposal: {
    subject: string
    action: ProposalAction
    votes: {
      [DID: string]: {
        cred_rev_id: string
        rev_reg_id: string
        connection_id: string
      } | boolean
    }
    change: {
      type: SubjectProposalType.CHILD
      child: string
    } | {
      type: SubjectProposalType.COMPONENT_SET
      component_set: string[]
    }
  }
}

export interface SubjectVoteSchema {
  voteDetails: {
    subject: string
    action: ProposalAction
    voterDID: string
    change: {
      type: SubjectProposalType.CHILD
      child: string
    } | {
      type: SubjectProposalType.COMPONENT_SET
      component_set: string[]
    }
  }
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

export interface MastersProposalSchema {
  proposal: {
    did: string,
    subject: string
    action: ProposalAction
    votes: {
      [DID: string]: {
        cred_rev_id: string
        rev_reg_id: string
        connection_id: string
      } | boolean
    }
  }
}

export interface MastersVoteSchema {
  voteDetails: {
    did: string
    subject: string
    action: ProposalAction
    voterDID: string
  }
}

export interface TeachingSchema {
  subject: string
}


