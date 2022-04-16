import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function proposeCredential(
  body: Aries.paths['/issue-credential/send-proposal']['post']['parameters']['body']['body']
): Promise<Aries.paths['/issue-credential/send-proposal']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/issue-credential/send-proposal`, body)
  return result
}
