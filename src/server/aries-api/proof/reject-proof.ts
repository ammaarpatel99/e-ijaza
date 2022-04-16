import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function rejectProof(
  pathParams: Aries.paths['/present-proof/records/{pres_ex_id}/problem-report']['post']['parameters']['path'],
  body: Aries.paths['/present-proof/records/{pres_ex_id}/problem-report']['post']['parameters']['body']['body']
) {
  await axios.post(`${ariesAgentURL}/present-proof/records/${pathParams.pres_ex_id}/problem-report`, body)
}
