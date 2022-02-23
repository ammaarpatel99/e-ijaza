import {RevokeRequestData} from "@types";
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function revokeCredential(data: RevokeRequestData) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.post(`${ariesURL}/revocation/revoke`, data)
}
