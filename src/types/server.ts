import {AppType, InitialisationState} from "@project-types/interface-api";

interface InitialisationData_1 {
  state: InitialisationState.START_STATE | InitialisationState.STARTING_ARIES | InitialisationState.ARIES_READY
}

interface InitialisationData_2 {
  state: InitialisationState.PUBLIC_DID_REGISTERED
  did: string
}

interface InitialisationData_3 {
  state: InitialisationState.INITIALISING
  did: string
  name: string
  appType: AppType.CONTROLLER
}

interface InitialisationData_4 {
  state: InitialisationState.INITIALISING
  did: string
  name: string
  appType: AppType.USER
  masterDID: string
}

export type InitialisationData = InitialisationData_1 | InitialisationData_2 | InitialisationData_3 | InitialisationData_4
