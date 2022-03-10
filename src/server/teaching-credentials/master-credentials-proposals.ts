import {
  MastersProposalSchema,
  MastersVoteSchema,
  ProposalAction
} from "@project-types";
import {
  connectViaPublicDID,
  deleteCredential,
  getHeldCredentials,
  issueCredential, rejectProof, requestProofFromProposal,
  revokeCredential
} from "@server/aries-wrapper";
import {masterProposalSchema, masterVoteSchema, subjectVoteSchema, teachingSchema} from "@server/schemas";
import {connectToSelf} from "@server/utils";
import {MasterCredentials} from "@server/teaching-credentials/master-credentials";
import {MasterSubjectOntology, MasterSubjectProposals} from "@server/subject-ontology";
import {InternalSubjectOntology} from "@server/subject-ontology/internal-subject-ontology";
import {V10PresentationExchange} from "@project-types/aries-types";
import {WebhookMonitor} from "@server/webhook";

export class MasterCredentialsProposals {
  static readonly instance = new MasterCredentialsProposals()
  private constructor() { }

  private static proposalToID(proposal: Omit<MastersProposalSchema['proposal'], 'votes'>) {
    return `${proposal.did}-${proposal.action}-${proposal.subject}`
  }

  private static isVote(data: any): data is MastersVoteSchema['voteDetails'] {
    if (!data) return false
    if (
      typeof data.did !== 'string' ||
      typeof data.subject !== 'string' ||
      typeof data.voterDID !== 'string'
    ) return false
    return data.action === ProposalAction.ADD || data.action === ProposalAction.REMOVE;

  }

  private readonly proposals = new Map<string, MastersProposalSchema['proposal']>()

  get _proposals() {
    return this.proposals
  }

  async loadProposals() {
    (await getHeldCredentials({})).results!
      .filter((cred => cred.schema_id === masterProposalSchema.schemaID))
      .forEach(cred => {
        const proposal = JSON.parse(cred.attrs!['proposal']) as MastersProposalSchema['proposal']
        this.proposals.set(
          MasterCredentialsProposals.proposalToID(proposal),
          proposal
        )
      })
  }

  private async saveProposal(proposal: MastersProposalSchema['proposal']) {
    await this.deleteHeldProposalCredentials(proposal)
    const connectionControls = await connectToSelf()
    const {credential_exchange_id} = await issueCredential({
      connection_id: connectionControls.connectionID,
      cred_def_id: masterProposalSchema.credID,
      auto_remove: true,
      credential_proposal: {
        attributes: [{
          name: 'proposal',
          value: JSON.stringify(proposal)
        }]
      }
    })
    this.proposals.set(MasterCredentialsProposals.proposalToID(proposal), proposal)
    await WebhookMonitor.instance.monitorCredentialExchange<void, any>(
      credential_exchange_id!,
      async (result, resolve, reject) => {
        if (result.state === 'credential_acked') {
          await connectionControls.close()
          resolve()
        }
      })
  }

  private async deleteHeldProposalCredentials(proposal: MastersProposalSchema['proposal']) {
    const promises = (await getHeldCredentials({})).results!
      .filter((cred => cred.schema_id === masterProposalSchema.schemaID))
      .filter(cred => {
        const _proposal = JSON.parse(cred.attrs!['proposal']) as MastersProposalSchema['proposal']
        return MasterCredentialsProposals.proposalToID(_proposal) === MasterCredentialsProposals.proposalToID(proposal)
      })
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    await Promise.all(promises)
    this.proposals.delete(MasterCredentialsProposals.proposalToID(proposal))
  }

  private async getValidVoters(subject: string) {
    return (await Promise.all(
      [...MasterCredentials.instance.credentials.entries()]
        .map(async ([did, data]) => ({
          did, canVote: await MasterSubjectOntology.instance.testSearch(data.map(x => x.subject), subject)
        }))))
      .filter(data => data.canVote)
      .map(data => data.did)
  }

