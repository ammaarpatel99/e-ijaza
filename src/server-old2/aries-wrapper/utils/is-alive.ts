import axios from "axios"
import {paths} from "@project-types/aries-autogen-types";
import {getAriesAgentUrl} from "./aries-agent-url";

export async function isAlive(
  throwIfNotAlive: boolean = false
) {
  const ariesURL = getAriesAgentUrl()
  try {
    const {data: result} = await axios.get<paths['/status/live']['get']['responses']['200']['schema']>(`${ariesURL}/status/live`)
    if (throwIfNotAlive && !result.alive) throw new Error(`can't connect to aries agent`)
    return result
  } catch (e) {
    if (throwIfNotAlive) throw e
    return {alive: false}
  }
}
