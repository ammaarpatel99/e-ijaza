import {
  createInvitation, deleteConnection, receiveInvitation
} from '../aries-wrapper'
import {WebhookMonitor} from "../webhook/webhook-monitor";

export async function connectToSelf() {
  const {connection_id, invitation} = await createInvitation({auto_accept: true, alias: 'me 1'}, {my_label: 'me 2'})
  const connectionMonitor = WebhookMonitor.instance.monitorConnection(connection_id!, (result, resolve, reject) => {
    if (result.rfc23_state === 'abandoned') reject(result)
    if (result.rfc23_state === 'completed') resolve(result)
  })
  const {connection_id: connection_id_2} = await receiveInvitation({auto_accept: true}, invitation)
  const closeConnections = async () => await Promise.all([
    deleteConnection({conn_id: connection_id!}),
    deleteConnection({conn_id: connection_id_2!})
  ])
  try {
    await connectionMonitor
    return {
      connectionID: connection_id!,
      close: closeConnections
    }
  } catch (e) {
    await closeConnections()
    throw e
  }
}
