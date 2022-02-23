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
  const {data} = await axios.post(`${ariesURL}/schemas`, input)
  console.log(data)
  return data.schema_id
}
