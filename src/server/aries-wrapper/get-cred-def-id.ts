import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {GetCredDefsRes} from "@types";

export async function getCredDefID(schemaID: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<GetCredDefsRes>(`${ariesURL}/credential-definitions/created?schema_id=${schemaID}`)
  if (!data?.credential_definition_ids[0]) {
    throw new Error(`Credential Definition with schema ID ${schemaID} doesn't exist`)
  }
  return data.credential_definition_ids[0]
}
