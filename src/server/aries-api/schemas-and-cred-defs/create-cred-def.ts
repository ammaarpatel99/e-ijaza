import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function createCredentialDefinition(
  pathOptions: Aries.paths['/credential-definitions']['post']['parameters']['query'],
  body: Aries.paths['/credential-definitions']['post']['parameters']['body']['body']
) {
  const {data: result} = await axios.post(`${ariesAgentURL}/credential-definitions${pathOptionsToUrl(pathOptions)}`, body)
  return result.credential_definition_id as string
}
