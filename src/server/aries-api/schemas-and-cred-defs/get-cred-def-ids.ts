import axios from "axios";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";
import {Aries} from '@project-types'

export async function getCredDefIDs(
  pathOptions: Aries.paths['/credential-definitions/created']['get']['parameters']['query']
): Promise<Aries.paths['/credential-definitions/created']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/credential-definitions/created${pathOptionsToUrl(pathOptions)}`)
  return result
}
