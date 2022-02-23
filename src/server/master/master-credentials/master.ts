import {MasterProposal} from "@server/master/master-credentials/master-proposal";
import {MastersInternalSchema, TeachingSchema} from "@types";
import {issueCredential} from "@server/aries-wrapper/issue-credential";
import {teachingSchema} from "@server/schemas";
import {connectViaPublicDID} from "@server/aries-wrapper";
import {Masters} from "@server/master/master-credentials/masters";
import {revokeCredential} from "@server/aries-wrapper/revoke-credential";

export class Master {
  private readonly subjectsToCredExID

  constructor(readonly did: string, subjects: MastersInternalSchema['credentials'][string]) {
    this.subjectsToCredExID = new Map<string, (typeof subjects)[number]>(subjects.map(x => [x.subject, x]))
  }

  hasSubject(subject: string) {
    return this.subjectsToCredExID.has(subject)
  }

  get subjects() {
    return [...this.subjectsToCredExID]
  }

  async grantCred(subject: string) {
    const connection_id = await connectViaPublicDID(this.did)
    const res = await issueCredential<TeachingSchema>({
      auto_remove: false,
      cred_def_id: teachingSchema.getCredID(),
      connection_id,
      credential_proposal: {
        attributes: [
          {
            "mime-type": 'text/plain',
            name: 'subject',
            value: subject
          }
        ]
      }
    })
    this.subjectsToCredExID.set(subject, {
      subject,
      cred_ex_id: res.credential_exchange_id,
      connection_id
    })
    await Masters.instance.updateInternalCredential()
  }

  async revokeCred(subject: string) {
    const data = this.subjectsToCredExID.get(subject)
    await revokeCredential({
      cred_ex_id: data?.cred_ex_id,
      publish: false,
      connection_id: data?.connection_id
    })
    await Masters.instance.updateInternalCredential()
  }

  grantVote(proposal: MasterProposal) {
    // TODO:
  }

  revokeVote(proposal: MasterProposal) {
    // TODO
  }
}
