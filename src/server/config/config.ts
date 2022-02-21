import {
  AriesCommand,
  AriesCommandData
} from './aries-command'
import {
  setAriesAgentUrl,
  isAlive,
  generatedDID,
  getPublicDID,
  setPublicDID
} from '../aries-wrapper'
import {initialiseMasterSchemas} from "../schemas/master-schemas";

export enum AppType {
  USER = 'user',
  MASTER = 'master'
}
export enum ConfigState {
  InitialConfigMissing,
  WaitingForAries,
  WaitingForPublicDID,
  WaitingForInitialisation
}

export interface InitialisationData {
  appType: AppType
  masterDID?: string
  label?: string
}

export class Config {
  private static _instance: Config|undefined
  static get instance() {
    if (!this._instance) this._instance = new Config()
    return this._instance
  }
  private constructor() { }

  private appType: AppType|undefined
  private configState = ConfigState.InitialConfigMissing
  private masterDID: string|undefined
  private label: string|undefined
  private ariesCommand: AriesCommand|undefined

  getAppType() {
    if (!this.appType) throw new Error(`No app type`)
    return this.appType
  }

  getConfigState() {
    return this.configState
  }

  getMasterDID() {
    if (this.masterDID === undefined) throw new Error(`No master did`)
    return this.masterDID
  }

  getLabel() {
    if (!this.label) throw new Error(`No label`)
    return this.label
  }

  setInitialConfig(config: AriesCommandData) {
    this.ariesCommand = new AriesCommand(config)
    this.configState = ConfigState.WaitingForAries
  }

  getAriesCommand() {
    if (!this.ariesCommand) throw new Error(`No aries command`)
    return this.ariesCommand.command
  }

  async connectToAries(ariesAPIUrl: string) {
    setAriesAgentUrl(ariesAPIUrl)
    await isAlive(true)
    this.configState = ConfigState.WaitingForPublicDID
  }

  async createDID() {
    return await generatedDID()
  }

  async hasPublicDID() {
    return await getPublicDID() !== undefined
  }

  async setPublicDID(did: string) {
    await setPublicDID(did)
    this.configState = ConfigState.WaitingForInitialisation
  }

  async initialise(data: InitialisationData) {
    this.appType = data.appType
    if (this.getAppType() === AppType.USER) {
      if (data.masterDID === undefined || data.label === undefined) {
        throw new Error(`Missing required data for user initialisation`)
      }
      this.masterDID = data.masterDID
      this.label = data.label
    }
    if (this.getAppType() === AppType.MASTER) {
      await initialiseMasterSchemas()
    } else {
      //
    }
  }
}
