import {AppType} from "./app-type";

interface _InitialConfig {
  adminPort: number
  inboundPort: number
  advertisedEndpoint: string
  genesisUrl: string
  walletName: string
  walletKey: string
  tailsServerUrl: string
  webhookURL: string
  agentAPI: string
}

interface InitialUserConfig extends _InitialConfig {
  appType: AppType.USER
  masterServerDID: string
  label: string
}

interface InitialMasterConfig extends _InitialConfig {
  appType: AppType.MASTER
}

export type InitialConfig = InitialUserConfig | InitialMasterConfig
