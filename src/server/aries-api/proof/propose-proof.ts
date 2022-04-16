import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function proposeProof(
  body: Aries.paths['/present-proof/send-proposal']['post']['parameters']['body']['body']
): Promise<Aries.V10PresentationExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/present-proof/send-proposal`, body)
  return result
}
