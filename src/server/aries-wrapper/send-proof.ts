import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {ProofPresentationData, ProofPresentationRes} from "@types";

export async function sendProof(data: ProofPresentationData) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.post<ProofPresentationRes>(`${ariesURL}/revocation/revoke`, data)
}
