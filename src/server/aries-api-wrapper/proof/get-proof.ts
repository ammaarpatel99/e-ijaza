import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";
import {V10PresentationExchange} from "@project-types/aries-types";

export async function getProof(
  pathParams: paths['/present-proof/records/{pres_ex_id}']['get']['parameters']['path']
): Promise<V10PresentationExchange> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/present-proof/records/${pathParams.pres_ex_id}`)
  return result
}
