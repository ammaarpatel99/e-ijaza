import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";
import axios from "axios";

export async function requestConnectionAgainstDID(
  pathOptions: Aries.paths['/didexchange/create-request']['post']['parameters']['query']
): Promise<Aries.paths['/didexchange/create-request']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/didexchange/create-request${pathOptionsToUrl(pathOptions)}`)
  return result
}
