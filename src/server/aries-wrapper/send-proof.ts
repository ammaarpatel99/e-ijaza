import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {ProofPresentationData, ProofPresentationRes} from "@types";

export async function sendProof(pres_ex_id: string, data: ProofPresentationData) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.post<ProofPresentationRes>(`${ariesURL}/present-proof/records/${pres_ex_id}/send-presentation`, data)
}
