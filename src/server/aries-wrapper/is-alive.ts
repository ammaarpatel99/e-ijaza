import axios from "axios"
import {AriesAgentUrl} from './aries-agent-url'

export async function isAlive(errorIfNotAlive: boolean = false) {
  const ariesURL = AriesAgentUrl.getValue()
  try {
    const {data} = await axios.get<{alive: boolean}>(`${ariesURL}/status/live`)
    if (errorIfNotAlive && !data.alive) throw new Error(`Aries not alive`)
    return data.alive === true;
  } catch {
    if (errorIfNotAlive) throw new Error(`Aries not alive`)
    return false
  }
}
