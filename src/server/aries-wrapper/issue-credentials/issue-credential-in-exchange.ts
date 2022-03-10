import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "@server/aries-wrapper/utils";
import axios from "axios";
import {V10CredentialExchange} from "@project-types/aries-types";

export async function issueCredentialInExchange(
  pathParams: paths['/issue-credential/records/{cred_ex_id}/issue']['post']['parameters']['path'],
  body: paths['/issue-credential/records/{cred_ex_id}/issue']['post']['parameters']['body']['body']
): Promise<V10CredentialExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/records/${pathParams.cred_ex_id}/issue`, body)
  return result
}
