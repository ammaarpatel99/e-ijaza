import {IssueCredentialData, IssueCredentialRes} from "@types";
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function issueCredential<Schema>(data: IssueCredentialData<Schema>) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data: _data} = await axios.post<{ data: IssueCredentialRes }>(`${ariesURL}/issue-credential/send`, data)
  return _data
}
