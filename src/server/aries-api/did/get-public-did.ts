import axios from "axios"
import {ariesAgentURL} from "../utils";
import {Aries} from "@project-types";

export async function getPublicDID(): Promise<Aries.paths['/wallet/did/public']['get']['responses']['200']['schema']> {
  const {data: result} = await axios.get(`${ariesAgentURL}/wallet/did/public`)
  return result
}
