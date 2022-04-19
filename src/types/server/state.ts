import {CredentialInfo} from "./credential-info";
import {ProposalType} from '../schemas'
export {ProposalType}

export type ControllerMasters = Map<string, Map<string, CredentialInfo>>

export type Masters = Map<string, Set<string>>

export type Subjects = Map<string, {
  children: Set<string>
  componentSets: Set<Set<string>>
}>

export interface  ControllerMasterProposal {
  did: string
  subject: string
  proposalType: ProposalType
  votes: Map<string, CredentialInfo | boolean>
}

export type ControllerMasterProposals = Map<string, ControllerMasterProposal>

export interface UserMasterVote {
  did: string;
  subject: string;
  proposalType: ProposalType;
  voterDID: string;
  credentialID: string;
}

export type UserMasterProposals = Map<string, UserMasterVote>

export type MasterProposal = ControllerMasterProposal | UserMasterVote
