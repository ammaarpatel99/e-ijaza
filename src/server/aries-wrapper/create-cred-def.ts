import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {CreateCredDefData, CreateCredDefRes} from "@types";

export async function createCredDef(schemaID: string, tag: string): Promise<string> {
  const ariesURL = AriesAgentUrl.getValue()
  const input: CreateCredDefData = {
    tag,
    schema_id: schemaID
  }
  const {data} = await axios.post<CreateCredDefRes>(`${ariesURL}/credential-definitions`, input)
  return data.sent.credential_definition_id
}
