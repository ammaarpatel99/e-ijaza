import {AriesCommand} from './aries-command'
import {createDID, getPublicDID, isAlive, setAriesAgentUrl, setPublicDID} from '../aries-wrapper'
import {initialiseMasterSchemas, initialiseUserSchemas} from "../schemas";
import {AppType, AriesCommandData, ConfigState, InitialisationData} from "@project-types";
import {MasterSubjectOntology, MasterSubjectProposals, UserSubjectOntology} from "../subject-ontology";
import {MasterCredentials, MasterCredentialsProposals, UserMasterCredentials} from "../teaching-credentials";
import {UserSubjectProposals} from "../subject-ontology/user-subject-proposals";


export class Config {
  static readonly instance = new Config()
  private constructor() { }

  private appType: AppType|undefined
  private configState = ConfigState.InitialConfigMissing
  private masterDID: string|undefined
  private publicDID: string|undefined
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

  getPublicDID() {
    if (this.publicDID === undefined) throw new Error(`No public did to get`)
    return this.publicDID
  }

  getLabel() {
    if (this.appType === AppType.MASTER) return 'root-of-trust'
    if (!this.label) throw new Error(`No label`)
    return this.label
  }

  setInitialConfig(config: AriesCommandData) {
    if (this.configState !== ConfigState.InitialConfigMissing) {
      throw new Error(`Incorrect state for setting initial config`)
    }
    this.ariesCommand = new AriesCommand(config)
    this.configState = ConfigState.WaitingForAries
  }

  getAriesCommand() {
    if (this.configState !== ConfigState.WaitingForAries) {
      throw new Error(`Incorrect state for getting aries command`)
    }
    if (!this.ariesCommand) throw new Error(`No aries command`)
    return this.ariesCommand.command
  }

  async connectToAries(ariesAPIUrl: string) {
    if (this.configState > ConfigState.WaitingForAries) {
      throw new Error(`Incorrect state for connecting to aries`)
    }
    setAriesAgentUrl(ariesAPIUrl)
    await isAlive(true)
    this.configState = ConfigState.WaitingForPublicDID

    const publicDID = await Config.fetchPublicDID(false)
    if (publicDID) {
      this.publicDID = publicDID
      this.configState = ConfigState.WaitingForInitialisation
    }
  }

  async createDID() {
    if (this.configState !== ConfigState.WaitingForPublicDID) {
      throw new Error(`Incorrect state for creating did`)
    }
    const res = await createDID({})
    return {
      did: res.result?.did!,
      verkey: res.result?.verkey!
    }
  }

  private static async fetchPublicDID(throwIfUndefined: boolean = true) {
    const {result} = await getPublicDID()
    const did = result?.did
    if (throwIfUndefined && !did) throw new Error(`No public did`)
    return did
  }

  async setPublicDID(did: string) {
    if (this.configState !== ConfigState.WaitingForPublicDID) {
      throw new Error(`Incorrect state for setting public did`)
    }
    await setPublicDID({did})
    this.publicDID = did
    this.configState = ConfigState.WaitingForInitialisation
  }

  async initialise(data: InitialisationData) {
    if (this.configState !== ConfigState.WaitingForInitialisation) {
      throw new Error(`Incorrect state for initialising`)
    }
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
      await MasterSubjectOntology.instance.loadSubjects()
      await MasterSubjectProposals.instance.loadProposals()
      await MasterCredentials.instance.loadDataCredentials()
      await MasterCredentialsProposals.instance.loadProposals()
    } else {
      await initialiseUserSchemas()
      await UserSubjectOntology.instance.loadSubjects()
      await UserSubjectProposals.instance.loadProposalVotes()
      await UserMasterCredentials.instance.loadDataCredentials()
      await UserMasterCredentials.instance.loadCredentials()
    }
    this.configState = ConfigState.Initialised
  }
}
