import {Schema} from "./schema";

export const subjectsSchema = new Schema('Subjects', ['subjects'])
export const subjectSchema = new Schema('SingleSubject', ['subject'])

export const subjectProposalSchema = new Schema(`SubjectProposal`, ['proposal'])
export const subjectVoteSchema = new Schema('SubjectVote', ['voteDetails'])

export const mastersInternalSchema = new Schema('MastersInternalCredentials', ['credentials'])
export const mastersPublicSchema = new Schema('MasterPublicCredentials', ['credentials'])

export const masterProposalSchema = new Schema('MasterProposal', ['proposal'])
export const masterVoteSchema = new Schema('MasterVote', ['voteDetails'])

export const teachingSchema = new Schema('TeachingCredential', ['subject'])
