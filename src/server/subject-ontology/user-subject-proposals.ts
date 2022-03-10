import {connectViaPublicDID, getCredentialsBySchema} from "@server/aries-wrapper/utils";
import {subjectVoteSchema} from "@server/schemas";
import {SubjectProposalType, SubjectVoteSchema} from "@project-types";
import {Config} from "@server/config";
import {proposeProof} from "@server/aries-wrapper";
import {UserMasterCredentials} from "@server/teaching-credentials";

interface VoteData {
  cred_id: string
  vote: SubjectVoteSchema['voteDetails']
}

export class UserSubjectProposals {
  static readonly instance = new UserSubjectProposals()
  private constructor() { }

  private static voteToID(vote: Omit<SubjectVoteSchema['voteDetails'], 'voterDID'>) {
    return `${vote.subject}-${vote.action}-${vote.change.type}-${
      vote.change.type === SubjectProposalType.CHILD ? vote.change.child :
        vote.change.component_set.join(',')
    }`
  }

  private readonly votes = new Map<string, VoteData>()

  get _votes() {
    return this.votes
  }

  async loadProposalVotes() {
    (await getCredentialsBySchema(subjectVoteSchema.schemaID))
      .forEach(cred => {
        const vote = JSON.parse(cred.attrs!['voteDetails'])
        this.votes.set(UserSubjectProposals.voteToID(vote), {vote, cred_id: cred.referent!})
      })
  }

  async vote(proposal: SubjectVoteSchema['voteDetails'], vote: boolean) {
    const proposalData = this.votes.get(UserSubjectProposals.voteToID(proposal))
    if (!proposalData) throw new Error(``)
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})
    await proposeProof({
      connection_id: connectionID,
      comment: 'Vote on Subject Proposal',
      auto_present: true,
      presentation_proposal: {
        attributes: [
          {
            name: 'voteDetails',
            cred_def_id: subjectVoteSchema.credID,
            referent: proposalData.cred_id
          },
          {
            name: 'voteChoice',
            value: JSON.stringify(vote)
          }
        ],
        predicates: []
      }
    })
  }

  async createProposal(proposal: Omit<SubjectVoteSchema["voteDetails"], 'voterDID'>) {
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})
    const masterCredID = [...UserMasterCredentials.instance.masterCredentials.entries()].map(x => x[1]).shift()
    if (!masterCredID) throw new Error(`Can't create proposals as not holding any master credentials`)
    const masterTeachingCredDef = UserMasterCredentials.instance.masterTeachingCredID
    await proposeProof({
      auto_present: true,
      comment: 'Create Subject Proposal',
      connection_id: connectionID,
      presentation_proposal: {
        attributes: [
          {
            name: 'subject',
            referent: masterCredID,
            cred_def_id: masterTeachingCredDef
          },
          {
            name: 'proposal',
            value: JSON.stringify(proposal)
          }
        ],
        predicates: []
      }
    })
  }
}
