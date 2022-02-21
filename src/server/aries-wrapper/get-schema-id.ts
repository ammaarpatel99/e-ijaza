import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";

export async function getSchemaID(name: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get(`${ariesURL}/schemas/created?schema_name=${name}`)
  if (!data?.schema_ids[0]) {
    throw new Error(`Schema ${name} doesn't exist`)
  }
  return data.schema_ids[0] as string
}
