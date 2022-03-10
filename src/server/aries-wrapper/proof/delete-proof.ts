import {getAriesAgentUrl} from "../utils";
import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";

export async function deleteProof(
  pathParams: paths['/present-proof/records/{pres_ex_id}']['delete']['parameters']['path']
) {
  const ariesURL = getAriesAgentUrl()
  await axios.delete(`${ariesURL}/present-proof/records/${pathParams.pres_ex_id}`)
}
