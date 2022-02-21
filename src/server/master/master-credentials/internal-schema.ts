import {Schema} from "../../schemas/schema";

type DID = string
type Subject = string
type CredRef = string

export interface InternalSchema {
  credentials: [DID, [Subject, CredRef][]][]
}

export const internalSchema = new Schema('InternalMasterCredentials', ['credentials'], true)
