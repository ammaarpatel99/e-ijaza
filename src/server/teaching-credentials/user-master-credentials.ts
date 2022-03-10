import {
  getHeldCredentials,
  deleteCredential,
  connectViaPublicDID,
  proposeCredential,
  requestCredentialFromOffer, requestProof, rejectProof, presentProof, issueCredential
} from "@server/aries-wrapper";
import {MastersPublicSchema} from "@project-types";
import {mastersPublicSchema, teachingSchema} from "@server/schemas";
import {getCredentialBySchema, getCredentialsBySchema} from "@server/aries-wrapper/utils";
import {Config} from "@server/config";
import {WebhookMonitor} from "@server/webhook/webhook-monitor";
import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";
import {UserSubjectOntology} from "@server/subject-ontology";


export class UserMasterCredentials {
  static readonly instance = new UserMasterCredentials()
  private constructor() { }

  private readonly masters = new Map<string, MastersPublicSchema['credentials'][string]>()
  private _masterTeachingCredID: string|undefined
  private readonly _credentials = new Map<string, string>()
  private readonly _masterCredentials = new Map<string, string>()

  get masterTeachingCredID() {
    if (!this._masterTeachingCredID) throw new Error(`No cred def id for master teaching credentials`)
    return this._masterTeachingCredID
  }

  set masterTeachingCredID(cred_def_id: string) {
    if (this._masterTeachingCredID) throw new Error(`cred def id for master teaching credentials already set`)
    this._masterTeachingCredID = cred_def_id
  }

  get masterCredentials() {
    return this._masterCredentials as ReadonlyMap<string, string>
  }

  get credentials() {
    return this._credentials as ReadonlyMap<string, string>
  }

  get _masters() {
    return this.masters
  }

  async loadDataCredentials() {
    const cred = await getCredentialBySchema(mastersPublicSchema.schemaID)
    if (cred) {
      Object.entries(JSON.parse(cred.attrs!['credentials']) as MastersPublicSchema['credentials'])
        .forEach(data => this.masters.set(...data))
    } else {
      this.masters.clear()
      await this.getDataCredentials()
    }
  }

