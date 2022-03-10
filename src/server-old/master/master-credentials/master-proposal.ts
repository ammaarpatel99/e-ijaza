import {ProposalAction} from "@types";
import {Master} from "./master";
import {Masters} from "./masters";

export class MasterProposal {
  private votes = new Map<Master, boolean|string>()

  constructor(
    readonly did: string,
    readonly subject: string,
    readonly action: ProposalAction,
    votes: [string, boolean|string][]
  ) {
    votes.forEach(value => {
      const master = Masters.instance.getMaster(value[0])
      if (!master) throw new Error(``)
      this.votes.set(master, value[1])
    })
  }

  hasVoter(master: Master) {
    return this.votes.has(master)
  }

  addVoter(master: Master) {
    master.grantVote(this)
    const credID = '' // TODO
    this.votes
  }
}
