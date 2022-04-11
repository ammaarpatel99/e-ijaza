import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function getSchemaIDs(
  pathOptions: paths['/schemas/created']['get']['parameters']['query']
): Promise<paths['/schemas/created']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/schemas/created${pathOptionsToUrl(pathOptions)}`)
  return result
}
