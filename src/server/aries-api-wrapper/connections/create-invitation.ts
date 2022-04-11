import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {pathOptionsToUrl, getAriesAgentUrl} from "../utils";

export async function createInvitation(
  pathOptions: paths['/connections/create-invitation']['post']['parameters']['query'],
  body: paths['/connections/create-invitation']['post']['parameters']['body']['body']
): Promise<paths['/connections/create-invitation']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/connections/create-invitation${pathOptionsToUrl(pathOptions)}`, body)
  return result
}
