import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function getProof(
  pathParams: Aries.paths['/present-proof/records/{pres_ex_id}']['get']['parameters']['path']
): Promise<Aries.V10PresentationExchange> {
  const {data: result} = await axios.get(`${ariesAgentURL}/present-proof/records/${pathParams.pres_ex_id}`)
  return result
}
