import {ApplicationWrapper} from "./application-wrapper";
import {IssuedCredential, NewProofRequest, OutgoingProofRequest} from "../src/types/interface-api";
import axios from "axios";
import {repeatWithBackoff} from "../src/utils";

export class Verifier extends ApplicationWrapper {
  constructor(id: number) {
    super(`verifier_${id}`);
  }

  initialise(controllerDID: string): Promise<void> {
    return super.initialise(controllerDID);
  }

  async runProof(did: string, subject: string) {
    const data: NewProofRequest = {did, subject}
    await axios.post(`${this.apiURL}/proof/create`, data)
    const proofRes = await repeatWithBackoff({
      initialTimeout: 2000,
      exponential: false,
      backoff: 10 * 1000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<OutgoingProofRequest[]>(
          `${this.apiURL}/proofs/outgoing`
        )
        const proofReq = data.filter(req => req.did === did && req.subject === subject).shift()
        if (!proofReq) return {success: false}
        return {success: true, value: proofReq}
      },
      failCallback: () => {
        throw new Error(`failed to run proof`)
      }
    })
    await axios.post(`${this.apiURL}/proof/delete`, proofRes)
  }
}