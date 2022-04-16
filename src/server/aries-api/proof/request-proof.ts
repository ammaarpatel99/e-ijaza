import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function requestProof(
  body: Aries.paths['/present-proof/send-request']['post']['parameters']['body']['body']
): Promise<Aries.V10PresentationExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/present-proof/send-request`, body)
  return result
}
