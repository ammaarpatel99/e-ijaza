import {Config} from "@server/config";
import {AppType} from "@project-types";
import {handleCredential as master_handleCredential, handleProof as master_handleProof} from './master'
import {handleCredential as user_handleCredential, handleProof as user_handleProof, handleRevocationNotification as user_handleRevocation} from './user'
import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";

export function handleCredential(data: V10CredentialExchange) {
  if (Config.instance.getAppType() === AppType.MASTER) return master_handleCredential(data)
  else return user_handleCredential(data)
}

export function handleProof(data: V10PresentationExchange) {
  if (Config.instance.getAppType() === AppType.MASTER) return master_handleProof(data)
  else return user_handleProof(data)
}

export async function handleRevocationNotification(threadID: string) {
  if (Config.instance.getAppType() === AppType.MASTER) return false
  else return user_handleRevocation(threadID)
}
