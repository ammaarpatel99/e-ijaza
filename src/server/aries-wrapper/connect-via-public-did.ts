import {AriesAgentUrl} from './aries-agent-url'
import axios from "axios";
import {repeatWithBackoff} from '../utils'
import {deleteConnection} from './delete-connection'
import {
  ConnectionRecord,
  DIDConnectionRes
} from '@types'

export async function connectViaPublicDID(did: string) {
  const ariesURL = AriesAgentUrl.getValue()
  const {data} = await axios.post<DIDConnectionRes>(`${ariesURL}/didexchange/create-request?their_public_did=did:sov:${did}`)
  const connectionID = data.connection_id
  await repeatWithBackoff<null>({
    failCallback: async () => {
      await deleteConnection(connectionID)
      throw new Error(`Could not connect by public DID`)
    },
    callback: async () => {
      const {data} = await axios.get<ConnectionRecord>(`${ariesURL}/connections/${connectionID}`)
      return [data.rfc23_state === 'completed', null]
    }
  })
  return connectionID
}
