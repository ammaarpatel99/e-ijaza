export interface PublicDIDInitialisationData {
  vonNetworkURL: string
}

export interface AriesInitialisationData extends Partial<PublicDIDInitialisationData> {
  advertisedEndpoint: string
  genesisURL: string
  tailsServerURL: string
}

export enum AppType {
  USER = 'USER',
  MASTER = 'MASTER'
}

export interface InitialisationData_master {
  appType: AppType.MASTER
}

export interface InitialisationData_user {
  appType: AppType.USER
  masterDID: string
  name: string
}

export type InitialisationData = InitialisationData_master | InitialisationData_user

export enum InitialisationState {
  START_STATE,
  STARTING_ARIES,
  ARIES_READY,
  PUBLIC_DID_REGISTERED,
  INITIALISING,
  COMPLETE
}

export interface DIDDetails {
  did: string
  verkey: string
}

export interface UpdateReq {
  timestamp?: number
}

interface UpdateRes_1 {
  state: InitialisationState.START_STATE | InitialisationState.STARTING_ARIES | InitialisationState.ARIES_READY
}

interface UpdateRes_2 {
  state: InitialisationState.PUBLIC_DID_REGISTERED
  did: string
}

interface UpdateRes_3 {
  state: InitialisationState.INITIALISING
  did: string
  appType: AppType
}

interface UpdateRes_4 {
  state: InitialisationState.COMPLETE
  did: string
  appType: AppType
  timestamp: number
  masters: boolean
  masterProposals: boolean
  subjects: boolean
  subjectProposals: boolean
  heldCredentials: boolean
  issuedCredentials: boolean
  outgoingProofRequests: boolean
  incomingProofRequests: boolean
  incomingProofRequestHandlers: boolean
}

export type UpdateRes = UpdateRes_1 | UpdateRes_2 | UpdateRes_3 | UpdateRes_4

export interface Master {
  did: string
  subjects: string[]
}

export enum ProposalType {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

interface MasterProposal_base {
  did: string
  subject: string
  proposalType: ProposalType
}

interface MasterProposal_count extends MasterProposal_base {
  votes: {
    for: number
    against: number
    total: number
  }
}

export type MasterProposal = MasterProposal_base | MasterProposal_count

export interface Subject {
  name: string
  children: string[]
  componentSets: string[][]
}

export enum SubjectProposalType {
  CHILD = 'CHILD',
  COMPONENT_SET = 'COMPONENT_SET'
}

interface SubjectProposal_base {
  subject: string
  proposalType: ProposalType
  change: {
    type: SubjectProposalType.CHILD
    child: string
  } | {
    type: SubjectProposalType.COMPONENT_SET
    componentSet: string[]
  }
}

interface SubjectProposal_count extends SubjectProposal_base{
  votes: {
    for: number
    against: number
    total: number
  }
}

export type SubjectProposal = SubjectProposal_base | SubjectProposal_count

export interface HeldCredential {
  issuerDID: string
  subject: string
}

export interface IssuedCredential {
  ownerDID: string
  subject: string
}

export interface OutgoingProofRequest {
  did: string
  subject: string
  proof: OutgoingProofRequest[] | null | boolean // list of people | pending | result (true if master credential)
}

export interface IncomingProofRequest {
  did: string
  subject: string
  proof: HeldCredential[] | false
}

export interface IncomingProofRequestHandler {
  credential: HeldCredential
  revealTo?: string[]
}
