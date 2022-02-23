import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios"
import {DidResult} from "@types";

export async function getPublicDID(): Promise<string|undefined> {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<DidResult>(`${ariesURL}/wallet/did/public`)
  if (data.result === null) {
    return undefined
  } else {
    return data.result.did
  }
}
