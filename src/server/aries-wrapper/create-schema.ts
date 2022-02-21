import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";

export async function createSchema(name: string, attributes: string[]) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post(`${ariesURL}/schemas`, {schema_name: name, attributes, schema_version: "1.0"})
  return data.schema_id as string
}
