import {CredentialInfo} from "./credential-info";

export type ControllerMasters = Map<string, Map<string, CredentialInfo>>

export type Masters = Map<string, Set<string>>

export type Subjects = Map<string, {
  children: Set<string>
  componentSets: Set<Set<string>>
}>
