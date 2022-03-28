import {InternalSubjectOntology} from "@server/subject-ontology/internal-subject-ontology";
import {
  getHeldCredentials,
  deleteCredential,
  proposeCredential,
  connectViaPublicDID,
  requestCredentialFromOffer
} from "@server/aries-wrapper";
import {subjectSchema, subjectsSchema} from "@server/schemas";
import {SubjectSchema, SubjectsSchema} from "@project-types";
import {WebhookMonitor} from "@server/webhook/webhook-monitor";
import {Config} from "@server/config";
import {V10CredentialExchange} from "@project-types/aries-types";
import {getCredentialBySchema} from "@server/aries-wrapper/utils";
import {UserMasterCredentials} from "@server/teaching-credentials";

export class UserSubjectOntology {
  private static _instance: UserSubjectOntology|undefined
  static get instance() {
    if (!this._instance) this._instance = new UserSubjectOntology()
    return this._instance
  }
  private constructor() { }

  private readonly subjectOntology = InternalSubjectOntology.instance
  private credentialsSearchKey: string|undefined
  private masterCredentialsSearchKey: string|undefined
  readonly testSearch = this.subjectOntology.testSearch.bind(this.subjectOntology)

  getSubjectOntology() {
    const subjects = this.subjectOntology.getSubjects()
    return subjects.map(subject => this.subjectOntology.getSubjectData(subject)!)
  }

  async loadSubjects() {
    this.subjectOntology.flushSearches()
    const cred = await getCredentialBySchema(subjectsSchema.schemaID)
    if (cred) {
      this.subjectOntology.setSubjects(...JSON.parse(cred.attrs!['subjects']) as string[])
    } else {
      await this.getSubjects()
    }
    await Promise.all(this.subjectOntology.getSubjects().map(subject => this.loadSubject(subject)))
    this.subjectOntology.flushSearches()
  }

  async getSubjects() {
    this.subjectOntology.flushSearches()
    await this.deleteHeldSubjectsCredentials()
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})

    const res = await proposeCredential({
      schema_id: subjectsSchema.schemaID,
      auto_remove: false,
      connection_id: connectionID,
      credential_proposal: {
        attributes: [{
          name: 'subjects',
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

    const subjects: SubjectsSchema['subjects'] = JSON.parse(cred.credential!.attrs!['subjects'])
    this.subjectOntology.setSubjects(...subjects)
    this.subjectOntology.flushSearches()
  }

  private async deleteHeldSubjectsCredentials() {
    const promises = (await getHeldCredentials({})).results
      ?.filter(cred => cred.schema_id === subjectsSchema.schemaID)
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    if (promises) await Promise.all(promises)
  }

  async loadSubject(subject: string) {
    this.subjectOntology.flushSearches()
    if (!this.subjectOntology.hasSubject(subject)) throw new Error(`trying to load non-existent subject`)
    const cred = (await getCredentialBySchema(
      subjectSchema.schemaID,
      credAttrs => JSON.parse(credAttrs['subject']).name === subject))
    if (cred) {
      const data: SubjectSchema['subject'] = JSON.parse(cred.attrs!['subject'])
      this.subjectOntology.setSubjectData(data.name, data.children, data.componentSets)
    } else {
      await this.getSubjectData(subject)
    }
    this.subjectOntology.flushSearches()
  }

  private async getSubjectData(subject: string) {
    if (!this.subjectOntology.hasSubject(subject)) throw new Error(`Subject doesn't exist`)
    await this.deleteHeldSubjectDataCredentials(subject)
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})

    const res = await proposeCredential({
      schema_id: subjectSchema.schemaID,
      auto_remove: false,
      connection_id: connectionID,
      credential_proposal: {
        attributes: [{
          name: 'subject',
          value: subject
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

    const subjectData: SubjectSchema['subject'] = JSON.parse(cred.credential!.attrs!['subject'])
    this.subjectOntology.setSubjectData(subjectData.name, subjectData.children, subjectData.componentSets)
  }

  private async deleteHeldSubjectDataCredentials(subject: string) {
    const promises = (await getHeldCredentials({})).results
      ?.filter(cred => cred.schema_id === subjectSchema.schemaID)
      .filter(cred => JSON.parse(cred.attrs!['subject']).name === subject)
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    if (promises) await Promise.all(promises)
  }

  async getAllSubjectsData() {
    this.subjectOntology.flushSearches()
    await Promise.all(this.subjectOntology.getSubjects().map(subject => this.getSubjectData(subject)))
    this.subjectOntology.flushSearches()
  }


  async reachFromCredentials(subject: string) {
    if (!(this.credentialsSearchKey && this.subjectOntology.hasSearchKey(this.credentialsSearchKey))) {
      const credentials = [...UserMasterCredentials.instance.credentials.keys()]
      this.credentialsSearchKey = await this.subjectOntology.fullSearch(credentials)
    }
    return this.subjectOntology.checkSubjectInSearch(this.credentialsSearchKey, subject)
  }

  async reachFromMasterCredentials(subject: string) {
    if (!(this.masterCredentialsSearchKey && this.subjectOntology.hasSearchKey(this.masterCredentialsSearchKey))) {
      const credentials: string[] = [...UserMasterCredentials.instance.masterCredentials.keys()]
      this.masterCredentialsSearchKey = await this.subjectOntology.fullSearch(credentials)
    }
    return this.subjectOntology.checkSubjectInSearch(this.masterCredentialsSearchKey, subject)
  }
}
