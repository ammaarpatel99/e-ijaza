import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../../aries-wrapper/utils";
import axios from "axios";
import {V10CredentialExchange} from "@project-types/aries-types";

export async function requestCredentialFromOffer(
  pathParams: paths['/issue-credential/records/{cred_ex_id}/send-request']['post']['parameters']['path']
): Promise<V10CredentialExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/records/${pathParams.cred_ex_id}/send-request`)
  return result
}
