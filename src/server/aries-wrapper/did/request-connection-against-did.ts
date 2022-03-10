import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "@server/aries-wrapper/utils";
import axios from "axios";

export async function requestConnectionAgainstDID(
  pathOptions: paths['/didexchange/create-request']['post']['parameters']['query']
): Promise<paths['/didexchange/create-request']['post']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/didexchange/create-request${pathOptionsToUrl(pathOptions)}`)
  return result
}
