import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {CreateCredDefData, CreateCredDefRes} from "@types";

export async function createCredDef(schemaID: string, tag: string): Promise<string> {
  const ariesURL = AriesAgentUrl.getValue()
  const input: CreateCredDefData = {
    tag,
    schema_id: schemaID
  }
  const {data} = await axios.post(`${ariesURL}/credential-definitions`, input)
  return data.credential_definition_id
}
