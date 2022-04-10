import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";
import {V10PresentationExchange} from "@project-types/aries-types";

export async function requestProof(
  body: paths['/present-proof/send-request']['post']['parameters']['body']['body']
): Promise<V10PresentationExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/present-proof/send-request`, body)
  return result
}
