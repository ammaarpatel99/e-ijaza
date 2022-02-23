import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {HeldCredRevokedRes} from "@types";

export async function isCredentialRevoked(credentialID: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<HeldCredRevokedRes>(`${ariesURL}/credential/revoked/${credentialID}`)
  return data.revoked
}
