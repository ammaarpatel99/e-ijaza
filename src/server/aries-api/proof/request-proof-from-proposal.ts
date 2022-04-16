import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function requestProofFromProposal(
  pathParams: Aries.paths['/present-proof/records/{pres_ex_id}/send-request']['post']['parameters']['path'],
  body: Aries.paths['/present-proof/records/{pres_ex_id}/send-request']['post']['parameters']['body']['body']
): Promise<Aries.V10PresentationExchange> {
  const {data: result} = await axios.post(`${ariesAgentURL}/present-proof/records/${pathParams.pres_ex_id}/send-request`, body)
  return result
}
