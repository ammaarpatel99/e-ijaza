import {spawn} from 'child_process'
import {AppType, FullInitialisationData, State} from '../src/types/interface-api'
import {repeatWithBackoff} from '../src/utils'
import axios from "axios";

export class ApplicationWrapper {
  private static _PORT = 4000
  private static get PORT() {
    const port = this._PORT
    this._PORT++
    return port
  }
  private static _AGENT_PORT = 5000
  private static get AGENT_PORT() {
    const port = this._AGENT_PORT
    this._AGENT_PORT++
    return port
  }

  private readonly port
  private readonly agentPort
  private _did: string | undefined
  get did() {
    if (!this._did) throw new Error(`Getting did for ${this.name} but doesn't exist`)
    return this._did
  }

  protected get apiURL() {
    return `http://host.docker.internal:${this.port}/api`
  }

  constructor(readonly name: string) {
    this.port = ApplicationWrapper.PORT
    this.agentPort = ApplicationWrapper.AGENT_PORT
  }

  startApplication() {
    const childProcess = spawn('/bin/bash', [
      '-c',
      [
        'docker run -itd',
        `--name "${this.name}"`,
        `-p "${this.port}:${this.port}" -p "${this.agentPort}:${this.agentPort}"`,
        `-e PORT="${this.port}"`,
        `-e ARIES_PORT="${this.agentPort}"`,
        `-e ARIES_ADMIN_PORT="10000"`,
        `-e WEBHOOK_URL="localhost:${this.port}/webhook"`,
        `-v "$(pwd)/logs/${this.name}:/home/indy/logs"`,
        `e_ijaza_app`
      ].join(' ')
    ])
    childProcess.stdout.on('data', (data: any) => {
      process.stdout.write(this.name + ':\n')
      process.stdout.write(data + '\n')
    })
    childProcess.stderr.on('data', (data: any) => {
      process.stderr.write(this.name + ':\n')
      process.stderr.write(data + '\n')
    })
  }

  async initialise(controllerDID?: string) {
    const _data: Omit<FullInitialisationData, 'controllerDID' | 'appType'> = {
      advertisedEndpoint: `http://host.docker.internal:${this.agentPort}`,
      genesisURL: `http://host.docker.internal:9000/genesis`,
      tailsServerURL: `http://host.docker.internal:6543`,
      vonNetworkURL: `http://host.docker.internal:9000`
    }
    const data: FullInitialisationData = !!controllerDID
      ? {..._data, controllerDID, appType: AppType.USER, name: this.name}
      : {..._data, appType: AppType.CONTROLLER}
    await axios.post(`${this.apiURL}/state/fullInitialisation`, data)
    const initData = await repeatWithBackoff({
      initialTimeout: 2000,
      exponential: false,
      backoff: 10 * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.post<State.UpdateRes>(
          `${this.apiURL}/state/update`, {timestamp: 0} as State.UpdateReq
        )
        if (data.state !== State.InitialisationState.COMPLETE) {
          return {success: false}
        }
        return {success: true, value: data}
      },
      failCallback: () => {
        throw new Error(`failed to initialise agent: ${this.name}`)
      }
    })
    if (!initData.value) throw new Error(`error in initialising agent: ${this.name}; reached invalid state`)
    this._did = initData.value.did
  }

  stopApplication() {
    const childProcess = spawn('/bin/bash', [
      '-c', `docker stop ${this.name}`
    ])
    childProcess.stdout.on('data', (data: any) => {
      process.stdout.write(this.name + ' STOP:\n')
      process.stdout.write(data + '\n')
    })
    childProcess.stderr.on('data', (data: any) => {
      process.stderr.write(this.name + ' STOP:\n')
      process.stderr.write(data + '\n')
    })
  }
}
