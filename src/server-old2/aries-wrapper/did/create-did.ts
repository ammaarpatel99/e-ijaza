import {getAriesAgentUrl} from '../utils'
import axios from 'axios'
import {paths} from "@project-types/aries-autogen-types";

export async function createDID(
  body: paths['/wallet/did/create']['post']['parameters']['body']['body']
): Promise<paths['/wallet/did/create']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/wallet/did/create`, body)
  return result
}
