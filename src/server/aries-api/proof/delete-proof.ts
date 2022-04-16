import {ariesAgentURL} from "../utils";
import axios from "axios";
import {Aries} from "@project-types";

export async function deleteProof(
  pathParams: Aries.paths['/present-proof/records/{pres_ex_id}']['delete']['parameters']['path']
) {
  await axios.delete(`${ariesAgentURL}/present-proof/records/${pathParams.pres_ex_id}`)
}
