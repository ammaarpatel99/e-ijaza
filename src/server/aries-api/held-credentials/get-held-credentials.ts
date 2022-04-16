import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function getHeldCredentials(
  pathOptions: Aries.paths['/credentials']['get']['parameters']['query']
): Promise<Aries.paths['/credentials']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/credentials${pathOptionsToUrl(pathOptions)}`)
  return result
}
