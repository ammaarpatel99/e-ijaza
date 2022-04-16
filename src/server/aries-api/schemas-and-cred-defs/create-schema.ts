import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function createSchema(
  pathOptions: Aries.paths['/schemas']['post']['parameters']['query'],
  body: Aries.paths['/schemas']['post']['parameters']['body']['body']
) {
  const {data: result} = await axios.post(`${ariesAgentURL}/schemas${pathOptionsToUrl(pathOptions)}`, body)
  return result.schema_id as string
}
