import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {pathOptionsToUrl, getAriesAgentUrl} from "../utils";

export async function getCredDefIDs(
  pathOptions: paths['/credential-definitions/created']['get']['parameters']['query']
): Promise<paths['/credential-definitions/created']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/credential-definitions/created${pathOptionsToUrl(pathOptions)}`)
  return result
}
