import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {repeatWithBackoff} from '../utils'
import {deleteConnection} from './delete-connection'
import {
  ConnectionRecord,
  CreateInvitationRes
} from '@types'

export async function connectToSelf() {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post<CreateInvitationRes>(`${ariesURL}/connections/create-invitation`, {})
  await axios.post(`${ariesURL}/connections/receive-invitation`, data.invitation)
  const connectionID = data.connection_id

  await repeatWithBackoff<null>({
    failCallback: async () => {
      await deleteConnection(connectionID)
      throw new Error(`Could not connect to self`)
    },
    callback: async () => {
      const {data} = await axios.get<ConnectionRecord>(`${ariesURL}/connections/${connectionID}`)
      return [data.rfc23_state === 'response-received' || data.rfc23_state === 'response-sent', null]
    }
  })
  return connectionID
}
