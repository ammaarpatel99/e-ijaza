import {AriesAgentUrl} from './aries-agent-url'
import axios from 'axios'
import {DidResult} from "@types";

export async function setPublicDID(did: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<{ results: DidResult['result'][] }>(`${ariesURL}/wallet/did?did=${did}`)
  if (!data?.results[0]?.did) {
    throw new Error(`DID doesn't exist so can't be made public`)
  }
  if (data.results[0]?.posture === 'posted' || data.results[0]?.posture === 'public') return
  await axios.post(`${ariesURL}/wallet/did/public?did=${did}`)
}
