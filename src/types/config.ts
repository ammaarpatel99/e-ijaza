export interface AriesCommandData {
  inboundPort: number
  adminPort: number
  advertisedEndpoint: string
  genesisUrl: string
  walletName: string
  walletKey: string
  tailsServerUrl: string
  webhookURL: string
}

export enum AppType {
  USER = 'user',
  MASTER = 'master'
}

export enum ConfigState {
  InitialConfigMissing,
  WaitingForAries,
  WaitingForPublicDID,
  WaitingForInitialisation,
  Initialised
}

export interface InitialisationData {
  appType: AppType
  masterDID?: string
  label?: string
}
