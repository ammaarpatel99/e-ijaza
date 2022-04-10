import axios from 'axios'
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function setPublicDID(
  pathOptions: paths['/wallet/did/public']['post']['parameters']['query']
): Promise<paths['/wallet/did/public']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/wallet/did/public${pathOptionsToUrl(pathOptions)}`)
  return result
}
