import {getAriesAgentUrl} from "../utils";
import axios from "axios";
import {RevokeRequest} from "@project-types/aries-types";

export async function revokeCredential(
  body: RevokeRequest
) {
  const ariesURL = getAriesAgentUrl()
  await axios.post(`${ariesURL}/revocation/revoke`, body)
}
