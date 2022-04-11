import axios from "axios";
import {getAriesAgentUrl} from "../utils";
import {paths} from "@project-types/aries-autogen-types";

export async function deleteIssuedCredential(
  pathParams: paths['/issue-credential/records/{cred_ex_id}']['delete']['parameters']['path']
) {
  const ariesURL = getAriesAgentUrl()
  await axios.delete(`${ariesURL}/issue-credential/records/${pathParams.cred_ex_id}`)
}
