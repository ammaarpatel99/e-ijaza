import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {ProofPresentationRes, ProofProposalData, ProofProposalRes} from "@types";

export async function sendProofProposal(data: ProofProposalData) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data: _data} = await axios.post<ProofProposalRes>(`${ariesURL}/revocation/revoke`, data)
  return _data
}
