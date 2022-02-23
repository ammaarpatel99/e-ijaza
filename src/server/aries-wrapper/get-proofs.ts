import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";
import {GetProofsRes} from "@types";

export async function getProofs(
  {
    connection_id,
    role,
    state
  }: {
    connection_id?: string
    role: GetProofsRes['results'][number]['role']
    state: GetProofsRes['results'][number]['state']
  }
  ) {
  const ariesURL = AriesAgentUrl.getValue()
  let url = `${ariesURL}/present-proof/records`
  let params = ''
  if (connection_id) {params += `&connection_id=${connection_id}`}
  if (role) {params += `&role=${role}`}
  if (state) {params += `&state=${state}`}
  if (!!params) {
    params = '?' + params.slice(1)
  }
  const {data} = await axios.get<GetProofsRes>(`${ariesURL}/present-proof/records${params}`)
  return data
}
