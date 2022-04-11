import {BehaviorSubject, first, from, of, switchMap, tap} from "rxjs";
import {InitialisationData} from "@project-types/server";
import {Immutable, repeatWithBackoff$} from "@project-utils";
import {AriesInitialisationData, InitialisationState} from "@project-types/interface-api";
import {createDID, getPublicDID, isAlive} from "@server/aries-api-wrapper"
import {map} from "rxjs/operators";
import {runAries} from "@server/initialisation/run-aries";
import axios from "axios";

export class Initialisation {
  static readonly instance = new Initialisation()
  private constructor() { }

  private readonly _initialisationData$ = new BehaviorSubject<Immutable<InitialisationData>>({state: InitialisationState.START_STATE})
  readonly initialisationData$ = this._initialisationData$.asObservable()

  createAriesAgent$(data: AriesInitialisationData) {
    return this.initialisationData$.pipe(
      first(),
      map(data => {
        if (data.state >= InitialisationState.STARTING_ARIES)
          throw new Error(`Testing Aries Connection when already connected`)
      }),
      tap(() => this._initialisationData$.next({state: InitialisationState.STARTING_ARIES})),
      tap(() => runAries({
        advertisedEndpoint: data.advertisedEndpoint,
        genesisUrl: data.genesisURL,
        tailsServerUrl: data.tailsServerURL,
        walletKey: 'walletKey',
        walletName: 'walletName'
      })),
      switchMap(() => this.waitForAries$()),
      switchMap(() => {
        if (!data.vonNetworkURL || this._initialisationData$.value.state !== InitialisationState.ARIES_READY) return of(undefined)
        return this.autoRegisterDID$(data.vonNetworkURL)
      })
    )
  }

  connectToAries$() {
    return this.initialisationData$.pipe(
      first(),
      map(data => {
        if (data.state >= InitialisationState.ARIES_READY)
          throw new Error(`Testing Aries Connection when already connected`)
      }),
      switchMap(() => from(isAlive())),
      map(result => result.alive),
      switchMap(alive => {
        if (
          !alive ||
          this._initialisationData$.value.state >= InitialisationState.ARIES_READY
        ) return of(undefined)
        this._initialisationData$.next(
          {state: InitialisationState.ARIES_READY}
        )
        return this.fetchPublicDID$()
      })
    )
  }

  generateDID$() {
    return from(createDID({})).pipe(
      map(res => ({did: res.result?.did!, verkey: res.result?.verkey!}))
    )
  }

  initialise$(data: InitialisationData) {
    return this.initialisationData$.pipe(
      map(data => {
        if (data.state >= InitialisationState.COMPLETE)
          throw new Error(`Can't initialise when already complete`)
      }),
      switchMap(() => from(isAlive())),
      map(result => result.alive),
      switchMap(alive => {
        if (
          !alive ||
          this._initialisationData$.value.state >= InitialisationState.ARIES_READY
        ) return of(undefined)
        this._initialisationData$.next(
          {state: InitialisationState.ARIES_READY}
        )
        return this.fetchPublicDID$()
      })
    )
  }

  private waitForAries$() {
    return from(isAlive()).pipe(
      map(result => ({success: result.alive || false})),
      repeatWithBackoff$<undefined>({
        initialTimeout: 1000,
        exponential: false,
        backoff: 500,
        maxRepeats: 20
      }),
      switchMap(alive => {
        if (
          !alive.success ||
          this._initialisationData$.value.state >= InitialisationState.ARIES_READY
        ) return of(undefined)
        this._initialisationData$.next(
          {state: InitialisationState.ARIES_READY}
        )
        return this.fetchPublicDID$()
      })
    )
  }

  private fetchPublicDID$() {
    return this.initialisationData$.pipe(
      first(),
      map(data => {
        if (data.state >= InitialisationState.PUBLIC_DID_REGISTERED)
          throw new Error(`Fetching Public DID when already registered`)
      }),
      switchMap(() => from(getPublicDID())),
      map(result => result.result?.did),
      switchMap(did => {
        if (
          !did ||
          this._initialisationData$.value.state >= InitialisationState.PUBLIC_DID_REGISTERED
        ) return of(undefined)
        this._initialisationData$.next(
          {state: InitialisationState.PUBLIC_DID_REGISTERED, did}
        )
        return of(undefined) // TODO: initialise
      })
    )
  }

  private autoRegisterDID$(vonNetworkURL: string) {
    return this.generateDID$().pipe(
      switchMap(did => from(
        axios.post(vonNetworkURL + '/register', {role: 'ENDORSER', alias: null, ...did})
      ).pipe(map(() => did.did))),
      map(did => {
        this._initialisationData$.next({state: InitialisationState.PUBLIC_DID_REGISTERED, did})
      })
    )
  }
}
