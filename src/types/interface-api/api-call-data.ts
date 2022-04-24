import {ProposalType, SubjectProposalType} from '../schemas'
export {ProposalType, SubjectProposalType}
export {InitialisationState} from '../server'


export interface DIDDetails {
  did: string
  verkey: string
}



export interface Master {
  did: string
  subjects: string[]
}


export interface MasterProposalData {
  did: string
  subject: string
  proposalType: ProposalType
}


export interface MasterProposal extends MasterProposalData {
  votes?: {
    for: number
    against: number
    total: number
  }
}


export interface MasterProposalVote extends MasterProposalData {
  vote: boolean
}



export interface Subject {
  name: string
  children: string[]
  componentSets: string[][]
}




export interface SubjectProposalData {
  subject: string
  proposalType: ProposalType
  change: {
    type: SubjectProposalType.CHILD
    child: string
  } | {
    type: SubjectProposalType.COMPONENT_SET
    componentSet: string[]
  }
}


export interface SubjectProposal extends SubjectProposalData {
  votes?: {
    for: number
    against: number
    total: number
  }
}


export interface SubjectProposalVote extends SubjectProposalData {
  vote: boolean
}



export interface HeldCredentialData {
  did: string
  subject: string
}

export interface HeldCredential extends HeldCredentialData {
  public: boolean
}



export interface IssuedCredential {
  did: string
  subject: string
}



export interface OutgoingProofRequest {
  did: string
  subject: string
  result: boolean | null
  proof: OutgoingProofRequest[] | null | boolean // list of required credentials to prove | result (true if master credential)
}



export interface NewProofRequest {
  did: string
  subject: string
}



export interface IncomingProofRequest {
  did: string
  subject: string
  proof: HeldCredentialData[] | false
}



export interface ResponseToIncomingProofRequest extends IncomingProofRequest{
  reveal: boolean
}



export interface ReachableSubject {
  name: string
  reachableByMasterCredentials: boolean
}
