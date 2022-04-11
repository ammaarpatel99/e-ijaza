import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";
import {V10PresentationExchangeList} from "@project-types/aries-types";

export async function getProofs(
  pathOptions: paths['/present-proof/records']['get']['parameters']['query']
  ): Promise<V10PresentationExchangeList> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/present-proof/records${pathOptionsToUrl(pathOptions)}`)
  return result
}
