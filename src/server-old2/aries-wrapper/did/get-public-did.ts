import axios from "axios"
import {getAriesAgentUrl} from "../utils";
import {paths} from "@project-types/aries-autogen-types";

export async function getPublicDID(): Promise<paths['/wallet/did/public']['get']['responses']['200']['schema']> {
  const ariesURL = getAriesAgentUrl()
  const {data: result} = await axios.get(`${ariesURL}/wallet/did/public`)
  return result
}
