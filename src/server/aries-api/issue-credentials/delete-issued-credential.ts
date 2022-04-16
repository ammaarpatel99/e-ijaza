import axios from "axios";
import {ariesAgentURL} from "../utils";
import {Aries} from "@project-types";

export async function deleteIssuedCredential(
  pathParams: Aries.paths['/issue-credential/records/{cred_ex_id}']['delete']['parameters']['path']
) {
  await axios.delete(`${ariesAgentURL}/issue-credential/records/${pathParams.cred_ex_id}`)
}
