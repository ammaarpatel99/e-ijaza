import {ariesAgentURL} from "../utils";
import axios from "axios";
import {Aries} from "@project-types";

export async function revokeCredential(
  body: Aries.RevokeRequest
) {
  await axios.post(`${ariesAgentURL}/revocation/revoke`, body)
}
