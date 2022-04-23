import {Schema} from "./schema";

export const subjectsListSchema = new Schema('SubjectsList', ['subjects'], true)
export const subjectDataSchema = new Schema('SubjectData', ['subject'], true)

export const subjectProposalSchema = new Schema(`SubjectProposal`, ['proposal'])
export const subjectVoteSchema = new Schema('SubjectVote', ['voteDetails'], true)

export const mastersInternalSchema = new Schema('MastersInternalCredentials', ['credentials'])
export const mastersPublicSchema = new Schema('MasterPublicCredentials', ['credentials'], true)

export const masterProposalSchema = new Schema('MasterProposal', ['proposal'])
export const masterVoteSchema = new Schema('MasterVote', ['voteDetails'], true)

export const teachingSchema = new Schema('TeachingCredential', ['subject'], true)
