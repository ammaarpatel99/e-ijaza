import {MasterProposal} from "./master-proposal";
import {MastersInternalSchema} from "@project-types";
import {issueCredential} from "../../../server-old2/aries-wrapper/issue-credentials/issue-credential";
import {teachingSchema} from "../../../server-old2/schemas";
import {connectViaPublicDID} from "../../../server-old2/aries-wrapper";
import {Masters} from "./masters";
import {revokeCredential} from "../../../server-old2/aries-wrapper/issue-credentials/revoke-credential";
import {Config} from "../../../server-old2/config";

export class Master {
  private readonly subjectsToCredExID

  constructor(readonly did: string, subjects: MastersInternalSchema['credentials'][string]) {
    this.subjectsToCredExID = new Map<string, (typeof subjects)[number]>(subjects.map(x => [x.subject, x]))
  }

  hasSubject(subject: string) {
    return this.subjectsToCredExID.has(subject)
  }

  get subjects() {
    return this.subjectsToCredExID
  }

  async grantCred(subject: string) {
    const connectionRes = await connectViaPublicDID({
      their_public_did: this.did,
      my_label: Config.instance.getLabel()
    })
    const res = await issueCredential({
      auto_remove: false,
      cred_def_id: teachingSchema.getCredID(),
      connection_id: connectionRes!.connection_id!,
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
      connection_id,
      cred_ex_id
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
