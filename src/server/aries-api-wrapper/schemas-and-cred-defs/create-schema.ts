import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function createSchema(
  pathOptions: paths['/schemas']['post']['parameters']['query'],
  body: paths['/schemas']['post']['parameters']['body']['body']
) {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/schemas${pathOptionsToUrl(pathOptions)}`, body)
  return result.schema_id as string
}
