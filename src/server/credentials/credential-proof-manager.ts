import {API, Server} from '@project-types'
import {CredentialProof} from "./credential-proof";
import {
  catchError,
  combineLatestWith,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  tap
} from "rxjs";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
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
  private static _instance: CredentialProofManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new CredentialProofManager()
    return this._instance
  }
  private constructor() { }

  private static incomingID({did, subject}: {did: string, subject: string}) {
    return did + '-' + subject
  }

  private readonly outgoingProofs = new Map<CredentialProof, Immutable<API.OutgoingProofRequest>>()
  private readonly incomingProofs = new Map<string, Immutable<IncomingRequest>>()
  private readonly _outgoingProofs$ = new ReplaySubject<Immutable<API.OutgoingProofRequest[]>>(1)
  private readonly _incomingProofs$ = new ReplaySubject<Immutable<API.IncomingProofRequest[]>>(1)
  readonly outgoingProofs$ = this._outgoingProofs$.asObservable()
  readonly incomingProofs$ = this._incomingProofs$.asObservable()

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
    proof.proof$.pipe(
      map(_proof => this.outgoingProofs.set(proof, _proof)),
      tap(() => this.updateOutgoing())
    ).subscribe()
  }

  deleteOutgoingProofRequest(request: Immutable<API.OutgoingProofRequest>) {
    const proof = [...this.outgoingProofs.keys()]
      .filter(proof => proof.did === request.did && proof.subject === request.subject)
      .shift()
    if (!proof) throw new Error(`Deleting proof that doesn't exist`)
    this.outgoingProofs.delete(proof)
    proof.delete()
    this.updateOutgoing()
  }

  respondToRequest$(data: API.ResponseToIncomingProofRequest) {
    return voidObs$.pipe(
      map(() => {
        const request = this.incomingProofs.get(CredentialProofManager.incomingID(data))
        if (!request) throw new Error(`Responding to incoming proof request but no request`)
        this.incomingProofs.delete(CredentialProofManager.incomingID(request))
        this.updateIncoming()
        return request
      }),
      switchMap(request => {
        if (!request.proof || !data.reveal) {
          return CredentialProofProtocol.instance.rejectProof$(request.pres_ex_id)
        }
        return CredentialProofProtocol.instance.respondToRequest$(request.pres_ex_id,
          request.proof.map(cred => ({cred_id: cred.credID, subject: cred.subject, issuerDID: cred.did}))
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
      map((request) => {
        this.incomingProofs.set(CredentialProofManager.incomingID(request), {...request, proof: false})
        this.updateIncoming()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private getRequiredCreds$(target: string, publicOnly: boolean, heldCredentials: Immutable<Server.UserHeldCredentials>) {
    const creds = !publicOnly ? [...heldCredentials] : [...heldCredentials].filter(cred => cred.public)
    const subjects = new Set(creds.map(cred => cred.subject))
    return SubjectOntology.instance.getRequiredCredentials$(subjects, target).pipe(
      map(subjects => {
        if (!subjects) return undefined
        return subjects.map(subject => creds.filter(cred => cred.subject === subject).shift()!)
      })
    )
  }

  private autoRespondToRequest$(subject: string, pres_ex_id: string, heldCredentials: Immutable<Server.UserHeldCredentials>) {
    return this.getRequiredCreds$(subject, true, heldCredentials).pipe(
      switchMap(creds => {
        if (!creds) return of(false)
        return CredentialProofProtocol.instance.respondToRequest$(pres_ex_id,
          creds.map(cred => ({cred_id: cred.credentialID, subject: cred.subject, issuerDID: cred.issuerDID}))
        ).pipe(map(() => true))
      })
    )
  }

  private removeInvalidAndAutoResponse$(heldCredentials: Immutable<Server.UserHeldCredentials>, subjects: Immutable<Server.Subjects>) {
    const requests$ = [...this.incomingProofs]
      .map(([id, data]) => {
        if (!subjects.has(data.subject)) {
          this.incomingProofs.delete(id)
          return CredentialProofProtocol.instance.rejectProof$(data.pres_ex_id)
            .pipe(map(() => true))
        }
        return this.autoRespondToRequest$(data.subject, data.pres_ex_id, heldCredentials).pipe(
          tap(success => {
            if (success) this.incomingProofs.delete(id)
          }),
          catchError(e => {
            console.error(e)
            return voidObs$
          })
        )
      })
    return forkJoin$(requests$).pipe(
      map(res => res.includes(true))
    )
  }

  private updateProofs$(heldCredentials: Immutable<Server.UserHeldCredentials>) {
    const areProofsChanged = (
      proof1: Immutable<IncomingRequest['proof']>,
      proof2: Immutable<IncomingRequest['proof']>
    ) => {
      if (proof1 === false || proof2 === false) return proof2 !== proof1
      if (proof1.length !== proof2.length) return true
      const creds1 = new Set(proof1.map(cred => `${cred.credID}-${cred.did}-${cred.subject}`))
      return proof2
        .map(cred => `${cred.credID}-${cred.did}-${cred.subject}`)
        .filter(credString => !creds1.has(credString))
        .length > 0
    }

    const requests$ = [...this.incomingProofs]
      .map(([id, data]) => {
        return this.getRequiredCreds$(data.subject, false, heldCredentials).pipe(
          map(creds => {
            const _data = {...data}
            if (!creds) _data.proof = false
            else _data.proof = creds.map(cred => ({credID: cred.credentialID, subject: cred.subject ,did: cred.issuerDID}))
            if (areProofsChanged(data.proof, _data.proof)) {
              this.incomingProofs.set(id, _data)
              return true
            }
            return false
          })
        )
      })
    return forkJoin$(requests$).pipe(
      map(res => res.includes(true))
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance._heldCredentials$.pipe(
      combineLatestWith(State.instance._subjectOntology$, this._incomingProofs$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([heldCredentials, subjects]) =>
        this.removeInvalidAndAutoResponse$(heldCredentials, subjects).pipe(
          switchMap(changed =>
            this.updateProofs$(heldCredentials)
              .pipe(map(_changed => _changed || changed))
          )
        )
      ),
      map(changed => {
        if (changed) this.updateIncoming()
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
