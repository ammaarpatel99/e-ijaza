import {CredentialProofProtocol} from "../aries-based-protocols";
import {map, switchMap} from "rxjs/operators";
import {BehaviorSubject, Observable, ReplaySubject, withLatestFrom} from "rxjs";
import {State} from "../state";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";

export interface Proof {
  did: string
  subject: string
  result: boolean | null
  proof: Proof[] | boolean | null
}

export class CredentialProof {
  private readonly proof: Proof
  private readonly subscription
  private readonly _proof$
  readonly proof$

  constructor(readonly did: string, readonly subject: string) {
    this.proof = {did, subject, result: null, proof: null}
    this._proof$ = new BehaviorSubject(this.deepCopy(this.proof))
    this.proof$ = this._proof$.asObservable()
    this.subscription = this.prove$(this.proof).subscribe()
  }

  delete() {
    if (this.proof.result === null) {
      this.proof.result = false
    }
    this.subscription.unsubscribe()
    this._proof$.complete()
  }

  private deepCopy(proof: Proof = this.proof): Proof {
    return {
      did: proof.did,
      subject: proof.subject,
      result: proof.result,
      proof: !Array.isArray(proof.proof) ? proof.proof :
        proof.proof.map(proof => this.deepCopy(proof))
    }
  }

  private updateResults(proof: Proof = this.proof) {
    if (proof.result !== null) return proof.result
    if (!Array.isArray(proof.proof)) {
      proof.result = proof.proof
      return proof.proof
    }
    const results = proof.proof.map(x => this.updateResults(x))
    if (results.includes(false)) proof.result = false
    else if (results.includes(null)) proof.result = null
    else proof.result = true
    return proof.result
  }

  private update() {
    this.updateResults()
    this._proof$.next(this.deepCopy())
  }

  private getFoundProof(did: string, subject: string) {
    const searchQueue = [this.proof]
    const found = new Set([this.proof])
    while (searchQueue.length > 0) {
      const next = searchQueue.pop()!
      if (next.did === did && next.subject === subject) return next
      if (Array.isArray(next.proof)) {
        next.proof
          .filter(x => !found.has(x))
          .forEach(x => { found.add(x); searchQueue.push(x) })
      }
    }
    return null
  }

  private prove$(proof: Proof): Observable<void> {
    const obs$ = CredentialProofProtocol.instance.requestProof$(proof.did, proof.subject).pipe(
      withLatestFrom(State.instance._controllerDID$),
      switchMap(([result, controllerDID]) => {
        if (result === undefined) {
          proof.proof = false
          proof.result = false
          this.update()
          return voidObs$
        }
        const existingResults = result
          .map(data => this.getFoundProof(data.issuerDID, data.subject))
          .filter(proof => proof !== null)
          .map(proof => proof as Exclude<typeof proof, null>)
        const newResults = result
          .filter(data => this.getFoundProof(data.issuerDID, data.subject) === null)
          .map((data): Proof => {
            const proofRes = data.issuerDID === controllerDID || null
            return {did: data.issuerDID, subject: data.subject, proof: proofRes, result: proofRes}
          })
        proof.proof = [...existingResults, ...newResults]
        this.update()
        return forkJoin$(newResults.map(proof => this.prove$(proof)))
      }),
      map(() => undefined as void)
    )

    return voidObs$.pipe(
      switchMap(() => {
        if (this.proof.result !== null) return voidObs$
        return obs$
      })
    )
  }
}
