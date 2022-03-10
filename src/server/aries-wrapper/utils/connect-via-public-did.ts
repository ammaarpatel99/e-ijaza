import {paths} from '@project-types/aries-autogen-types'
import {WebhookMonitor} from "@server/webhook/webhook-monitor";
import {deleteConnection} from '../connections'
import {requestConnectionAgainstDID} from "../did";

export async function connectViaPublicDID (
  pathOptions: paths['/didexchange/create-request']['post']['parameters']['query']
) {
  if (!pathOptions.their_public_did.startsWith(`did:sov:`)) {
    pathOptions.their_public_did = `did:sov:${pathOptions.their_public_did}`
  }
  const {connection_id} = await requestConnectionAgainstDID(pathOptions)
  try {
    return await WebhookMonitor.instance.monitorConnection<string, string>(connection_id!,
      (result, resolve, reject) => {
        if (result.rfc23_state === 'abandoned') reject(result.connection_id!)
        if (result.rfc23_state === 'completed') resolve(result.connection_id!)
      })
  } catch (e) {
    if (typeof e === 'string') {
      await deleteConnection({conn_id: e})
      throw new Error(`Connection via public DID failed / was abandoned`)
    }
    throw e
  }
}
