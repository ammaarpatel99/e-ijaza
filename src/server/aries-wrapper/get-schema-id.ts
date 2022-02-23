import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {GetSchemasRes} from "@types";

export async function getSchemaID(name: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.get<GetSchemasRes>(`${ariesURL}/schemas/created?schema_name=${name}`)
  if (!data?.schema_ids[0]) {
    throw new Error(`Schema ${name} doesn't exist`)
  }
  return data.schema_ids[0]
}
