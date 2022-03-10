import {ProposalAction, SubjectProposalSchema, SubjectProposalType, SubjectVoteSchema} from "@project-types";
import {
  connectViaPublicDID,
  deleteCredential,
  getHeldCredentials,
  issueCredential, rejectProof, requestProofFromProposal,
  revokeCredential
} from "@server/aries-wrapper";
import {subjectProposalSchema, subjectVoteSchema, teachingSchema} from "@server/schemas";
import {connectToSelf} from "@server/utils";
import {MasterCredentials, MasterCredentialsProposals} from "@server/teaching-credentials";
import {V10PresentationExchange} from "@project-types/aries-types";
import {InternalSubjectOntology} from "@server/subject-ontology/internal-subject-ontology";
import {MasterSubjectOntology} from "@server/subject-ontology/master-subject-ontology";
import {WebhookMonitor} from "@server/webhook";

export class MasterSubjectProposals {
  static readonly instance = new MasterSubjectProposals()
  private constructor() { }


  private static proposalToID(proposal: Omit<SubjectProposalSchema['proposal'], 'votes'>) {
    return `${proposal.subject}-${proposal.action}-${
      proposal.change.type === SubjectProposalType.CHILD ?
        proposal.change.child :
        proposal.change.component_set.join(',')
    }`
  }

  private static isVote(data: any): data is SubjectVoteSchema['voteDetails'] {
    if (!data) return false
    if (typeof data.subject !== 'string' || typeof data.voterDID !== 'string') return false
    if (!(data.action === ProposalAction.ADD || data.action === ProposalAction.REMOVE)) return false
    if (!data.change) return false
    if (data.change.type === SubjectProposalType.CHILD && typeof data.change.child === 'string') return true
    return !!(data.change.type === SubjectProposalType.COMPONENT_SET &&
      Array.isArray(data.change.component_set) &&
      data.change.component_set.every((subject: any) => typeof subject === 'string'));
  }

  private readonly proposals = new Map<string, SubjectProposalSchema['proposal']>()

  get _proposals() {
    return this.proposals
  }

  async loadProposals() {
    (await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === subjectProposalSchema.schemaID)
      .forEach(cred => {
        const proposal = JSON.parse(cred.attrs!['proposal']) as SubjectProposalSchema['proposal']
        this.proposals.set(
          MasterSubjectProposals.proposalToID(proposal),
          proposal
        )
      })
  }

  private async saveProposal(proposal: SubjectProposalSchema['proposal']) {
    await this.deleteHeldProposalCredentials(proposal)
    const connectionControls = await connectToSelf()
    const {credential_exchange_id} = await issueCredential({
      connection_id: connectionControls.connectionID,
      cred_def_id: subjectProposalSchema.credID,
      auto_remove: true,
      credential_proposal: {
        attributes: [{
          name: 'proposal',
          value: JSON.stringify(proposal)
        }]
      }
    })
    this.proposals.set(MasterSubjectProposals.proposalToID(proposal), proposal)
    await WebhookMonitor.instance.monitorCredentialExchange<void, any>(
      credential_exchange_id!,
      async (result, resolve, reject) => {
        if (result.state === 'credential_acked') {
          await connectionControls.close()
          resolve()
        }
      })
  }

