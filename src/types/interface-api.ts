export interface PublicDIDInitialisationData {
  vonNetworkURL: string
}

export interface AriesInitialisationData extends Partial<PublicDIDInitialisationData> {
  advertisedEndpoint: string
  genesisURL: string
  tailsServerURL: string
}

export enum AppType {
  USER = 'USER',
  MASTER = 'MASTER'
}

export interface InitialisationData_master {
  appType: AppType.MASTER
}

export interface InitialisationData_user {
  appType: AppType.USER
  masterDID: string
  name: string
}

export type InitialisationData = InitialisationData_master | InitialisationData_user

export enum InitialisationState {
  START_STATE,
  STARTING_ARIES,
  ARIES_READY,
  PUBLIC_DID_REGISTERED,
  INITIALISATION_DATA_REQUIRED,
  COMPLETE
}

export interface DIDDetails {
  did: string
  verkey: string
}
