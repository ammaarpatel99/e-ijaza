import {Server, Schemas} from '@project-types'
import {connectViaPublicDID$} from "../aries-api";

export class MasterVoteProtocol {
  static readonly instance = new MasterVoteProtocol()
  private constructor() { }

  // CONTROLLER

  issueVote$(voterDID: string, proposal: Server.MasterProposal) {
    const data: Schemas.MasterProposalVoteSchema = {
      voteDetails: {
        did: proposal.did,
        action: proposal.proposalType,
        subject: proposal.subject,
        voterDID
      }
    }
    connectViaPublicDID$({their_public_did: voterDID})
  }
}
