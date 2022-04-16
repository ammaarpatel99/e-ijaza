import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function getIssuedCredentials(
  pathOptions: Aries.paths['/issue-credential/records']['get']['parameters']['query']
): Promise<Aries.V10CredentialExchangeList> {
  const {data: result} = await axios.get(`${ariesAgentURL}/issue-credential/records${pathOptionsToUrl(pathOptions)}`)
  return result
}
