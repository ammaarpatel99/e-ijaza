import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function deleteConnection(
  pathParams: Aries.paths['/connections/{conn_id}']['delete']['parameters']['path']
) {
  await axios.delete(`${ariesAgentURL}/connections/${pathParams.conn_id}`)
}
