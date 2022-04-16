import axios from "axios";
import {ariesAgentURL} from "../utils";
import {Aries} from '@project-types'

export async function offerCredentialFromProposal(
  pathParams: Aries.paths['/issue-credential/records/{cred_ex_id}/send-offer']['post']['parameters']['path'],
  body: Aries.V10CredentialBoundOfferRequest
): Promise<Aries.V10CredentialBoundOfferRequest> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/records/${pathParams.cred_ex_id}/send-offer`, body)
  return result
}
