import {CredentialInfo} from "./credential-info";
import {ProposalType, SubjectProposalType} from '../schemas'
export {ProposalType, SubjectProposalType}

export type ControllerMasters = Map<string, Map<string, CredentialInfo>>

export type Masters = Map<string, Set<string>>

export type Subjects = Map<string, {
  children: Set<string>
  componentSets: Set<Set<string>>
}>

export type MasterProposal = {
  did: string
  subject: string
  proposalType: ProposalType
}

export interface  ControllerMasterProposal extends MasterProposal {
  votes: Map<string, CredentialInfo | boolean>
}

export type ControllerMasterProposals = Map<string, ControllerMasterProposal>

export interface UserMasterVote extends MasterProposal  {
  voterDID: string;
  credentialID: string;
  cred_def_id: string;
}

export type UserMasterVotes = Map<string, UserMasterVote>

export interface ControllerMasterVote extends MasterProposal {
  vote: boolean
  voterDID: string
}


export type OntologyProposal = {
  subject: string
  proposalType: ProposalType
  change: {
    type: SubjectProposalType.CHILD
    child: string
  } | {
    type: SubjectProposalType.COMPONENT_SET
    component_set: Set<string>
  }
}

export interface  ControllerOntologyProposal extends OntologyProposal {
  votes: Map<string, CredentialInfo | boolean>
}

export type ControllerOntologyProposals = Map<string, ControllerOntologyProposal>

export interface UserOntologyVote extends OntologyProposal  {
  voterDID: string;
  credentialID: string;
  cred_def_id: string;
}

export type UserOntologyVotes = Map<string, UserOntologyVote>

export interface ControllerOntologyVote extends OntologyProposal {
  vote: boolean
  voterDID: string
}
