import {ariesAgentURL} from "../utils";
import axios from "axios";
import {Aries} from "@project-types";

export async function deleteCredential(
  pathParams: Aries.paths['/credential/{credential_id}']['delete']['parameters']['path']
) {
  await axios.delete(`${ariesAgentURL}/credential/${pathParams.credential_id}`)
}
