import axios from "axios";
import {paths} from "@project-types/aries-autogen-types";
import {pathOptionsToUrl, getAriesAgentUrl} from "../utils";
import {V10CredentialExchangeList} from "@project-types/aries-types";

export async function getIssuedCredentials(
  pathOptions: paths['/issue-credential/records']['get']['parameters']['query']
): Promise<V10CredentialExchangeList> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/issue-credential/records${pathOptionsToUrl(pathOptions)}`)
  return result
}
