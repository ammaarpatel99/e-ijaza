import axios from "axios"
import {Aries} from "@project-types";
import {ariesAgentURL} from "./aries-agent-url";

export async function isAlive(
  throwIfNotAlive: boolean = false
) {
  try {
    const {data: result} = await axios.get<Aries.paths['/status/live']['get']['responses']['200']['schema']>(`${ariesAgentURL}/status/live`)
    if (throwIfNotAlive && !result.alive) throw new Error(`can't connect to aries agent`)
    return result
  } catch (e) {
    if (throwIfNotAlive) throw e
    return {alive: false}
  }
}
