import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";
import {
  mastersPublicSchema,
  respondToUserRequestForSchemas,
  subjectSchema,
  subjectsSchema
} from '@server/schemas'
import {MasterSubjectOntology} from "@server/subject-ontology/master-subject-ontology";
import {issueCredentialInExchange} from "@server/aries-wrapper";
import {MasterCredentials, MasterCredentialsProposals} from "@server/teaching-credentials";
import {MasterSubjectProposals} from "@server/subject-ontology";

export async function handleCredential(data: V10CredentialExchange) {
  if (await issueCredForSubjects(data)) return true
  if (await issueCredForSubjectData(data)) return true
  if (await issueCredForMasterCreds(data)) return true
  return await issueOfferedCred(data);
}

export async function handleProof(data: V10PresentationExchange) {
  if (await respondToCreateSubjectProposal(data)) return true
  if (await respondToVoteOnSubjectProposal(data)) return true
  if (await respondToCreateCredentialProposal(data)) return true
  if (await respondToVoteOnCredentialProposal(data)) return true
  return await respondToSetupProofRequest(data);

}

async function respondToSetupProofRequest(data: V10PresentationExchange) {
  if (data.presentation_request?.name === 'Set Up' && data.state === 'request_received') {
    await respondToUserRequestForSchemas(data.presentation_exchange_id!)
    return true
  }
  return false
}

async function respondToCreateSubjectProposal(data: V10PresentationExchange) {
  if (data.presentation_proposal_dict?.comment === 'Create Subject Proposal' && data.state === 'proposal_received') {
    await MasterSubjectProposals.instance.createProposal(data)
    return true
  }
  return false
}

async function respondToVoteOnSubjectProposal(data: V10PresentationExchange) {
  if (data.presentation_proposal_dict?.comment === 'Vote on Subject Proposal' && data.state === 'proposal_received') {
    await MasterSubjectProposals.instance.receiveVote(data)
    return true
  }
  return false
}

async function respondToCreateCredentialProposal(data: V10PresentationExchange) {
  if (data.presentation_proposal_dict?.comment === 'Create Credential Proposal' && data.state === 'proposal_received') {
    await MasterCredentialsProposals.instance.createProposal(data)
    return true
  }
  return false
}

async function respondToVoteOnCredentialProposal(data: V10PresentationExchange) {
  if (data.presentation_proposal_dict?.comment === 'Vote on Credentia Proposal' && data.state === 'proposal_received') {
    await MasterCredentialsProposals.instance.receiveVote(data)
    return true
  }
  return false
}

async function issueCredForSubjects(data: V10CredentialExchange) {
  if (data.credential_proposal_dict?.schema_id === subjectsSchema.schemaID && data.state === 'proposal_received') {
    await MasterSubjectOntology.instance.issueSubjectCredential(data.credential_exchange_id!)
    return true
  }
  return false
}

async function issueCredForSubjectData(data: V10CredentialExchange) {
  if (data.credential_proposal_dict?.schema_id === subjectSchema.schemaID && data.state === 'proposal_received') {
    await MasterSubjectOntology.instance.issueSubjectDataCredential(data)
    return true
  }
  return false
}

async function issueCredForMasterCreds(data: V10CredentialExchange) {
  if (data.credential_proposal_dict?.schema_id === mastersPublicSchema.schemaID && data.state === 'proposal_received') {
    await MasterCredentials.instance.issueDataCredential(data.credential_exchange_id!)
    return true
  }
  return false
}

async function issueOfferedCred(data: V10CredentialExchange) {
  if (data.state === 'request_received' && !!data.credential_offer && data.auto_issue === false) {
    await issueCredentialInExchange({cred_ex_id: data.credential_exchange_id!}, {})
    return true
  }
  return false
}
