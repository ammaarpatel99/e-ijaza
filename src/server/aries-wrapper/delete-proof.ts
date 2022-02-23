import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function deleteProof(pres_ex_id: string) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.delete(`${ariesURL}/present-proof/records/${pres_ex_id}`)
}
