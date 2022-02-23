import {RequestCredentialData, RequestCredentialRes} from "@types";
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function requestCredential<Schema>(data: RequestCredentialData<Schema>) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data: _data} = await axios.post<RequestCredentialRes>(`${ariesURL}/issue-credential/send-proposal`, data)
  return _data
}
