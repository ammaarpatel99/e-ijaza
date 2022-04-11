import {getAriesAgentUrl} from "../utils";
import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";

export async function deleteCredential(
  pathParams: paths['/credential/{credential_id}']['delete']['parameters']['path']
) {
  const ariesURL = getAriesAgentUrl()
  await axios.delete(`${ariesURL}/credential/${pathParams.credential_id}`)
}
