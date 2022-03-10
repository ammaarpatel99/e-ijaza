import {
  getHeldCredentials,
  deleteCredential,
  issueCredential,
  getIssuedCredentials,
  revokeCredential,
  deleteIssuedCredential,
  offerCredentialFromProposal, connectViaPublicDID
} from "@server/aries-wrapper";
import {MastersInternalSchema, MastersPublicSchema} from "@project-types";
import {mastersInternalSchema, mastersPublicSchema, teachingSchema} from "@server/schemas";
import {connectToSelf} from "@server/utils";
import {getCredentialBySchema} from "@server/aries-wrapper/utils";
import {MasterSubjectProposals} from "@server/subject-ontology";


export class MasterCredentials {
  static readonly instance = new MasterCredentials()
  private constructor() { }

  private readonly _credentials = new Map<string, MastersInternalSchema['credentials'][string]>()
  private internalCredID: string|undefined

  get credentials(): ReadonlyMap<string, MastersInternalSchema['credentials'][string]> {
    return this._credentials
  }

  async loadDataCredentials() {
    const cred = await getCredentialBySchema(mastersInternalSchema.schemaID)
    if (cred) {
      this.internalCredID = cred.referent
      Object.entries(JSON.parse(cred.attrs!['credentials']) as MastersInternalSchema['credentials'])
        .forEach(data => this._credentials.set(...data))
    } else {
      this._credentials.clear()
      await this.saveDataCredentials()
    }
  }

  async saveDataCredentials() {
    await Promise.all([this.deleteHeldDataCredentials(), this.revokeIssuedDataCredentials()])
    const connectionControls = await connectToSelf()
    const internalData = Object.fromEntries(this._credentials.entries())
    await issueCredential({
      connection_id: connectionControls.connectionID,
      auto_remove: true,
      cred_def_id: mastersInternalSchema.credID,
      credential_proposal: {
        attributes: [{
          name: 'credentials',
          value: JSON.stringify(internalData)
        }]
      }
    })
    await connectionControls.close()
  }

  private async deleteHeldDataCredentials() {
    await Promise.all((await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === mastersInternalSchema.schemaID)
      .map(cred => deleteCredential({credential_id: cred.referent!})))
  }

  private async revokeIssuedDataCredentials() {
    const promises = (await getIssuedCredentials({role: 'issuer', state: 'credential_acked'})).results!
      .filter(cred => cred.schema_id === mastersPublicSchema.schemaID)
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

  async issueDataCredential(cred_ex_id: string) {
    const data: MastersPublicSchema['credentials'] = Object.fromEntries(
      [...this._credentials.entries()].map(([did, data]) => [did, data.map(x => x.subject)])
    )
    await offerCredentialFromProposal({cred_ex_id}, {
      counter_proposal: {
        cred_def_id: mastersPublicSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'credentials',
            value: JSON.stringify(data)
          }]
        }
      },
    })
  }

  async onDeletedSubject(subject: string) {
    const changed = [...this._credentials.entries()]
      .map(([did, data]) => ({
        did,
        cred: data.filter(x => x.subject === subject).shift()
      }))
      .filter(({cred}) => cred)
      .map(async ({did, cred}) => {
        await this.revokeCredential(cred!)
        return did
      })
    const updatedVoters = (await Promise.all(changed)).map(did => ({
      did,
      subjects: this._credentials.get(did)!.map(x => x.subject)
    }))
    await MasterSubjectProposals.instance.updateVoters(updatedVoters)
  }

  private async revokeCredential(credData: MastersInternalSchema['credentials'][string][number]) {
    await revokeCredential({
      publish: true,
      notify: true,
      connection_id: credData.connection_id,
      cred_ex_id: credData.cred_ex_id
    })
  }

  private async issueCredential(did: string, subject: string) {
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

  async addCredential(did: string, subject: string) {
    let data = this._credentials.get(did)
    if (!data) {
      data = []
      this._credentials.set(did, data)
    }
    if (data.map(x => x.subject).includes(subject)) throw new Error(``)
    const res = await this.issueCredential(did, subject)
    data.push({subject, cred_ex_id: res.credential_exchange_id!, connection_id: res.connection_id!})
    this._credentials.set(did, data)
    await MasterSubjectProposals.instance.updateVoters([{did, subjects: data.map(x => x.subject)}])
  }

  async removeCredential(did: string, subject: string) {
    let data = this._credentials.get(did)
    if (!data) {
      data = []
      this._credentials.set(did, data)
    }
    const toRemove = data.filter(x => x.subject === subject).shift()
    if (!toRemove) throw new Error(``)
    await this.revokeCredential(toRemove)
    const remaining = data.filter(x => x !== toRemove)
    await MasterSubjectProposals.instance.updateVoters([{did, subjects: remaining.map(x => x.subject)}])
    if (remaining.length > 0) {
      this._credentials.set(did, remaining)
      return false
    } else {
      this._credentials.delete(did)
      return true
    }
  }
}
