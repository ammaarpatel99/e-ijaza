import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {GetProofRes} from "@types";

export async function getProof(pres_ex_id: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<GetProofRes>(`${ariesURL}/present-proof/records/${pres_ex_id}`)
  return data
}
