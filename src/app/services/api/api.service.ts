import { Injectable } from '@angular/core';
import {EMPTY, Observable, OperatorFunction, switchMap} from "rxjs";
import {
  AriesInitialisationData,
  DIDDetails,
  HeldCredential,
  HeldCredentialData,
  IncomingProofRequest,
  InitialisationData,
  IssuedCredential,
  Master,
  MasterProposal,
  MasterProposalData,
  MasterProposalVote,
  NewProofRequest,
  OutgoingProofRequest,
  PublicDIDInitialisationData,
  ReachableSubject,
  Subject,
  SubjectProposal,
  SubjectProposalData,
  SubjectProposalVote,
  UpdateReq,
  UpdateRes
} from "@project-types/interface-api";

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }

  readonly getStateUpdate: OperatorFunction<UpdateReq, UpdateRes> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly getMasters$: Observable<Master[]> = EMPTY

  readonly getMasterProposals$: Observable<MasterProposal[]> = EMPTY

  readonly getSubjects$: Observable<Subject[]> = EMPTY

  readonly getSubjectProposals$: Observable<SubjectProposal[]> = EMPTY

  readonly getHeldCredentials$: Observable<HeldCredential[]> = EMPTY

  readonly getIssuedCredentials$: Observable<IssuedCredential[]> = EMPTY

  readonly getOutgoingProofRequests$: Observable<OutgoingProofRequest[]> = EMPTY

  readonly getIncomingProofRequests$: Observable<IncomingProofRequest[]> = EMPTY

  readonly getReachableSubjects$: Observable<ReachableSubject[]> = EMPTY

  readonly submitFullInitialisation: OperatorFunction<AriesInitialisationData & InitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly generateDID$: Observable<DIDDetails> = EMPTY

  readonly registerDID: OperatorFunction<DIDDetails, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly autoRegisterDID: OperatorFunction<PublicDIDInitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly submitAppInitialisation: OperatorFunction<InitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly proposeMaster: OperatorFunction<MasterProposalData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly voteOnMasterProposal: OperatorFunction<MasterProposalVote, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly proposeSubject: OperatorFunction<SubjectProposalData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly voteOnSubjectProposal: OperatorFunction<SubjectProposalVote, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly getDescendants: OperatorFunction<string, string[]> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly updatePublicOnHeldCredential: OperatorFunction<HeldCredential, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly deleteHeldCredential: OperatorFunction<HeldCredentialData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly revokeIssuedCredential: OperatorFunction<IssuedCredential, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly issueCredential: OperatorFunction<IssuedCredential, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly respondToIncomingProofRequest: OperatorFunction<IncomingProofRequest, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly deleteOutgoingProofRequest: OperatorFunction<OutgoingProofRequest, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly createOutgoingProofRequest: OperatorFunction<NewProofRequest, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )
}
