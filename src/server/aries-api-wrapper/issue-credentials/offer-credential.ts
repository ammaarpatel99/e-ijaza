import {paths} from "@project-types/aries-autogen-types";
import axios from "axios";
import {getAriesAgentUrl} from "../utils";
import {V10CredentialExchange} from "@project-types/aries-types";

export async function offerCredential(
  body: paths['/issue-credential/send-offer']['post']['parameters']['body']
): Promise<V10CredentialExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/send-offer`, body)
  return result
}
