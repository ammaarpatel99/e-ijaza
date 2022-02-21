import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios"

export async function getPublicDID(): Promise<string|undefined> {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get(`${ariesURL}/wallet/did/public`)
  if (data.result === null) {
    return undefined
  } else {
    return data.result.did as string
  }
}
