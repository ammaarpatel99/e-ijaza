import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";

export async function createCredDef(schemaID: string, tag: string): Promise<string> {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post(`${ariesURL}/credential-definitions`, {
    revocation_registry_size: 1000,
    schema_id: schemaID,
    support_revocation: true,
    tag
  })
  return data.credential_definition_id as string
}
