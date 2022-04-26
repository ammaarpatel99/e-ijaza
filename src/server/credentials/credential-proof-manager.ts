import {API} from '@project-types'
import {CredentialProof} from "./credential-proof";
import {
  catchError,
  combineLatestWith,
  first, forkJoin,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  Subscription,
  switchMap,
  tap
} from "rxjs";
import {Immutable, voidObs$} from "@project-utils";
import {map} from "rxjs/operators";
import {State} from "../state";
import {SubjectOntology} from "../subject-ontology";
import {CredentialProofProtocol} from "../aries-based-protocols";

interface IncomingRequest {
  did: string
  subject: string
  pres_ex_id: string
  proof: false | {did: string, subject: string, credID: string}[]
}

export class CredentialProofManager {
  static readonly instance = new CredentialProofManager()
  private constructor() { }

  private static incomingID({did, subject}: {did: string, subject: string}) {
    return did + '-' + subject
  }

  private readonly outgoingProofs = new Map<CredentialProof, Immutable<API.OutgoingProofRequest>>()
  private readonly outgoingProofSubs = new Map<CredentialProof, Subscription>()
  private readonly incomingProofs = new Map<string, Immutable<IncomingRequest>>()
  private readonly _outgoingProofs$ = new ReplaySubject<Immutable<API.OutgoingProofRequest[]>>(1)
  private readonly _incomingProofs$ = new ReplaySubject<Immutable<API.IncomingProofRequest[]>>(1)
  readonly outgoingProofs$ = this._outgoingProofs$.asObservable()
  readonly incomingProofs$ = this._incomingProofs$.asObservable()

  private useRawCredentialsStream = false

  initialiseUser$() {
    return CredentialProofProtocol.instance.initialiseUser$().pipe(
      map(() => {
        this.watchIncomingProofs()
        this.watchState()
      })
    )
  }

  makeProofRequest(request: Immutable<API.NewProofRequest>) {
    const proof = new CredentialProof(request.did, request.subject)
    const subscription = proof.proof$.pipe(
      map(_proof => this.outgoingProofs.set(proof, _proof)),
      tap(() => this.updateOutgoing())
    ).subscribe()
    this.outgoingProofSubs.set(proof, subscription)
  }

  deleteOutgoingProofRequest(request: Immutable<API.OutgoingProofRequest>) {
    const proof = [...this.outgoingProofs.keys()]
      .filter(proof => proof.did === request.did && proof.subject === request.subject)
      .shift()
    if (!proof) throw new Error(`Deleting proof that doesn't exist`)
    this.outgoingProofSubs.delete(proof)
    this.outgoingProofs.delete(proof)
    this.updateOutgoing()
  }

  respondToRequest$(data: API.ResponseToIncomingProofRequest) {
    return voidObs$.pipe(
      map(() => {
        const request = this.incomingProofs.get(CredentialProofManager.incomingID(data))
        if (!request) throw new Error(`Responding to incoming proof request but no request`)
        return request
      }),
      switchMap(request => {
        if (!request.proof || !data.reveal) {
          return CredentialProofProtocol.instance.rejectProof$(request.pres_ex_id).pipe(
            map(() => {
              this.incomingProofs.delete(CredentialProofManager.incomingID(request))
              this.updateIncoming()
            })
          )
        }
        return CredentialProofProtocol.instance.respondToRequest$(request.pres_ex_id,
          request.proof.map(cred => ({cred_id: cred.credID, subject: cred.subject, issuerDID: cred.did}))
        ).pipe(
          map(() => {
            this.incomingProofs.delete(CredentialProofManager.incomingID(request))
            this.updateIncoming()
          })
        )
      })
    )
  }

  private updateOutgoing() {
    this._outgoingProofs$.next([...this.outgoingProofs.values()])
  }

  private updateIncoming() {
    this._incomingProofs$.next([...this.incomingProofs.values()].map(request => ({
      subject: request.subject, did: request.did,
      proof: !request.proof ? request.proof : request.proof.map(cred => ({...cred, credID: undefined}))
    })))
  }

  private watchIncomingProofs() {
    const obs$: Observable<void> = CredentialProofProtocol.instance.incomingRequest$.pipe(
      mergeMap(request =>
        this.autoRespondToRequest$(request.subject, request.pres_ex_id).pipe(
          switchMap(res => res ? voidObs$ :
            this.processIncomingRequest$(request.did, request.subject, request.pres_ex_id)
          )
        )
      ),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private autoRespondToRequest$(subject: string, pres_ex_id: string) {
    return this.getRequiredCreds$(subject, true).pipe(
      switchMap(creds => {
        if (!creds) return of(false)
        return CredentialProofProtocol.instance.respondToRequest$(pres_ex_id,
          creds.map(cred => ({cred_id: cred.credentialID, subject: cred.subject, issuerDID: cred.subject}))
        ).pipe(map(() => true))
      })
    )
  }

  private processIncomingRequest$(did: string, subject: string, pres_ex_id: string, updateOutput: boolean = true) {
    return this.getRequiredCreds$(subject, false).pipe(
      map(creds => {
        const request: IncomingRequest = {
          did, subject, pres_ex_id, proof: !creds ? false
            : creds.map(cred => ({credID: cred.credentialID, did: cred.issuerDID, subject: cred.subject}))
        }
        this.incomingProofs.set(CredentialProofManager.incomingID(request), request)
        if (updateOutput) this.updateIncoming()
      })
    )
  }

  private getRequiredCreds$(target: string, publicOnly: boolean) {
    const stream$ = this.useRawCredentialsStream ? State.instance._heldCredentials$ : State.instance.heldCredentials$
    return stream$.pipe(
      first(),
      map(creds => !publicOnly ? [...creds] : [...creds].filter(cred => cred.public)),
      switchMap(creds => {
        const credSubjectNames = creds.map(cred => cred.subject)
        return SubjectOntology.instance.getRequiredCredentials$(new Set(credSubjectNames), target).pipe(
          map(subjects => {
            if (!subjects) return undefined
            return subjects.map(subject => creds.filter(cred => cred.subject === subject).shift()!)
          })
        )
      })
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance._heldCredentials$.pipe(
      combineLatestWith(State.instance._subjectOntology$),
      tap(() => {
        State.instance.startUpdating()
        this.useRawCredentialsStream = true
      }),
      mergeMap(() => {
        const requests = [...this.incomingProofs.values()]
        this.incomingProofs.clear()
        const arr = requests.map(request =>
          this.autoRespondToRequest$(request.subject, request.pres_ex_id).pipe(
            switchMap(res => res ? voidObs$ :
              this.processIncomingRequest$(request.did, request.subject, request.pres_ex_id)
            )
          )
        )
        return forkJoin(arr)
      }),
      map(() => undefined as void),
      tap({
        next: () => {
          State.instance.stopUpdating()
          this.useRawCredentialsStream = false
        },
        error: () => {
          State.instance.stopUpdating()
          this.useRawCredentialsStream = false
        }
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
