import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {repeatWithBackoff} from '../utils'
import {deleteConnection} from './delete-connection'

export async function connectToSelf() {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post(`${ariesURL}/connections/create-invitation`, {})
  await axios.post(`${ariesURL}/connections/receive-invitation`, data.invitation)
  const connectionID = data.connection_id

  await repeatWithBackoff<null>({
    failCallback: async () => {
      await deleteConnection(connectionID)
      throw new Error(`Could not connect to self`)
    },
    callback: async () => {
      const {data} = await axios.get(`${ariesURL}/connections/${connectionID}`)
      console.log('here')
      console.log(data)
      console.log('here')
      return [data.rfc23_state === 'response-received' || data.rfc23_state === 'response-sent', null]
    }
  })
  return connectionID
}
