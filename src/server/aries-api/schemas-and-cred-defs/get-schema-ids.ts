import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function getSchemaIDs(
  pathOptions: Aries.paths['/schemas/created']['get']['parameters']['query']
): Promise<Aries.paths['/schemas/created']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/schemas/created${pathOptionsToUrl(pathOptions)}`)
  return result
}
