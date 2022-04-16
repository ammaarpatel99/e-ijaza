import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function getProofs(
  pathOptions: Aries.paths['/present-proof/records']['get']['parameters']['query']
  ): Promise<Aries.V10PresentationExchangeList> {
  const {data: result} = await axios.get(`${ariesAgentURL}/present-proof/records${pathOptionsToUrl(pathOptions)}`)
  return result
}
