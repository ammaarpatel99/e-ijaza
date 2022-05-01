import {ApplicationWrapper} from "./application-wrapper";
import axios from "axios";
import {
  Master,
  MasterProposalData,
  ProposalType
} from "../src/types/interface-api";
import {repeatWithBackoff} from "../src/utils";

export class Controller extends ApplicationWrapper {
  constructor() {
    super('controller')
  }

  initialise(): Promise<void> {
    return super.initialise()
  }

  async issueFirstMasterCred(did: string) {
    const data: MasterProposalData = {did: did, proposalType: ProposalType.ADD, subject: 'knowledge'}
    await axios.post(`${this.apiURL}/master/propose`, data)
    await repeatWithBackoff({
      initialTimeout: 2000,
      exponential: false,
      backoff: 5000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<Master[]>(
          `${this.apiURL}/masters`
        )
        const _proposal = data.filter(master =>
          master.did === did && master.subjects.includes('knowledge')
        ).shift()
        return {success: !!_proposal}
      },
      failCallback: () => {
        throw new Error(`failed to issue first master did from controller: ${did}`)
      }
    })
  }
}
