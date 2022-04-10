import {paths} from "@project-types/aries-autogen-types";
import {V10CredentialBoundOfferRequest} from '@project-types/aries-types'
import axios from "axios";
import {getAriesAgentUrl} from "../utils";

export async function offerCredentialFromProposal(
  pathParams: paths['/issue-credential/records/{cred_ex_id}/send-offer']['post']['parameters']['path'],
  body: V10CredentialBoundOfferRequest
): Promise<V10CredentialBoundOfferRequest> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/records/${pathParams.cred_ex_id}/send-offer`, body)
  return result
}
