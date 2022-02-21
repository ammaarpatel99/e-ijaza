import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";

export async function deleteConnection(connectionID: string) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.delete(`${ariesURL}/connections/${connectionID}`)
}
