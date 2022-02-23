import {MasterProposal} from "@server/master/master-credentials/master-proposal";

export class Master {
  private readonly subjectsToCredRef

  constructor(readonly did: string, subjects: [string, string][]) {
    this.subjectsToCredRef = new Map<string, string>(subjects)
  }

  hasSubject(subject: string) {
    return this.subjectsToCredRef.has(subject)
  }

  get subjects() {
    return [...this.subjectsToCredRef]
  }

  grantCred(subject: string) {
    // TODO
  }

  revokeCred(subject: string) {
    // TODO
  }

  grantVote(proposal: MasterProposal) {
    // TODO:
  }

  revokeVote(proposal: MasterProposal) {
    // TODO
  }
}
