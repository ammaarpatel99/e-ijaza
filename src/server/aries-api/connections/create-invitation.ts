import axios from "axios";
import {Aries} from "@project-types";
import {ariesAgentURL, pathOptionsToUrl} from "../utils";

export async function createInvitation(
  pathOptions: Aries.paths['/connections/create-invitation']['post']['parameters']['query'],
  body: Aries.paths['/connections/create-invitation']['post']['parameters']['body']['body']
): Promise<Aries.paths['/connections/create-invitation']['post']['responses']['200']['schema']> {
  const {data: result} = await axios.post(`${ariesAgentURL}/connections/create-invitation${pathOptionsToUrl(pathOptions)}`, body)
  return result
}
