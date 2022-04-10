import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";
import {V10PresentationExchange} from "@project-types/aries-types";

export async function presentProof(
  pathParams: paths['/present-proof/records/{pres_ex_id}/send-presentation']['post']['parameters']['path'],
  body: paths['/present-proof/records/{pres_ex_id}/send-presentation']['post']['parameters']['body']['body']
): Promise<V10PresentationExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/present-proof/records/${pathParams.pres_ex_id}/send-presentation`, body)
  return result
}
