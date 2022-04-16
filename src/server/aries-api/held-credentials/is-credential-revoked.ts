import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function isCredentialRevoked(
  pathParams: Aries.paths['/credential/revoked/{credential_id}']['get']['parameters']['path'],
  pathOptions: Aries.paths['/credential/revoked/{credential_id}']['get']['parameters']['query']
): Promise<Aries.paths['/credential/revoked/{credential_id}']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/credential/revoked/${pathParams.credential_id}${pathOptionsToUrl(pathOptions)}`)
  return result
}
