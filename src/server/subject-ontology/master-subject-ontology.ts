import {InternalSubjectOntology} from "./internal-subject-ontology";
import {
  deleteCredential,
  deleteIssuedCredential,
  getHeldCredentials,
  getIssuedCredentials,
  issueCredential,
  offerCredentialFromProposal,
  revokeCredential
} from "@server/aries-wrapper";
import {subjectSchema, subjectsSchema} from "@server/schemas";
import {connectToSelf} from "@server/utils";
import {
  SubjectSchema,
  SubjectsSchema
} from "@project-types";
import {V10CredentialExchange} from "@project-types/aries-types";
import {getCredentialBySchema} from "@server/aries-wrapper/utils";
import {WebhookMonitor} from "@server/webhook";


export class MasterSubjectOntology {
  static readonly instance = new MasterSubjectOntology()
  private constructor() { }

  private readonly subjectOntology = InternalSubjectOntology.instance
  readonly testSearch = this.subjectOntology.testSearch

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
      this.subjectOntology.setSubjects('knowledge')
      await this.saveSubjects()
    }
    this.subjectOntology.getSubjects().map(subject => this.loadSubject(subject))
    this.subjectOntology.flushSearches()
  }

  async saveSubjects() {
    await Promise.all([this.revokeSubjectsCredentials(), this.deleteHeldSubjectsCredentials()])
    const selfConnectControls = await connectToSelf()
    const data: SubjectsSchema['subjects'] = this.subjectOntology.getSubjects()
    const {credential_exchange_id} = await issueCredential({
      cred_def_id: subjectsSchema.credID,
      connection_id: selfConnectControls.connectionID,
      auto_remove: true,
      credential_proposal: {
        attributes: [{
          name: 'subjects',
          value: JSON.stringify(data)
        }]
      }
    })
    await WebhookMonitor.instance.monitorCredentialExchange<void, any>(
      credential_exchange_id!,
      async (result, resolve, reject) => {
        if (result.state === 'credential_acked') {
          await selfConnectControls.close()
          resolve()
        }
      })
  }

  private async revokeSubjectsCredentials() {
    const promises = (await getIssuedCredentials({role: 'issuer', state: 'credential_acked'})).results!
      .filter(cred => cred.schema_id === subjectsSchema.schemaID)
      .map(async cred => {
        await revokeCredential({
          cred_ex_id: cred.credential_exchange_id!,
          connection_id: cred.connection_id!,
          publish: true,
          notify: true
        })
        await deleteIssuedCredential({cred_ex_id: cred.credential_exchange_id!})
      })
    await Promise.all(promises)
  }

  private async deleteHeldSubjectsCredentials() {
    const promises = (await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === subjectsSchema.schemaID)
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    await Promise.all(promises)
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
      await this.saveSubjectData(subject)
    }
    this.subjectOntology.flushSearches()
  }

  async saveSubjectData(subject: string) {
    const subjectData = this.subjectOntology.getSubjectData(subject)
    if (!subjectData) throw new Error(`Trying to save non-existent subject`)
    await Promise.all([this.revokeSubjectDataCredentials(subject), this.deleteHeldSubjectDataCredentials(subject)])
    const selfConnectControls = await connectToSelf()
    const {credential_exchange_id} = await issueCredential({
      connection_id: selfConnectControls.connectionID,
      cred_def_id: subjectSchema.credID,
      auto_remove: true,
      credential_proposal: {
        attributes: [{
          name: 'subject',
          value: JSON.stringify(subjectData)
        }]
      }
    })
    await WebhookMonitor.instance.monitorCredentialExchange<void, any>(
      credential_exchange_id!,
      async (result, resolve, reject) => {
        if (result.state === 'credential_acked') {
          await selfConnectControls.close()
          resolve()
        }
      })
  }

  private async revokeSubjectDataCredentials(subject: string) {
    const promises = (await getIssuedCredentials({role: 'issuer', state: 'credential_acked'})).results!
      .filter(cred => cred.schema_id === subjectSchema.schemaID)
      .filter(cred => JSON.parse(cred.credential!.attrs!['subject']).name === subject)
      .map(async cred => {
        await revokeCredential({
          cred_ex_id: cred.credential_exchange_id!,
          connection_id: cred.connection_id!,
          publish: true,
          notify: true
        })
        await deleteIssuedCredential({cred_ex_id: cred.credential_exchange_id!})
      })
    await Promise.all(promises)
  }

  private async deleteHeldSubjectDataCredentials(subject: string) {
    const promises = (await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === subjectSchema.schemaID)
      .filter(cred => JSON.parse(cred.attrs!['subject']).name === subject)
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    await Promise.all(promises)
  }

  async issueSubjectCredential(cred_ex_id: string) {
    const data: SubjectsSchema['subjects'] = this.subjectOntology.getSubjects()
    await offerCredentialFromProposal({cred_ex_id}, {
      counter_proposal: {
        cred_def_id: subjectsSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'subjects',
            value: JSON.stringify(data)
          }]
        }
      },
    })
  }

  async issueSubjectDataCredential(data: V10CredentialExchange) {
    const subjectName = data.credential!.attrs!['subject']
    if (this.subjectOntology.hasSubject(subjectName)) {
      throw new Error(`can't issue credential for non-existent subject`)
    }
    const subjectData: SubjectSchema['subject'] = this.subjectOntology.getSubjectData(subjectName)!
    await offerCredentialFromProposal({cred_ex_id: data.credential_exchange_id!}, {
      counter_proposal: {
        cred_def_id: subjectSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'subject',
            value: JSON.stringify(subjectData)
          }]
        }
      },
    })
  }
}
