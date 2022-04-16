import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL} from "../utils";

export async function getHeldCredential(
  pathParams: Aries.paths['/credential/{credential_id}']['get']['parameters']['path']
): Promise<Aries.paths['/credential/{credential_id}']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/credential/${pathParams.credential_id}`)
  return result
}
