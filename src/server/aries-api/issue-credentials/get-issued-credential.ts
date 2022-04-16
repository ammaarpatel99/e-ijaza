import axios from "axios";
import {ariesAgentURL} from "../utils";
import {Aries} from "@project-types";

export async function getIssuedCredential(
  pathParams: Aries.paths['/issue-credential/records/{cred_ex_id}']['get']['parameters']['path']
): Promise<Aries.V10CredentialExchange> {
  const {data: result} = await axios.get(`${ariesAgentURL}/issue-credential/records${pathParams.cred_ex_id}`)
  return result
}
