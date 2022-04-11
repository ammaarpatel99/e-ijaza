import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl, pathOptionsToUrl} from "../utils";

export async function createCredentialDefinition(
  pathOptions: paths['/credential-definitions']['post']['parameters']['query'],
  body: paths['/credential-definitions']['post']['parameters']['body']['body']
) {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.post(`${ariesURL}/credential-definitions${pathOptionsToUrl(pathOptions)}`, body)
  return result.credential_definition_id as string
}
