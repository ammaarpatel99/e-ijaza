import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";

export async function rejectProof(
  pathParams: paths['/present-proof/records/{pres_ex_id}/problem-report']['post']['parameters']['path'],
  body: paths['/present-proof/records/{pres_ex_id}/problem-report']['post']['parameters']['body']['body']
) {
  const ariesURL = getAriesAgentUrl()
  await axios.post(`${ariesURL}/present-proof/records/${pathParams.pres_ex_id}/problem-report`, body)
}
