import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";

export async function deleteConnection(
  pathParams: paths['/connections/{conn_id}']['delete']['parameters']['path']
) {
  const ariesURL = getAriesAgentUrl()
  await axios.delete(`${ariesURL}/connections/${pathParams.conn_id}`)
}
