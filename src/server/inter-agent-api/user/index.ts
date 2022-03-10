import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";
import {UserMasterCredentials} from "@server/teaching-credentials";

export async function handleCredential(data: V10CredentialExchange) {
  if (await handleProofForSubjectsInAuthorization(data)) return true
  return await handleProofForCredentialsInAuthorization(data)
}

export async function handleProof(data: V10PresentationExchange) {
  return false
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
