import {AppType} from "../schemas";
export {AppType}

export interface PublicDIDInitialisationData {
  vonNetworkURL: string
}

export interface AriesInitialisationData extends Partial<PublicDIDInitialisationData> {
  advertisedEndpoint: string
  genesisURL: string
  tailsServerURL: string
}

export interface InitialisationData_controller {
  appType: AppType.CONTROLLER
}

export interface InitialisationData_user {
  appType: AppType.USER
  controllerDID: string
  name: string
}

export type InitialisationData = InitialisationData_controller | InitialisationData_user

export type FullInitialisationData = AriesInitialisationData & InitialisationData
