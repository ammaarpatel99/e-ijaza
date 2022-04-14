import {AppType, InitialisationState} from "@project-types/interface-api";

interface InitialisationStateData_1 {
  state: InitialisationState.START_STATE | InitialisationState.STARTING_ARIES | InitialisationState.ARIES_READY | InitialisationState.REGISTERING_PUBLIC_DID
}

interface InitialisationStateData_2 {
  state: InitialisationState.PUBLIC_DID_REGISTERED | InitialisationState.INITIALISING
  did: string
}

interface InitialisationStateData_3_base {
  state: InitialisationState.COMPLETE
  did: string
  name: string
}

interface InitialisationStateData_3_controller extends InitialisationStateData_3_base {
  appType: AppType.CONTROLLER
}

interface InitialisationStateData_3_user extends InitialisationStateData_3_base {
  appType: AppType.USER
  controllerDID: string
}

type InitialisationStateData_3 = InitialisationStateData_3_user | InitialisationStateData_3_controller

export type InitialisationStateData = InitialisationStateData_1 | InitialisationStateData_2 | InitialisationStateData_3
