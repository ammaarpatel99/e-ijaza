import {AppType} from "../schemas";
import {InitialisationState} from '../server'
export {AppType, InitialisationState}

export interface UpdateReq {
  timestamp: number
}

interface UpdateRes_1 {
  state: InitialisationState.START_STATE | InitialisationState.STARTING_ARIES | InitialisationState.ARIES_READY | InitialisationState.REGISTERING_PUBLIC_DID
}

interface UpdateRes_2 {
  state: InitialisationState.PUBLIC_DID_REGISTERED | InitialisationState.INITIALISING
  did: string
}

interface UpdateRes_3 {
  state: InitialisationState.COMPLETE
  did: string
  appType: AppType
  timestamp: number
  masters: boolean
  masterProposals: boolean
  subjects: boolean
  subjectProposals: boolean
  heldCredentials: boolean
  issuedCredentials: boolean
  outgoingProofRequests: boolean
  incomingProofRequests: boolean
  reachableSubjects: boolean
}

export type UpdateRes = UpdateRes_1 | UpdateRes_2 | UpdateRes_3
