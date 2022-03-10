import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function isCredentialRevoked(
  pathParams: paths['/credential/revoked/{credential_id}']['get']['parameters']['path'],
  pathOptions: paths['/credential/revoked/{credential_id}']['get']['parameters']['query']
): Promise<paths['/credential/revoked/{credential_id}']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/credential/revoked/${pathParams.credential_id}${pathOptionsToUrl(pathOptions)}`)
  return result
}
