import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function getHeldCredentials(
  pathOptions: paths['/credentials']['get']['parameters']['query']
): Promise<paths['/credentials']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/credentials${pathOptionsToUrl(pathOptions)}`)
  return result
}
