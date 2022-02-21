import {AriesAgentUrl} from './aries-agent-url'
import axios from 'axios'

export async function generatedDID(): Promise<{did: string; verkey: string}> {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post(`${ariesURL}/wallet/did/create`, {})
  return {
    did: data.result.did,
    verkey: data.result.verkey
  }
}