  async updateVoters(voters: {did: string, subjects: string[]}[] = []) {
    if (voters.length === 0) {
      MasterCredentials.instance.credentials.forEach((value, key) =>
        voters.push({
          did: key,
          subjects: value.map(x => x.subject)
        })
      )
    }
    await Promise.all([...this.proposals.values()]
      .map(async proposal => {
        let changed = false
        await Promise.all(voters.map(async voter => {
          const canVote = await MasterSubjectOntology.instance.testSearch(voter.subjects, proposal.subject)
          if (canVote && proposal.votes[voter.did] === undefined) {
            await this.grantProposalVote(proposal, voter.did)
            changed = true
          } else if (!canVote && proposal.votes[voter.did] !== undefined) {
            await this.revokeProposalVote(proposal, voter.did)
            changed = true
          }
        }))
        if (changed && !(await this.completeProposalIfReady(proposal))) {
          await this.saveProposal(proposal)
        }
      }))
  }

  private async grantProposalVote(proposal: MastersProposalSchema['proposal'], did: string) {
    const vote: MastersVoteSchema['voteDetails'] = {
      subject: proposal.subject,
      did: proposal.did,
      action: proposal.action,
      voterDID: did
    }
    const connectionID = await connectViaPublicDID({their_public_did: did})
    const res = await issueCredential({
      connection_id: connectionID,
      auto_remove: false,
      cred_def_id: masterVoteSchema.credID,
      credential_proposal: {
        attributes: [{
          name: 'proposal',
          value: JSON.stringify(vote)
        }]
      }
    })
    proposal.votes[did] = {cred_ex_id: res.credential_exchange_id!, connection_id: connectionID}
    this.proposals.set(MasterCredentialsProposals.proposalToID(proposal), proposal)
  }

  private async revokeProposalVote(proposal: MastersProposalSchema['proposal'], did: string) {
    const data = proposal.votes[did]
    if (data === undefined) throw new Error(`Revoking non-existent vote credential`)
    if (typeof data !== 'boolean') {
      await revokeCredential({
        cred_ex_id: data.cred_ex_id,
        connection_id: data.connection_id,
        notify: true,
        publish: true
      })
    }
    delete proposal.votes[did]
    this.proposals.set(MasterCredentialsProposals.proposalToID(proposal), proposal)
  }

  private static getProposalResult(proposal: MastersProposalSchema['proposal']) {
    let voters = 0
    let inFavour = 0
    let against = 0
    Object.entries(proposal.votes).forEach(([did, vote]) => {
      voters++
      if (vote === true) inFavour++
      else if (vote === false) against++
    })
    if (inFavour > voters / 2) return true
    else if (against > voters / 2) return false
    else if (inFavour + against === voters) return false
    return null
  }

  private async validateProposal(proposal: MastersProposalSchema['proposal']) {
    const hasSubject = MasterCredentials.instance.credentials.get(proposal.did)?.map(x => x.subject).includes(proposal.subject)
    if (proposal.action === ProposalAction.REMOVE) {
      return hasSubject
    }
    return !hasSubject
  }

  private async actionProposal(proposal: MastersProposalSchema['proposal']) {
    if (proposal.action === ProposalAction.ADD) {
      await MasterCredentials.instance.addCredential(proposal.did, proposal.subject)
      await MasterCredentials.instance.saveDataCredentials()
    } else {
      await MasterCredentials.instance.removeCredential(proposal.did, proposal.subject)
      await MasterCredentials.instance.saveDataCredentials()
    }
    await this.cancelProposal(proposal)
  }

  private async cancelProposal(proposal: MastersProposalSchema['proposal']) {
    await Promise.all(Object.entries(proposal.votes)
      .map(([did, vote]) => {
        if (vote === undefined) return
        return this.revokeProposalVote(proposal, did)
      }))
    await this.deleteHeldProposalCredentials(proposal)
  }

