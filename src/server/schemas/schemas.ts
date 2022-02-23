import {Schema} from "@server/schemas/schema";

export const internalSchema = new Schema('InternalMasterCredentials', ['credentials'], true)
export const publicSchema = new Schema('MasterCredentials', ['credentials'], true)
export const proposalSchema = new Schema('MasterCredentialProposal', ['did', 'subject', 'action', 'votes'], true)
export const voteSchema = new Schema('MasterCredentialVote', ['did', 'subject', 'action', 'voterDID'], true)
export const teachingSchema = new Schema('TeachingCredential', ['subject'], true)
