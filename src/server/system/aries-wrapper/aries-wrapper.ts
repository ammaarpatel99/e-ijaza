import axios from "axios";
import {repeatWithBackoff} from "../utils";
import {DidDetails} from './did-details'
import {Config} from '../config'
import {ProofRequest} from './proof-request'
import {Proof} from './proof'

export class AriesWrapper {
  private static _instance: AriesWrapper | undefined
  static get instance() {
    if (this._instance === undefined) {
      this._instance = new AriesWrapper()
    }
    return this._instance
  }
  private constructor() { }

  async generateDID(): Promise<DidDetails> {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.post(`${ariesURL}/wallet/did/create`, {})
    return {
      did: data.result.did,
      verkey: data.result.verkey
    }
  }

  async setPublicDID(did: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.get(`${ariesURL}/wallet/did?did=${did}`)
    if (!data?.results[0]?.did) {
      throw new Error(`DID doesn't exist so can't be made public`)
    }
    if (data.results?.posture === 'posted') return
    await axios.post(`${ariesURL}/wallet/did/public?did=${did}`)
  }

  async getPublicDID() {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.get(`${ariesURL}/wallet/did/public`)
    if (data.result === null) {
      return data.result as null
    } else {
      return data.result.did as string
    }
  }

  async isAlive() {
    const ariesURL = Config.instance.ariesAgentUrl
    try {
      const {data} = await axios.get(`${ariesURL}/status/live`)
      return data.alive === true;
    } catch {
      return false
    }
  }

  async createSchema(name: string, attributes: string[]) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.post(`${ariesURL}/schemas`, {schema_name: name, attributes, schema_version: "1.0"})
    return data.schema_id as string
  }

  async getSchemaID(name: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.get(`${ariesURL}/schemas/created?schema_name=${name}`)
    if (!data?.schema_ids[0]) {
      throw new Error(`Schema ${name} doesn't exist`)
    }
    return data.schema_ids[0] as string
  }

  async connectViaPublicDID(did: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.post(`${ariesURL}/didexchange/create-request?their_public_did=did:sov:${did}`)
    const connectionID = data.connection_id as string
    await repeatWithBackoff<null>({
      failCallback: async () => {
        await this.deleteConnection(connectionID)
        throw new Error(`Could not connect by public DID`)
      },
      callback: async () => {
        const {data} = await axios.get(`${ariesURL}/connections/${connectionID}`)
        return [data.rfc23_state === 'completed', null]
      }
    })
    return connectionID
  }

  async deleteConnection(connectionID: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    await axios.delete(`${ariesURL}/connections/${connectionID}`)
  }

  async requestProof(connectionID: string, request: ProofRequest) {
    const ariesURL = Config.instance.ariesAgentUrl
    let {data} = await axios.post(`${ariesURL}/present-proof-2.0/send-request`, request)
    return data.pres_ex_id as string
  }

  async getProof(pres_ex_id: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.get(`${ariesURL}/present-proof-2.0/records/${pres_ex_id}`)
    return data as Proof
  }

  async deleteProof(pres_ex_id: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    await axios.delete(`${ariesURL}/present-proof-2.0/records/${pres_ex_id}`)
  }

  async createCredentialDefinition(schemaID: string, tag: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.post(`${ariesURL}/credential-definitions`, {
      revocation_registry_size: 1000,
      schema_id: schemaID,
      support_revocation: true,
      tag
    })
    return data.credential_definition_id as string
  }

  async getCredentialDefinitionID(schemaID: string) {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.get(`${ariesURL}/credential-definitions/created?schema_id=${schemaID}`)
    if (!data?.credential_definition_ids[0]) {
      throw new Error(`Credential Definition with schema ID ${schemaID} doesn't exist`)
    }
    return data.credential_definition_ids[0] as string
  }

  async connectToSelf() {
    const ariesURL = Config.instance.ariesAgentUrl
    const {data} = await axios.post(`${ariesURL}/connections/create-invitation`, {})
    await axios.post(`${ariesURL}/connections/receive-invitation`, data.invitation)
    const connectionID = data.connection_id

    await repeatWithBackoff<null>({
      failCallback: async () => {
        await this.deleteConnection(connectionID)
        throw new Error(`Could not connect to self`)
      },
      callback: async () => {
        const {data} = await axios.get(`${ariesURL}/connections/${connectionID}`)
        console.log('here')
        console.log(data)
        console.log('here')
        return [data.rfc23_state === 'response-received' || data.rfc23_state === 'response-sent', null]
      }
    })
    return connectionID
  }

  // FIXME: improve the below functions, including adding typings

  // async sendProof(pres_ex_id: string, proof: any) {
  //   const ariesURL = Config.instance.ariesAgentUrl
  //   await axios.post(`${ariesURL}/present-proof-2.0/records/${pres_ex_id}/send-presentation`, proof)
  // }
  //
  // async getCredentialsByDef(credDef: string) {
  //   const ariesURL = Config.instance.ariesAgentUrl
  //   const {data} = await axios.get(`${ariesURL}/credentials`);
  //   return (data.results as any[]).filter(x => x.cred_def_id === credDef)
  // }
  //
  // async getCredentialsBySchema(schemaID: string) {
  //   const ariesURL = Config.instance.ariesAgentUrl
  //   const {data} = await axios.get(`${ariesURL}/credentials`);
  //   return (data.results as any[]).filter(x => x.schema_id === schemaID)
  // }
  //
  // async issueCredential(body: any) {
  //   const ariesURL = Config.instance.ariesAgentUrl
  //   const {data} = await axios.post(`${ariesURL}/issue-credential/send`, body)
  // }
}
