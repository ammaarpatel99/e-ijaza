import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {CreateSchemaData, CreateSchemaRes} from "@types";

export async function createSchema(name: string, attributes: string[]) {
  const ariesURL = AriesAgentUrl.getValue()
  const input: CreateSchemaData = {
    schema_name: name,
    attributes,
    schema_version: '1.0'
  }
  const {data} = await axios.post<CreateSchemaRes>(`${ariesURL}/schemas`, input)
  return data.sent.schema_id
}
