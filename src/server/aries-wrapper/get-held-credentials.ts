import {HeldCredentialsRes} from '@types'
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function getHeldCredentials() {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<HeldCredentialsRes<any>>(`${ariesURL}/credentials`)
  return data
}
