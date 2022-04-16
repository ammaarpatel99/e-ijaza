import {ariesAgentURL} from '../utils'
import axios from 'axios'
import {Aries} from "@project-types";

export async function createDID(
  body: Aries.paths['/wallet/did/create']['post']['parameters']['body']['body']
): Promise<Aries.paths['/wallet/did/create']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/wallet/did/create`, body)
  return result
}
