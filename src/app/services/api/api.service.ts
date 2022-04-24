import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {API} from "@project-types";
import {HttpClient} from "@angular/common/http";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  readonly getMasters$ = this._getMasters$()
  readonly getMasterProposals$ = this._getMasterProposals$()
  readonly getSubjects$ = this._getSubjects$()
  readonly getSubjectProposals$ = this._getSubjectProposals$()
  readonly getHeldCredentials$ = this._getHeldCredentials$()
  readonly getIssuedCredentials$ = this._getIssuedCredentials$()
  readonly getOutgoingProofRequests$ = this._getOutgoingProofRequests$()
  readonly getIncomingProofRequests$ = this._getIncomingProofRequests$()
  readonly getReachableSubjects$ = this._getReachableSubjects$()
  readonly generateDID$ = this._generateDID$()

  constructor(
    private readonly http: HttpClient
  ) { }

  getStateUpdate$(body: API.State.UpdateReq) {
    return this.http.post<API.State.UpdateRes>('/state/update', body)
  }

  submitFullInitialisation$(body: API.FullInitialisationData) {
    return this.http.post('/state/fullInitialisation', body).pipe(
      map(() => undefined as void)
    )
  }

  registerDID$(body: API.DIDDetails) {
    return this.http.post('/state/did/register', body).pipe(
      map(() => undefined as void)
    )
  }

  autoRegisterDID$(body: API.PublicDIDInitialisationData) {
    return this.http.post('/state/did/auto', body).pipe(
      map(() => undefined as void)
    )
  }

  submitAppInitialisation$(body: API.InitialisationData) {
    return this.http.post('/state/initialise', body).pipe(
      map(() => undefined as void)
    )
  }

  proposeMaster$(body: API.MasterProposalData) {
    return this.http.post('/master/propose', body).pipe(
      map(() => undefined as void)
    )
  }

  voteOnMasterProposal$(body: API.MasterProposalVote) {
    return this.http.post('/master/vote', body).pipe(
      map(() => undefined as void)
    )
  }

  // TODO:
  proposeSubject$(body: API.SubjectProposalData) {
    return this.http.post('/state/update', body).pipe(
      map(() => undefined as void)
    )
  }

  voteOnSubjectProposal$(body: API.SubjectProposalVote) {
    return this.http.post('/ontology/vote', body).pipe(
      map(() => undefined as void)
    )
  }

  getDescendants$(body: string) {
    return this.http.post<string[]>('/descendants', body)
  }

  updatePublicOnHeldCredential$(body: API.HeldCredential) {
    return this.http.put('/credential/update', body).pipe(
      map(() => undefined as void)
    )
  }

  deleteHeldCredential$(body: API.HeldCredentialData) {
    return this.http.post('/credential/delete', body).pipe(
      map(() => undefined as void)
    )
  }

  revokeIssuedCredential$(body: API.IssuedCredential) {
    return this.http.post('/credential/revoke', body).pipe(
      map(() => undefined as void)
    )
  }

  issueCredential$(body: API.IssuedCredential) {
    return this.http.post('/credential/issue', body).pipe(
      map(() => undefined as void)
    )
  }

  // TODO:
  respondToIncomingProofRequest$(body: API.ResponseToIncomingProofRequest) {
    return this.http.post('/state/update', body).pipe(
      map(() => undefined as void)
    )
  }

  // TODO:
  deleteOutgoingProofRequest$(body: API.OutgoingProofRequest) {
    return this.http.post('/state/update', body).pipe(
      map(() => undefined as void)
    )
  }

  // TODO:
  createOutgoingProofRequest$(body: API.NewProofRequest) {
    return this.http.post('/state/update', body).pipe(
      map(() => undefined as void)
    )
  }

  private _getMasters$(): Observable<API.Master[]> {
    return this.http.get<API.Master[]>('/state/masters')
  }

  private _getMasterProposals$(): Observable<API.MasterProposal[]> {
  return this.http.get<API.MasterProposal[]>('/state/masterProposals')
}

  private _getSubjects$(): Observable<API.Subject[]> {
  return this.http.get<API.Subject[]>('/state/subjects')
}

  private _getSubjectProposals$(): Observable<API.SubjectProposal[]> {
  return this.http.get<API.SubjectProposal[]>('/state/subjectProposals')
}

  private _getHeldCredentials$(): Observable<API.HeldCredential[]> {
    return this.http.get<API.HeldCredential[]>('/state/heldCredentials')
  }

  private _getIssuedCredentials$(): Observable<API.IssuedCredential[]> {
    return this.http.get<API.IssuedCredential[]>('/state/issuedCredentials')
  }

  private _getOutgoingProofRequests$(): Observable<API.OutgoingProofRequest[]> {
    return this.http.get<API.OutgoingProofRequest[]>('/state/proofs/outgoing')
  }

  private _getIncomingProofRequests$(): Observable<API.IncomingProofRequest[]> {
    return this.http.get<API.IncomingProofRequest[]>('/state/proofs/incoming')
  }

  private _getReachableSubjects$(): Observable<API.ReachableSubject[]> {
    return this.http.get<API.ReachableSubject[]>('/state/reachableSubjects')
  }

  private _generateDID$(): Observable<API.DIDDetails> {
    return this.http.post<API.DIDDetails>('/state/did/generate', {})
  }
}
