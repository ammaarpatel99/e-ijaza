import {ProofReqData, ProofReqRes} from "@types";
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function requestProof(data: ProofReqData) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data: _data} = await axios.post<ProofReqRes>(`${ariesURL}/present-proof/send-request`, data)
  return _data
}
