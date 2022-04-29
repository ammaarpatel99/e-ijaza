import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function getConnection(
  pathParams: Aries.paths['/connections/{conn_id}']['get']['parameters']['path'],
): Promise<Aries.paths['/connections/{conn_id}']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/connections/${pathParams.conn_id}`)
  return result
}
