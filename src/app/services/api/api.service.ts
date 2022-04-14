import {Injectable} from '@angular/core';
import {EMPTY, Observable, of, OperatorFunction, switchMap, tap} from "rxjs";
import {
  AppType,
  DIDDetails,
  FullInitialisationData,
  HeldCredential,
  HeldCredentialData,
  IncomingProofRequest,
  InitialisationData,
  InitialisationState,
  IssuedCredential,
  Master,
  MasterProposal,
  MasterProposalData,
  MasterProposalVote,
  NewProofRequest,
  OutgoingProofRequest,
  ProposalType,
  PublicDIDInitialisationData,
  ReachableSubject,
  Subject,
  SubjectProposal,
  SubjectProposalData,
  SubjectProposalType,
  SubjectProposalVote,
  UpdateReq,
  UpdateRes
} from "@project-types/interface-api";

let i = 0
function stateUpdateRes(): UpdateRes {
  if (i === 0) {
    i++
    return {
      state: InitialisationState.COMPLETE,
      did: 'my did',
      appType: AppType.USER,
      timestamp: 0,
      subjects: true,
      masterProposals: true,
      masters: true,
      incomingProofRequests: true,
      outgoingProofRequests: true,
      issuedCredentials: true,
      heldCredentials: true,
      reachableSubjects: true,
      subjectProposals: true
    }
  }
  return {
    state: InitialisationState.COMPLETE,
    did: 'my did',
    appType: AppType.USER,
    timestamp: 0,
    subjects: false,
    masterProposals: false,
    masters: false,
    incomingProofRequests: false,
    outgoingProofRequests: false,
    issuedCredentials: false,
    heldCredentials: false,
    reachableSubjects: false,
    subjectProposals: false
  }
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }

  readonly getStateUpdate: OperatorFunction<UpdateReq, UpdateRes> =
    source => source.pipe(
      switchMap(() => {
        return of(stateUpdateRes())
      })
    )

  readonly getMasters$: Observable<Master[]> = of([{
    did: 'master did',
    subjects: ['subject 1']
  }])

  readonly getMasterProposals$: Observable<MasterProposal[]> = of([{
    did: 'master 2',
    subject: 'subject 1',
    proposalType: ProposalType.ADD
  }])

  readonly getSubjects$: Observable<Subject[]> = of([
    {
      name: 'subject 1',
      componentSets: [],
      children: ['subject 2']
    },
    {
      name: 'subject 2',
      componentSets: [],
      children: ['subject 3']
    },
    {
      name: 'subject 3',
      componentSets: [],
      children: []
    }
    ])

  readonly getSubjectProposals$: Observable<SubjectProposal[]> = of([{
    proposalType: ProposalType.ADD,
    subject: 'subject 1',
    change: {
      type: SubjectProposalType.COMPONENT_SET,
      componentSet: ['subject 2', 'subject 3']
    }
  }])

  readonly getHeldCredentials$: Observable<HeldCredential[]> = of([{
    did: 'issuer did',
    subject: 'subject 1',
    public: false
  }])

  readonly getIssuedCredentials$: Observable<IssuedCredential[]> = of([{
    did: 'receiver did',
    subject: 'subject 2'
  }])

  readonly getOutgoingProofRequests$: Observable<OutgoingProofRequest[]> = of([{
    did: 'did to check',
    subject: 'subject to check',
    result: null,
    proof: [{
      did: 'third party',
      subject: 'a subject',
      proof: true,
      result: true
    },{
      did: 'fourth party',
      subject: 'another subject',
      proof: [],
      result: null
    }]
  }])

  readonly getIncomingProofRequests$: Observable<IncomingProofRequest[]> = of([{
    did: 'someone else',
    subject: 'a subject',
    proof: false
  },{
    did: 'someone else',
    subject: 'a different subject',
    proof: [{did: 'a teacher', subject: 'one subject'}, {did: 'another teacher', subject: 'second subject'}]
  }])

  readonly getReachableSubjects$: Observable<ReachableSubject[]> = of([
    {
      name: 'subject 1',
      reachableByMasterCredentials: true
    },
    {
      name: 'subject 2',
      reachableByMasterCredentials: true
    },
    {
      name: 'subject 3',
      reachableByMasterCredentials: true
    }
  ])

  readonly submitFullInitialisation: OperatorFunction<FullInitialisationData, void> =
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
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly voteOnMasterProposal: OperatorFunction<MasterProposalVote, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly proposeSubject: OperatorFunction<SubjectProposalData, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly voteOnSubjectProposal: OperatorFunction<SubjectProposalVote, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly getDescendants: OperatorFunction<string, string[]> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(['subject 2', 'subject 3']))
    )

  readonly updatePublicOnHeldCredential: OperatorFunction<HeldCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly deleteHeldCredential: OperatorFunction<HeldCredentialData, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly revokeIssuedCredential: OperatorFunction<IssuedCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly issueCredential: OperatorFunction<IssuedCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly respondToIncomingProofRequest: OperatorFunction<IncomingProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly deleteOutgoingProofRequest: OperatorFunction<OutgoingProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly createOutgoingProofRequest: OperatorFunction<NewProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )
}
