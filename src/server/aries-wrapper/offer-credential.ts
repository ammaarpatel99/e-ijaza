import {OfferCredentialData} from "@types";
import {AriesAgentUrl} from "@server/aries-wrapper/aries-agent-url";
import axios from "axios";

export async function offerCredential<Schema>(cred_ex_id: string, data: OfferCredentialData<Schema>) {
  const ariesURL = AriesAgentUrl.getValue()
  await axios.post(`${ariesURL}/issue-credential/send-proposal`, data)
}
