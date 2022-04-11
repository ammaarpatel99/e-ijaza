import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {pathOptionsToUrl, getAriesAgentUrl} from "../utils";

export async function receiveInvitation(
  pathOptions: paths['/connections/receive-invitation']['post']['parameters']['query'],
  body: paths['/connections/receive-invitation']['post']['parameters']['body']['body']
): Promise<paths['/connections/receive-invitation']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/connections/receive-invitation${pathOptionsToUrl(pathOptions)}`, body)
  return result
}
