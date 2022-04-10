import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";

export async function proposeCredential(
  body: paths['/issue-credential/send-proposal']['post']['parameters']['body']['body']
): Promise<paths['/issue-credential/send-proposal']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/issue-credential/send-proposal`, body)
  return result
}
