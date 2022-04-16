import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function issueCredential(
  body: Aries.paths['/issue-credential/send']['post']['parameters']['body']['body']
): Promise<Aries.V10CredentialExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/send`, body)
  return result
}
