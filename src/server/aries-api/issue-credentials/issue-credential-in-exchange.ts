import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";
import axios from "axios";

export async function issueCredentialInExchange(
  pathParams: Aries.paths['/issue-credential/records/{cred_ex_id}/issue']['post']['parameters']['path'],
  body: Aries.paths['/issue-credential/records/{cred_ex_id}/issue']['post']['parameters']['body']['body']
): Promise<Aries.V10CredentialExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/records/${pathParams.cred_ex_id}/issue`, body)
  return result
}
