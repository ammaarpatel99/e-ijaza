import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";
import {UserMasterCredentials} from "../../teaching-credentials";
import {mastersPublicSchema, subjectSchema, subjectsSchema, subjectVoteSchema, teachingSchema} from "../../schemas";
import {getIssuedCredentials} from "../../aries-wrapper";
import {UserSubjectOntology} from "../../subject-ontology";
import {SubjectSchema} from "@project-types";
import {UserSubjectProposals} from "../../subject-ontology/user-subject-proposals";

export async function handleCredential(data: V10CredentialExchange) {
  return await receiveCredential(data)
}

export async function handleProof(data: V10PresentationExchange) {
  if (await handleProofForSubjectsInAuthorization(data)) return true
  return await handleProofForCredentialsInAuthorization(data)
}

export async function handleRevocationNotification(thread_id: string) {
  if (thread_id.includes(mastersPublicSchema.name)) {
    await UserMasterCredentials.instance.getDataCredentials()
  } else if (thread_id.includes(subjectsSchema.name)) {
    await UserSubjectOntology.instance.getSubjects()
  } else if (thread_id.includes(subjectSchema.name)) {
    await UserSubjectOntology.instance.getAllSubjectsData()
  } else if (thread_id.includes(teachingSchema.name)) {
    await UserMasterCredentials.instance.loadCredentials()
  } else if (thread_id.includes(subjectVoteSchema.name)) {
    await UserSubjectProposals.instance.loadProposalVotes()
  } else {
    return false
  }
  return true
}

async function handleProofForSubjectsInAuthorization(data: V10PresentationExchange) {
  if (data.presentation_request?.name === 'Authorization - Subjects to Prove Subject') {
    await UserMasterCredentials.instance.replyToProofForSubjects(data)
    return true
  }
  return false
}

async function handleProofForCredentialsInAuthorization(data: V10PresentationExchange) {
  if (data.presentation_request?.name === 'Authorization - Credentials to Prove Subjects') {
    await UserMasterCredentials.instance.replyToProofForCredentials(data)
    return true
  }
  return false
}

async function receiveCredential(data: V10CredentialExchange) {
  if (data.state !== 'credential_acked') return false
  if (data.schema_id === teachingSchema.schemaID) {
    UserMasterCredentials.instance.receiveCredential(data)
  } else if (data.schema_id === subjectVoteSchema.schemaID) {
    UserSubjectProposals.instance.receiveVote(data)
  } else {
    return false
  }
  return true
}
