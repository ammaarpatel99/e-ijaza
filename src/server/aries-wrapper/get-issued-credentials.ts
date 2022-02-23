import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {IssuedCredentials} from "@types";

export async function getIssuedCredentials<Schema>(connectionID?: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<IssuedCredentials<Schema>>(
    `${ariesURL}/issue-credential/records?role=issuer&state=credential_acked`
    + (connectionID?`&connection_id=${connectionID}`:``)
  )
  return data
}