  private async deleteHeldProposalCredentials(proposal: SubjectProposalSchema['proposal']) {
    const promises = (await getHeldCredentials({})).results!
      .filter(cred => cred.schema_id === subjectProposalSchema.schemaID)
      .filter(cred => {
        const _proposal = JSON.parse(cred.attrs!['proposal']) as SubjectProposalSchema['proposal']
        return MasterSubjectProposals.proposalToID(proposal) === MasterSubjectProposals.proposalToID(_proposal)
      })
      .map(cred => deleteCredential({credential_id: cred.referent!}))
    await Promise.all(promises)
    this.proposals.delete(MasterSubjectProposals.proposalToID(proposal))
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
    await MasterCredentialsProposals.instance.updateVoters(voters)
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

  private async grantProposalVote(proposal: SubjectProposalSchema['proposal'], did: string) {
    const vote: SubjectVoteSchema['voteDetails'] = {
      subject: proposal.subject,
      change: proposal.change,
      action: proposal.action,
      voterDID: did
    }
    const connectionID = await connectViaPublicDID({their_public_did: did})
    const res = await issueCredential({
      connection_id: connectionID,
      auto_remove: false,
      cred_def_id: subjectVoteSchema.credID,
      credential_proposal: {
        attributes: [{
          name: 'proposal',
          value: JSON.stringify(vote)
        }]
      }
    })
    proposal.votes[did] = {cred_ex_id: res.credential_exchange_id!, connection_id: connectionID}
    this.proposals.set(MasterSubjectProposals.proposalToID(proposal), proposal)
  }

  private async revokeProposalVote(proposal: SubjectProposalSchema['proposal'], did: string) {
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
    this.proposals.set(MasterSubjectProposals.proposalToID(proposal), proposal)
  }

  private static getProposalResult(proposal: SubjectProposalSchema['proposal']) {
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

  private async validateProposal(proposal: SubjectProposalSchema['proposal']) {
    if (proposal.action === ProposalAction.REMOVE && proposal.change.type === SubjectProposalType.CHILD) {
      return await InternalSubjectOntology.instance.checkRemovalOfChild(proposal.subject, proposal.change.child)
    } else if (proposal.action == ProposalAction.ADD && proposal.change.type === SubjectProposalType.COMPONENT_SET) {
      return await InternalSubjectOntology.instance.checkAdditionOfComponentSet(proposal.subject, proposal.change.component_set)
    }
    return true
  }

  private async actionProposal(proposal: SubjectProposalSchema['proposal']) {
    const promises: Promise<void>[] = []
    if (proposal.change.type === SubjectProposalType.CHILD) {
      if (proposal.action === ProposalAction.ADD) {
        if (InternalSubjectOntology.instance.addChild(proposal.subject, proposal.change.child)) {
          promises.push(MasterSubjectOntology.instance.saveSubjects(),
            MasterSubjectOntology.instance.saveSubjectData(proposal.change.child))
        }
        promises.push(MasterSubjectOntology.instance.saveSubjectData(proposal.subject))
      } else {
        if (InternalSubjectOntology.instance.removeChild(proposal.subject, proposal.change.child)) {
          promises.push(MasterSubjectOntology.instance.saveSubjects(),
            MasterSubjectOntology.instance.saveSubjectData(proposal.change.child),
            MasterCredentials.instance.onDeletedSubject(proposal.change.child))
        }
        promises.push(MasterSubjectOntology.instance.saveSubjectData(proposal.subject))
      }
    } else {
      if (proposal.action === ProposalAction.ADD) {
        InternalSubjectOntology.instance.addComponentSet(proposal.subject, proposal.change.component_set)
        promises.push(MasterSubjectOntology.instance.saveSubjectData(proposal.subject))
      } else {
        InternalSubjectOntology.instance.removeComponentSet(proposal.subject, proposal.change.component_set)
        promises.push(MasterSubjectOntology.instance.saveSubjectData(proposal.subject))
      }
    }
    await Promise.all(promises)
    await this.cancelProposal(proposal)
  }

  private async cancelProposal(proposal: SubjectProposalSchema['proposal']) {
    await Promise.all(Object.entries(proposal.votes)
      .map(([did, vote]) => {
        if (vote === undefined) return
        return this.revokeProposalVote(proposal, did)
      }))
    await this.deleteHeldProposalCredentials(proposal)
  }

  private async completeProposalIfReady(proposal: SubjectProposalSchema['proposal']) {
    const state = MasterSubjectProposals.getProposalResult(proposal)
    if (state === null) return
    if (state) {
      await this.actionProposal(proposal)
      await this.updateVoters()
    }
    else await this.cancelProposal(proposal)
    return true
  }

  async isProposal(data: any) {
    const subjects = InternalSubjectOntology.instance.getSubjects()
    return !!(
      subjects.includes(data.subject) &&
      [ProposalAction.ADD, ProposalAction.REMOVE].includes(data.action) &&
      data.change &&
      (
        (data.change.type === SubjectProposalType.CHILD && subjects.includes(data.change.child)) ||
        (
          data.change.type === SubjectProposalType.COMPONENT_SET && Array.isArray(data.change.component_set) &&
          data.change.component_set.every((subject: string) => subjects.includes(subject))
        )
      ) &&
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
      .filter(x => x.cred_def_id === subjectVoteSchema.credID)
      .map(x => x.value)
      .filter(x => x)
      .map(x => JSON.parse(x!))
      .map(x => MasterSubjectProposals.isVote(x) ? x : undefined)
      .filter(x => x)
      .shift()
    const proposalData = voteData ? this.proposals.get(MasterSubjectProposals.proposalToID(voteData)) : undefined
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
