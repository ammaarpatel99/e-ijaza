import axios from "axios";
import {getAriesAgentUrl} from "../utils";
import {paths} from "@project-types/aries-autogen-types";
import {V10CredentialExchange} from "@project-types/aries-types";

export async function getIssuedCredential(
  pathParams: paths['/issue-credential/records/{cred_ex_id}']['get']['parameters']['path']
): Promise<V10CredentialExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/issue-credential/records${pathParams.cred_ex_id}`)
  return result
}
