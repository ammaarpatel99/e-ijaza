import {Injectable} from '@angular/core';
import {EMPTY, Observable, of, OperatorFunction, switchMap, tap} from "rxjs";
import {API} from "@project-types";

let i = 0
function stateUpdateRes(): API.State.UpdateRes {
  if (i === 0) {
    i++
    return {
      state: API.InitialisationState.COMPLETE,
      did: 'my did',
      appType: API.AppType.USER,
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
    state: API.InitialisationState.COMPLETE,
    did: 'my did',
    appType: API.AppType.USER,
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

  readonly getStateUpdate: OperatorFunction<API.State.UpdateReq, API.State.UpdateRes> =
    source => source.pipe(
      switchMap(() => {
        return of(stateUpdateRes())
      })
    )

  readonly getMasters$: Observable<API.Master[]> = of([{
    did: 'master did',
    subjects: ['subject 1']
  }])

  readonly getMasterProposals$: Observable<API.MasterProposal[]> = of([{
    did: 'master 2',
    subject: 'subject 1',
    proposalType: API.ProposalType.ADD
  }])

  readonly getSubjects$: Observable<API.Subject[]> = of([
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

  readonly getSubjectProposals$: Observable<API.SubjectProposal[]> = of([{
    proposalType: API.ProposalType.ADD,
    subject: 'subject 1',
    change: {
      type: API.SubjectProposalType.COMPONENT_SET,
      componentSet: ['subject 2', 'subject 3']
    }
  }])

  readonly getHeldCredentials$: Observable<API.HeldCredential[]> = of([{
    did: 'issuer did',
    subject: 'subject 1',
    public: false
  }])

  readonly getIssuedCredentials$: Observable<API.IssuedCredential[]> = of([{
    did: 'receiver did',
    subject: 'subject 2'
  }])

  readonly getOutgoingProofRequests$: Observable<API.OutgoingProofRequest[]> = of([{
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

  readonly getIncomingProofRequests$: Observable<API.IncomingProofRequest[]> = of([{
    did: 'someone else',
    subject: 'a subject',
    proof: false
  },{
    did: 'someone else',
    subject: 'a different subject',
    proof: [{did: 'a teacher', subject: 'one subject'}, {did: 'another teacher', subject: 'second subject'}]
  }])

  readonly getReachableSubjects$: Observable<API.ReachableSubject[]> = of([
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

  readonly submitFullInitialisation: OperatorFunction<API.FullInitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly generateDID$: Observable<API.DIDDetails> = EMPTY

  readonly registerDID: OperatorFunction<API.DIDDetails, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly autoRegisterDID: OperatorFunction<API.PublicDIDInitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly submitAppInitialisation: OperatorFunction<API.InitialisationData, void> =
    source => source.pipe(
      switchMap(() => EMPTY)
    )

  readonly proposeMaster: OperatorFunction<API.MasterProposalData, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly voteOnMasterProposal: OperatorFunction<API.MasterProposalVote, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly proposeSubject: OperatorFunction<API.SubjectProposalData, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly voteOnSubjectProposal: OperatorFunction<API.SubjectProposalVote, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly getDescendants: OperatorFunction<string, string[]> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(['subject 2', 'subject 3']))
    )

  readonly updatePublicOnHeldCredential: OperatorFunction<API.HeldCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly deleteHeldCredential: OperatorFunction<API.HeldCredentialData, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly revokeIssuedCredential: OperatorFunction<API.IssuedCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly issueCredential: OperatorFunction<API.IssuedCredential, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly respondToIncomingProofRequest: OperatorFunction<API.IncomingProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly deleteOutgoingProofRequest: OperatorFunction<API.OutgoingProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )

  readonly createOutgoingProofRequest: OperatorFunction<API.NewProofRequest, void> =
    source => source.pipe(
      tap(x => console.log(x)),
      switchMap(() => of(undefined))
    )
}
