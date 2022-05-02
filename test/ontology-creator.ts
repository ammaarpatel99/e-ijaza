import {ApplicationWrapper} from "./application-wrapper";
import {
  Master,
  MasterProposalData,
  MasterProposalVote,
  ProposalType,
  SubjectProposalData,
  SubjectProposalType,
  SubjectProposalVote
} from "../src/types/interface-api";
import axios from "axios";
import {asyncTimout, repeatWithBackoff} from "../src/utils";

export class OntologyCreator extends ApplicationWrapper {
  constructor() {
    super('ontology-creator');
  }

  initialise(controllerDID: string): Promise<void> {
    return super.initialise(controllerDID);
  }

  async makeProposal(proposal: SubjectProposalData) {
    await axios.post(`${this.apiURL}/ontology/propose`, proposal)
    await repeatWithBackoff({
      initialTimeout: 5  * 1000,
      exponential: false,
      backoff: 5  * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<SubjectProposalData[]>(
          `${this.apiURL}/state/subjectProposals`
        )
        const _proposal = data.filter(_proposal =>
          _proposal.proposalType === proposal.proposalType &&
          _proposal.subject === proposal.subject &&
          _proposal.change.type === proposal.change.type &&
          ((
            _proposal.change.type === SubjectProposalType.COMPONENT_SET &&
            _proposal.change.componentSet.length === (proposal.change as any).componentSet.length &&
            _proposal.change.componentSet.every(subject => (proposal.change as any).componentSet.includes(subject))
          ) ||
            (_proposal.change as any).child === (proposal.change as any).child)
        ).shift()
        return {success: !!_proposal}
      },
      failCallback: () => {
        throw new Error(`failed to create subject proposal: ${JSON.stringify(proposal)}`)
      }
    })
    const vote: SubjectProposalVote = {...proposal, vote: true}
    await axios.post(`${this.apiURL}/ontology/vote`, vote)
    await repeatWithBackoff({
      initialTimeout: 5  * 1000,
      exponential: false,
      backoff: 5  * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<SubjectProposalData[]>(
          `${this.apiURL}/state/subjectProposals`
        )
        const _proposal = data.filter(_proposal =>
          _proposal.proposalType === proposal.proposalType &&
          _proposal.subject === proposal.subject &&
          _proposal.change.type === proposal.change.type &&
          (
            (_proposal.change as any).child === (proposal.change as any).child
            || (
              _proposal.change.type === SubjectProposalType.COMPONENT_SET &&
              _proposal.change.componentSet.length === (proposal.change as any).componentSet.length &&
              _proposal.change.componentSet.every(subject => (proposal.change as any).componentSet.includes(subject))
            ))
        ).shift()
        return {success: !_proposal}
      },
      failCallback: () => {
        throw new Error(`failed to create subject proposal (by making vote): ${JSON.stringify(proposal)}`)
      }
    })
    await asyncTimout(5000)
  }

  async issueMaster(did: string, subject: string) {
    const proposal: MasterProposalData = {did, subject, proposalType: ProposalType.ADD}
    await axios.post(`${this.apiURL}/master/propose`, proposal)
    await repeatWithBackoff({
      initialTimeout: 5  * 1000,
      exponential: false,
      backoff: 5  * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<MasterProposalData[]>(
          `${this.apiURL}/state/masterProposals`
        )
        const _proposal = data.filter(_proposal =>
          _proposal.proposalType === proposal.proposalType &&
          _proposal.subject === proposal.subject &&
          _proposal.did === proposal.did
        ).shift()
        return {success: !!_proposal}
      },
      failCallback: () => {
        throw new Error(`failed to create master proposal: ${JSON.stringify(proposal)}`)
      }
    })
    const vote: MasterProposalVote = {...proposal, vote: true}
    await axios.post(`${this.apiURL}/master/vote`, vote)
    await repeatWithBackoff({
      initialTimeout: 5  * 1000,
      exponential: false,
      backoff: 5  * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<Master[]>(
          `${this.apiURL}/masters`
        )
        const _proposal = data.filter(master =>
          master.did === did && master.subjects.includes(subject)
        ).shift()
        return {success: !!_proposal}
      },
      failCallback: () => {
        throw new Error(`failed to issue starting master: ${did}`)
      }
    })
    await asyncTimout(5000)
  }
}