  async getDataCredentials() {
    await this.deleteHeldDataCredentials()
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})

    const res = await proposeCredential({
      schema_id: mastersPublicSchema.schemaID,
      auto_remove: false,
      connection_id: connectionID,
      credential_proposal: {
        attributes: [{
          name: 'credentials',
          value: ''
        }]
      }
    })

    const cred = await WebhookMonitor.instance.monitorCredentialExchange<V10CredentialExchange, any>(
      res.credential_exchange_id!, async (result, resolve, reject) => {
        if (result.state === 'offer_received') {
          requestCredentialFromOffer({cred_ex_id: res.credential_exchange_id!}).catch(reject)
        } else if (result.state === 'credential_acked') {
          resolve(result)
        }
      })

    this.masters.clear()
    Object.entries(JSON.parse(cred.credential!.attrs!['credentials']) as MastersPublicSchema['credentials'])
      .forEach(data => this.masters.set(...data))
  }

  private async deleteHeldDataCredentials() {
    await Promise.all((await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === mastersPublicSchema.schemaID)
      .map(cred => deleteCredential({credential_id: cred.referent!})))
  }

  async loadCredentials() {
    const creds = await getCredentialsBySchema(teachingSchema.schemaID)
    creds.forEach(({attrs, referent, cred_def_id}) => {
      if (!attrs || typeof attrs['subject'] !== "string") throw new Error(`Invalid teaching credential`)
      const subject = attrs['subject']
      this._credentials.set(subject, referent!)
      if (cred_def_id === this.masterTeachingCredID) this._masterCredentials.set(subject, referent!)
    })
  }

  async validateReceivedCredential() {
    // check subject is valid
    // if from master just accept
    // if not from master request proof that issuer has right to issue
  }

  async requestAndProveCredentials(did: string, subject: string) {
    let queue: {did: string, subject: string}[] = [{did, subject}]
    const checked = new Set<string>() // did-string
    const addToQueue = ({did, subject}: {did: string, subject: string}) => {
      const id = `${did}=${subject}`
      if (checked.has(id)) return
      queue.push({did, subject})
      checked.add(id)
    }
    while (queue.length > 0) {
      const _queue = [...queue]
      queue = []
      const res = await Promise.all(_queue.map(async aim => {
        const connection_id = await connectViaPublicDID({their_public_did: did})
        const subjects = await this.requestProofForSubjects(connection_id, aim)
        if (!await UserSubjectOntology.instance.testSearch(subjects, aim.subject)) return false;
        const data = await this.requestProofForCredentials(connection_id, {did: aim.did, subjects})
        data.filter(x => x.credDefID !== this.masterTeachingCredID)
          .map(x => ({did: x.credDefID.split(':')[0], subject: x.subject}))
          .forEach(x => addToQueue(x))
        return true
      }))
      if (!res.every(x => x)) return false
    }
    return true
  }

  private async requestProofForSubjects(connection_id: string, {did, subject}: {did: string, subject: string}) {
    let {presentation_exchange_id} = await requestProof({
      connection_id,
      proof_request: {
        name: 'Authorization - Subjects to Prove Subject',
        requested_attributes: { subject: { name: subject } }
      }
    })
   return await WebhookMonitor.instance.monitorProofPresentation<string[], string>(presentation_exchange_id!,
      (result, resolve, reject) => {
        if (result.state == 'presentation_received') {
          const attrs = result.presentation?.requested_proof?.self_attested_attrs
          if (attrs && 'subject' in attrs) {
            resolve(JSON.parse(attrs['subject']))
          }
          reject(`Invalid proof result`)
        }
      })
  }

  async replyToProofForSubjects(data: V10PresentationExchange) {
    const attrs = data.presentation_request?.requested_attributes
    if (!(attrs && 'subject' in attrs && attrs['subject'].name))
      return rejectProof({pres_ex_id: data.presentation_exchange_id!}, {description: 'missing key fields'})
    const subject = attrs['subject'].name
    let subjects = await UserSubjectOntology.instance.reachFromCredentials(subject);
    subjects = [...this.credentials.keys()].filter(subject => subjects?.includes(subject))
    await presentProof({pres_ex_id: data.presentation_exchange_id!}, {
      self_attested_attributes: {
        subject: JSON.stringify(subjects)
      },
      requested_attributes: {},
      requested_predicates: {}
    })
  }

  private async requestProofForCredentials(connection_id: string, {did, subjects}: {did: string, subjects: string[]}) {
    const {presentation_exchange_id} = await requestProof({
      connection_id,
      proof_request: {
        name: `Authorization - Credentials to Prove Subjects`,
        requested_attributes: Object.fromEntries(subjects.map(subject => [subject, {
          name: 'subject',
          restrictions: [{
            schema_id: teachingSchema.schemaID,
            [`attr::${subject}::value`]: subject
          }]
        }]))
      }
    })
    return await WebhookMonitor.instance.monitorProofPresentation<{subject: string, credDefID: string}[], any>(presentation_exchange_id!,
      (result, resolve, reject) => {
        if (result.state === 'verified') {
          const attrs = result.presentation_proposal_dict?.presentation_proposal.attributes
          if (!attrs) reject('Invalid proof result')
          const _subjects = subjects
            .map(subject => attrs?.filter(x => x.value === subject)?.shift())
            .filter(x => x)
            .map(x => ({subject: x!.value!, credDefID: x!.cred_def_id!}))
          if (subjects.length !== _subjects.length) reject('Invalid proof result')
          else resolve(_subjects)
        }
      })
  }

  async replyToProofForCredentials(data: V10PresentationExchange) {
    const attrs = data.presentation_request?.requested_attributes
    const reject = () => rejectProof({pres_ex_id: data.presentation_exchange_id!}, {description: 'missing key fields'})
    if (!attrs) return reject()
    const res: {[key: string]: { cred_id: string }} = {}
    for (const [subject, value] of Object.entries(attrs)) {
      const credRefID = this.credentials.get(subject)
      if (!credRefID) return reject()
      res[subject] = {cred_id: credRefID}
    }
    await presentProof({pres_ex_id: data.presentation_exchange_id!}, {
      requested_predicates: {},
      self_attested_attributes: {},
      requested_attributes: res
    })
  }

  async issueCredential(did: string, subject: string) {
    const res = await UserSubjectOntology.instance.reachFromCredentials(subject)
    if (res === undefined) throw new Error(`Can't issue credential in unreachable subject`)
    const connectionID = await connectViaPublicDID({their_public_did: did})
    return issueCredential({
      connection_id: connectionID,
      auto_remove: false,
      cred_def_id: teachingSchema.credID,
      credential_proposal: {
        attributes: [{
          name: 'subject',
          value: subject
        }]
      }
    })
  }
}
