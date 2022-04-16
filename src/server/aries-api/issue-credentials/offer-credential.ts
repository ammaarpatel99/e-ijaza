import {Aries} from "@project-types";
import axios from "axios";
import {ariesAgentURL} from "../utils";

export async function offerCredential(
  body: Aries.paths['/issue-credential/send-offer']['post']['parameters']['body']
): Promise<Aries.V10CredentialExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/send-offer`, body)
  return result
}
