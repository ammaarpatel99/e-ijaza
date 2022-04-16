import axios from "axios";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";
import {Aries} from '@project-types'

export async function receiveInvitation(
  pathOptions: Aries.paths['/connections/receive-invitation']['post']['parameters']['query'],
  body: Aries.paths['/connections/receive-invitation']['post']['parameters']['body']['body']
): Promise<Aries.paths['/connections/receive-invitation']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/connections/receive-invitation${pathOptionsToUrl(pathOptions)}`, body)
  return result
}
