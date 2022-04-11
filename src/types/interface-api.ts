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
  CONTROLLER = 'CONTROLLER'
}

export interface InitialisationData_controller {
  appType: AppType.CONTROLLER
}

export interface InitialisationData_user {
  appType: AppType.USER
  masterDID: string
  name: string
}

export type InitialisationData = InitialisationData_controller | InitialisationData_user

export type FullInitialisationData = AriesInitialisationData & InitialisationData

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
  reachableSubjects: boolean
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

export interface MasterProposalData {
  did: string
  subject: string
  proposalType: ProposalType
}

export interface MasterProposal extends MasterProposalData {
  votes?: {
    for: number
    against: number
    total: number
  }
}

export interface MasterProposalVote extends MasterProposalData {
  vote: boolean
}

export interface Subject {
  name: string
  children: string[]
  componentSets: string[][]
}

export enum SubjectProposalType {
  CHILD = 'CHILD',
  COMPONENT_SET = 'COMPONENT_SET'
}

export interface SubjectProposalData {
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

export interface SubjectProposal extends SubjectProposalData {
  votes?: {
    for: number
    against: number
    total: number
  }
}

export interface SubjectProposalVote extends SubjectProposalData {
  vote: boolean
}

export interface HeldCredentialData {
  did: string
  subject: string
}

export interface HeldCredential extends HeldCredentialData {
  public: boolean
}

export interface IssuedCredential {
  did: string
  subject: string
}

export interface OutgoingProofRequest {
  did: string
  subject: string
  result: boolean | null
  proof: OutgoingProofRequest[] | null | boolean // list of required credentials to prove | result (true if master credential)
}

export interface NewProofRequest {
  did: string
  subject: string
}

export interface IncomingProofRequest {
  did: string
  subject: string
  proof: HeldCredentialData[] | false
}

export interface ResponseToIncomingProofRequest extends IncomingProofRequest{
  reveal: boolean
}

export interface ReachableSubject {
  name: string
  reachableByMasterCredentials: boolean
}
