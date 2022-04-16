import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";
import axios from "axios";

export async function requestCredentialFromOffer(
  pathParams: Aries.paths['/issue-credential/records/{cred_ex_id}/send-request']['post']['parameters']['path']
): Promise<Aries.V10CredentialExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/records/${pathParams.cred_ex_id}/send-request`)
  return result
}
