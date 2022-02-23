import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function acceptProofProposal(pres_ex_id: string) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.post(`${ariesURL}/present-proof-2.0/records/${pres_ex_id}/send-request`)
}
