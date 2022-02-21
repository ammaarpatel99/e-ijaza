import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {repeatWithBackoff} from '../utils'
import {deleteConnection} from './delete-connection'

export async function connectViaPublicDID(did: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post(`${ariesURL}/didexchange/create-request?their_public_did=did:sov:${did}`)
  const connectionID = data.connection_id as string
  await repeatWithBackoff<void>({
    failCallback: async () => {
      await deleteConnection(connectionID)
      throw new Error(`Could not connect by public DID`)
    },
    callback: async () => {
      const {data} = await axios.get(`${ariesURL}/connections/${connectionID}`)
      return [data.rfc23_state === 'completed', undefined]
    }
  })
  return connectionID
}
