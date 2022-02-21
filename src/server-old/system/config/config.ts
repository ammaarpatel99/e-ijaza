import {ConfigState} from './config-state'
import {InitialConfig} from './initial-config'
import {AppType} from './app-type'
import {AriesWrapper} from '../aries-wrapper'

type State =
  readonly [ConfigState.NOT_CONFIGURED] |
  readonly [Exclude<ConfigState, ConfigState.NOT_CONFIGURED>, InitialConfig]


export class Config {
  private static _instance: Config|undefined
  static get instance() {
    if (this._instance === undefined) {
      this._instance = new Config()
    }
    return this._instance
  }
  private constructor() { }

  private _state: State = [ConfigState.NOT_CONFIGURED]
  get state() {
    return this._state[0]
  }

  get appType(): AppType {
    if (this._state[0] === ConfigState.NOT_CONFIGURED) {
      throw new Error('App Type not known')
    }
    return this._state[1].appType
  }

  get masterDID(): string {
    if (this._state[0] === ConfigState.NOT_CONFIGURED) {
      throw new Error('App Type not known')
    } else if (this._state[1].appType === AppType.MASTER) {
      throw new Error(`No master DID on master server`)
    }
    return this._state[1].masterServerDID
  }

  get ariesAgentTerminalCommand() {
    if (this._state[0] === ConfigState.NOT_CONFIGURED) {
      throw new Error('Initial Configuration not complete')
    }
    const c = this._state[1]
    return `PORTS="${c.inboundPort}:${c.inboundPort}${c.adminPort ? ` ${c.adminPort}:${c.adminPort}` : ''}" ` +
      `~/aries-cloudagent-python/scripts/run_docker start ` +
      `--admin 0.0.0.0 ${c.adminPort} `+
      `--admin-insecure-mode ` +
      `--inbound-transport http 0.0.0.0 ${c.inboundPort} ` +
      `--outbound-transport http ` +
      `--endpoint ${c.advertisedEndpoint} ` +
      `--genesis-url ${c.genesisUrl} ` +
      `--wallet-type indy ` +
      `--wallet-name ${c.walletName} ` +
      `--wallet-key ${c.walletKey} ` +
      `--public-invites ` +
      `--auto-accept-invites ` +
      `--auto-accept-requests ` +
      `--auto-respond-messages ` +
      `--auto-respond-credential-offer ` +
      `--auto-respond-credential-request ` +
      `--auto-respond-presentation-proposal ` +
      `--auto-store-credential ` +
      `--tails-server-base-url ${c.tailsServerUrl} ` +
      `--notify-revocation ` +
      `--monitor-revocation-notification ` +
      `--public-invites ` +
      `--auto-provision ` +
      `--auto-accept-intro-invitation-requests ` +
      `--webhook-url ${c.webhookURL}`
  }

  get ariesAgentUrl() {
    if (this.state === ConfigState.NOT_CONFIGURED) {
      throw new Error(`configuration not set`)
    }
    return (this._state[1] as InitialConfig).agentAPI
  }

  get label() {
    if (this._state[0] === ConfigState.NOT_CONFIGURED) {
      throw new Error('label not known')
    }
    if (this._state[1].appType === AppType.USER) return this._state[1].label
    else return 'master.teaching'
  }

  async setInitialConfiguration(initialConfig: InitialConfig) {
    if (this.state !== ConfigState.NOT_CONFIGURED) {
      throw new Error(`Initial Configuration already complete`)
    }
    this._state = [ConfigState.ARIES_NOT_CONNECTED, {...initialConfig}]
    try {
      await this.ariesAgentIsReady()
    } catch {}
  }

  async ariesAgentIsReady() {
    if (this._state[0] !== ConfigState.ARIES_NOT_CONNECTED) {
      throw new Error(`Incorrect state to mark aries agent as ready`)
    }
    if (!(await AriesWrapper.instance.isAlive())) {
      throw new Error(`Can't connect to aries agent`)
    }
    this._state = [ConfigState.PUBLIC_DID_NOT_REGISTERED, this._state[1]]
    if (await AriesWrapper.instance.getPublicDID()) {
      this._state = [ConfigState.CONFIGURING, this._state[1]]
      try {
        await this.completeConfiguration()
      } catch {}
    }
  }

  generatePublicDID() {
    if (this.state !== ConfigState.PUBLIC_DID_NOT_REGISTERED) {
      throw new Error(`Incorrect state to generate public DID`)
    }
    return AriesWrapper.instance.generateDID()
  }

  async setPublicDID(did: string) {
    if (this._state[0] !== ConfigState.PUBLIC_DID_NOT_REGISTERED) {
      throw new Error(`Incorrect state to set public DID`)
    }
    await AriesWrapper.instance.setPublicDID(did)
    this._state = [ConfigState.CONFIGURING, this._state[1]]
    await this.completeConfiguration()
    this._state = [ConfigState.COMPLETE, this._state[1]]
  }

  private async completeConfiguration() {
    // if (this.appType === AppType.MASTER) {
    //   await initialiseMaster()
    // } else {
    //   await initialiseUser()
    // }
    // this._state[0] = ConfigState.COMPLETE
  }
}
