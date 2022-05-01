import {ApplicationWrapper} from "./application-wrapper";
import {HeldCredential, IssuedCredential} from "../src/types/interface-api";
import axios from "axios";
import {asyncTimout, repeatWithBackoff} from "../src/utils";

export class User extends ApplicationWrapper {
  constructor(name: string) {
    super(`user_${name}`);
  }

  initialise(controllerDID: string): Promise<void> {
    return super.initialise(controllerDID);
  }

  async issueCred(did: string, subject: string) {
    const data: IssuedCredential = {did, subject}
    await axios.post(`${this.apiURL}/credential/issue`, data)
    await repeatWithBackoff({
      initialTimeout: 2000,
      exponential: false,
      backoff: 5000,
      maxRepeats: 200,
      callback: async () => {
        const {data} = await axios.get<IssuedCredential[]>(
          `${this.apiURL}/issuedCredentials`
        )
        const issuedCred = data.filter(cred =>
          cred.did === did && cred.subject === subject
        ).shift()
        return {success: !!issuedCred}
      },
      failCallback: () => {
        throw new Error(`failed to issue credential`)
      }
    })
  }

  async makeCredsPublic() {
    const {data} = await axios.get<HeldCredential[]>(
      `${this.apiURL}/heldCredentials`
    )
    for (const cred of data) {
      const newData = {...cred, public: true}
      await axios.put(`${this.apiURL}/credential/update`, newData)
      await asyncTimout(5000)
    }
  }
}
