import {Schema} from "../../schemas/schema";
import {HeldCredential, getHeldCredentials} from '../../aries-wrapper'
import {Master} from "./master";
import {deleteCredential} from "../../aries-wrapper/delete-credential";

type DID = string
type Subject = string
type CredRef = string

enum Action {
  ADD = 'add',
  REMOVE = 'remove'
}

interface InternalSchema {
  credentials: [DID, [Subject, CredRef][]][]
}

interface PublicSchema {
  credentials: [DID, Subject[]][]
}

interface ProposalSchema {
  did: DID
  subject: Subject
  action: Action
  votes: [DID, boolean | CredRef][]
}

interface VoteSchema {
  did: DID
  subject: Subject
  action: Action
  voterDID: DID
}

export class Masters {
  private static _instance: Masters|undefined
  static get instance() {
    if (!this._instance) this._instance = new Masters()
    return this._instance
  }
  private constructor() { }

  readonly internalSchema = new Schema('InternalMasterCredentials', ['credentials'], true)
  readonly publicSchema = new Schema('MasterCredentials', ['credentials'], true)
  readonly proposalSchema = new Schema('MasterCredentialProposal', ['credentials'], true)
  readonly voteSchema = new Schema('MasterCredentialVote', ['credentials'], true)
  private masters = new Map<string, Master>()
  private internalCredID: string|undefined

  async loadCredentials() {
    const creds = (await getHeldCredentials())
      .filter(cred => cred.schema_id === this.internalSchema.getSchemaID()) as HeldCredential<InternalSchema>[]
    if (creds.length === 0) {
      await this.updateInternalCredential()
    }
    creds[0].attrs.credentials.forEach(cred => this.masters.set(cred[0], new Master(cred[0], cred[1])))
  }

  async updateInternalCredential() {
    if (this.internalCredID !== undefined) {
      await deleteCredential(this.internalCredID)
    }
    // TODO: issue credentia
  }
}