  private async completeProposalIfReady(proposal: MastersProposalSchema['proposal']) {
    const state = MasterCredentialsProposals.getProposalResult(proposal)
    if (state === null) return
    if (state) {
      await this.actionProposal(proposal)
      await MasterSubjectProposals.instance.updateVoters([{
        did: proposal.did,
        subjects: [...MasterCredentials.instance.credentials.entries()]
          .filter(x => x[0] === proposal.did)
          .map(x => x[1].map(y => y.subject))
          .shift() || []
      }])
    }
    else await this.cancelProposal(proposal)
    return true
  }

  async isProposal(data: any) {
    const subjects = InternalSubjectOntology.instance.getSubjects()
    return (
      subjects.includes(data.subject) &&
      [ProposalAction.ADD, ProposalAction.REMOVE].includes(data.action) &&
      await this.validateProposal(data)
    )
  }

  async createProposal(proofPresentation: V10PresentationExchange) {
    const attributes = proofPresentation.presentation_proposal_dict?.presentation_proposal.attributes
    const proposalData = attributes?.filter(x => x.name === 'proposal').shift()
    const proposal = JSON.parse(proposalData?.value || '')
    if (!attributes?.filter(x => x.cred_def_id === teachingSchema.credID).shift() || !proposal || !(await this.isProposal(proposal))) {
      await rejectProof({pres_ex_id: proofPresentation.presentation_exchange_id!}, {description: 'lacking necessary data'})
      return
    }
    const promise = WebhookMonitor.instance.monitorProofPresentation(proofPresentation.presentation_exchange_id!, (result, resolve, reject) => {
      if (result.state === 'verified') resolve(null)
      if (result.error_msg) reject(result.error_msg)
    })
    await requestProofFromProposal({pres_ex_id: proofPresentation.presentation_exchange_id!}, {})
    await promise
    proposal.votes = {};
    await Promise.all((await this.getValidVoters(proposal.subject))
      .map(did => this.grantProposalVote(proposal, did)))
    await this.saveProposal(proposal)
  }

  async receiveVote(data: V10PresentationExchange) {
    const voteData = data.presentation_proposal_dict?.presentation_proposal.attributes
      .filter(x => x.cred_def_id === masterProposalSchema.credID)
      .map(x => x.value)
      .filter(x => x)
      .map(x => JSON.parse(x!))
      .map(x => MasterCredentialsProposals.isVote(x) ? x : undefined)
      .filter(x => x)
      .shift()
    const proposalData = voteData ? this.proposals.get(MasterCredentialsProposals.proposalToID(voteData)) : undefined
    const currentVote = voteData ? proposalData?.votes[voteData.voterDID] : undefined
    const voteChoice: boolean = data.presentation_proposal_dict?.presentation_proposal.attributes
      .filter(x => x.name === 'voteChoice')
      .map(x => x.value)
      .filter(x => x)
      .map(x => JSON.parse(x!))
      .filter(x => typeof x === 'boolean')
      .shift()
    if (!voteData || voteChoice === undefined || !proposalData || !currentVote || typeof currentVote === 'boolean') {
      await rejectProof({pres_ex_id: data.presentation_exchange_id!}, {description: 'invalid data'})
      return
    }
    const promise = WebhookMonitor.instance.monitorProofPresentation(data.presentation_exchange_id!, (result, resolve, reject) => {
      if (result.state === 'verified') resolve(null)
      if (result.error_msg) reject(result.error_msg)
    })
    await requestProofFromProposal({pres_ex_id: data.presentation_exchange_id!}, {})
    await promise
    proposalData.votes[voteData.voterDID] = voteChoice
    await revokeCredential({
      publish: true, notify: true,
      connection_id: currentVote.connection_id,
      cred_ex_id: currentVote.cred_ex_id
    })
    await this.saveProposal(proposalData)
    await this.completeProposalIfReady(proposalData)
  }
}
