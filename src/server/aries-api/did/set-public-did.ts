import axios from 'axios'
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function setPublicDID(
  pathOptions: Aries.paths['/wallet/did/public']['post']['parameters']['query']
): Promise<Aries.paths['/wallet/did/public']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/wallet/did/public${pathOptionsToUrl(pathOptions)}`)
  return result
}
