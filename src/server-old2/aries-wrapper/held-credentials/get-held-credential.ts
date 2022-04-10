import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "../utils";

export async function getHeldCredential(
  pathParams: paths['/credential/{credential_id}']['get']['parameters']['path']
): Promise<paths['/credential/{credential_id}']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/credential/${pathParams.credential_id}`)
  return result
}
