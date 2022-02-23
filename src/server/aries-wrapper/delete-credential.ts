import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function deleteCredential(credID: string) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.delete(`${ariesURL}/credential/${credID}`)
}
