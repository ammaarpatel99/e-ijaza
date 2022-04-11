import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";
import {V10CredentialExchange} from "@project-types/aries-types";

export async function issueCredential(
  body: paths['/issue-credential/send']['post']['parameters']['body']['body']
): Promise<V10CredentialExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/send`, body)
  return result
}
