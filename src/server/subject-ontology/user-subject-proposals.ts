import {connectViaPublicDID, getCredentialsBySchema} from "@server/aries-wrapper/utils";
import {subjectVoteSchema} from "@server/schemas";
import {SubjectProposalType, SubjectVoteSchema} from "@project-types";
import {Config} from "@server/config";
import {isCredentialRevoked, presentProof, proposeProof, rejectProof} from "@server/aries-wrapper";
import {UserMasterCredentials} from "@server/teaching-credentials";
import {V10CredentialExchange} from "@project-types/aries-types";
import {WebhookMonitor} from "@server/webhook";

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
    this.votes.clear();
    (await getCredentialsBySchema(subjectVoteSchema.schemaID))
      .forEach(cred => {
        const vote = JSON.parse(cred.attrs!['voteDetails'])
        this.votes.set(UserSubjectProposals.voteToID(vote), {vote, cred_id: cred.referent!})
      })
  }

  async vote(proposal: SubjectVoteSchema['voteDetails'], vote: boolean) {
    const proposalData = this.votes.get(UserSubjectProposals.voteToID(proposal))
    if (!proposalData) throw new Error(`No proposal data found to vote on`)
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})
    const {presentation_exchange_id} = await proposeProof({
      connection_id: connectionID,
      comment: 'Vote on Subject Proposal',
      auto_present: true,
      presentation_proposal: {
        attributes: [
          {
            name: 'voteDetails',
            cred_def_id: subjectVoteSchema.credID
          },
          {
            name: 'voteChoice',
            value: JSON.stringify(vote)
          }
        ],
        predicates: []
      }
    })
    await WebhookMonitor.instance.monitorProofPresentation<void, string>(presentation_exchange_id!, async (result, resolve, reject) => {
      if (result.state !== 'request_received') return
      const voteDetailsName = Object.entries(result.presentation_request?.requested_attributes!).filter(x => x[1].name === 'voteDetails').map(x => x[0]).shift()
      const voteChoiceName = Object.entries(result.presentation_request?.requested_attributes!).filter(x => x[1].name === 'voteChoice').map(x => x[0]).shift()
      if (!voteDetailsName || !voteChoiceName) {
        await rejectProof({pres_ex_id: presentation_exchange_id!}, {description: 'Invalid format'})
        reject('Invalid format')
        return
      }
      await presentProof({pres_ex_id: presentation_exchange_id!}, {
        requested_predicates: {},
        requested_attributes: {
          [voteDetailsName]: {
            cred_id: proposalData.cred_id,
            revealed: true
          }
        },
        self_attested_attributes: {
          [voteChoiceName]: JSON.stringify(vote)
        }
      })
      resolve()
    })
  }

  async createProposal(proposal: Omit<SubjectVoteSchema["voteDetails"], 'voterDID'>) {
    const connectionID = await connectViaPublicDID({their_public_did: Config.instance.getMasterDID()})
    const masterCredID = [...UserMasterCredentials.instance.masterCredentials.entries()].map(x => x[1]).shift()
    if (!masterCredID) throw new Error(`Can't create proposals as not holding any master credentials`)
    const masterTeachingCredDef = UserMasterCredentials.instance.masterTeachingCredID
    const {presentation_exchange_id} = await proposeProof({
      auto_present: true,
      comment: 'Create Subject Proposal',
      connection_id: connectionID,
      presentation_proposal: {
        attributes: [
          {
            name: 'subject',
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
    await WebhookMonitor.instance.monitorProofPresentation<void, string>(presentation_exchange_id!, async (result, resolve, reject) => {
      if (result.state !== 'request_received') return
      const subjectName = Object.entries(result.presentation_request?.requested_attributes!).filter(x => x[1].name === 'subject').map(x => x[0]).shift()
      const proposalName = Object.entries(result.presentation_request?.requested_attributes!).filter(x => x[1].name === 'proposal').map(x => x[0]).shift()
      if (!subjectName || !proposalName) {
        await rejectProof({pres_ex_id: presentation_exchange_id!}, {description: 'Invalid format'})
        reject('Invalid format')
        return
      }
      await presentProof({pres_ex_id: presentation_exchange_id!}, {
        requested_predicates: {},
        requested_attributes: {
          [subjectName]: {
            cred_id: masterCredID,
            revealed: true
          }
        },
        self_attested_attributes: {
          [proposalName]: JSON.stringify(proposal)
        }
      })
      resolve()
    })
  }

  receiveVote(cred: V10CredentialExchange) {
    const vote = JSON.parse(cred.credential?.attrs!['voteDetails']!) as SubjectVoteSchema['voteDetails']
    this.votes.set(UserSubjectProposals.voteToID(vote), {vote, cred_id: cred.credential_id!})
  }
}
