import {BehaviorSubject, catchError, defer, first, from, of, switchMap, tap} from "rxjs";
import {Immutable, repeatWithBackoff$, voidObs$} from "@project-utils";
import {Server, API} from "@project-types";
import {createDID, getPublicDID, isAlive, setPublicDID} from "../aries-api"
import {map} from "rxjs/operators";
import {runAries} from "./run-aries";
import axios from "axios";
import {initialiseController$, initialiseUser$} from './initialise'
import {environment} from "../../environments/environment";

export class Initialisation {
  private static _instance: Initialisation | undefined
  static get instance() {
    if (!this._instance) this._instance = new Initialisation()
    return this._instance
  }
  private constructor() { }

  private initialisationDataCache: Immutable<API.InitialisationData> | undefined
  private readonly _initialisationData$ = new BehaviorSubject<Immutable<Server.InitialisationStateData>>({state: Server.InitialisationState.START_STATE})
  readonly initialisationData$ = this._initialisationData$.asObservable()

  fullInitialisation$(data: API.FullInitialisationData) {
    return this._initialisationData$.pipe(
      first(),
      map(state => {
        if (state.state !== Server.InitialisationState.START_STATE) {
          throw new Error(`Attempting to complete full initialisation whilst in incorrect state.`)
        }
      }),
      tap(() => this.initialisationDataCache = data),
      switchMap(() => this.createAriesAgent$(data)),
      switchMap(() => {
        if (!data.vonNetworkURL) {
          return this.fetchPublicDID$().pipe(
            switchMap(() => this.initialiseIfData$()),
            catchError(() => voidObs$)
          )
        }
        return this.fetchPublicDID$().pipe(
          switchMap(() => this.initialiseIfData$()),
          catchError(() => this.autoRegisterDID$({vonNetworkURL: data.vonNetworkURL!}))
        )
      })
    )
  }

  connectToAries$() {
    return this._initialisationData$.pipe(
      first(),
      map(data => {
        if (data.state !== Server.InitialisationState.START_STATE) {
          throw new Error(`Attempting to connect to Aries whilst in incorrect state.`)
        }
      }),
      switchMap(() => this._connectToAries$()),
      switchMap(() =>
        this.fetchPublicDID$()
          .pipe(catchError(e => {
            console.error(e)
            console.error(`This has occured after connecting to aries, and just means no public did is set yet`)
            return voidObs$
          }))
      )
    )
  }

  autoRegisterDID$({vonNetworkURL}: API.PublicDIDInitialisationData) {
    return this._initialisationData$.pipe(
      first(),
      map(state => {
        if (state.state !== Server.InitialisationState.ARIES_READY) {
          throw new Error(`Attempting to auto register public did whilst in incorrect state.`)
        }
      }),
      switchMap(() => this._autoRegisterDID$(vonNetworkURL)),
      switchMap(() => this.initialiseIfData$())
    )
  }

  registerDID$(data: API.DIDDetails) {
    return this._initialisationData$.pipe(
      first(),
      map(data => {
        if (data.state !== Server.InitialisationState.ARIES_READY) {
          throw new Error(`Attempting to register public did whilst in incorrect state.`)
        }
      }),
      switchMap(() => this._registerDID$(data.did)),
      switchMap(() => this.initialiseIfData$())
    )
  }

  generateDID$() {
    return defer(() => from(createDID({}))).pipe(
      map(res => ({did: res.result?.did!, verkey: res.result?.verkey!}))
    )
  }

  initialise$(data: API.InitialisationData) {
    return this._initialisationData$.pipe(
      first(),
      map(state => {
        if (state.state !== Server.InitialisationState.PUBLIC_DID_REGISTERED) {
          throw new Error(`Attempting to initialise whilst in incorrect state.`)
        }
      }),
      switchMap(() => this._initialise$(data))
    )
  }

  private initialiseIfData$() {
    return defer(() => of(this.initialisationDataCache)).pipe(
      switchMap(data => data ? this._initialise$(data) : voidObs$)
    )
  }

  private fetchPublicDID$() {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.REGISTERING_PUBLIC_DID})
      }),
      switchMap(() => from(getPublicDID())),
      map(result => result.result?.did),
      map(did => {
        if (!did) throw new Error(`No Public DID registered on aries agent`)
        return did
      }),
      tap({
        next: did => this._initialisationData$.next({state: Server.InitialisationState.PUBLIC_DID_REGISTERED, did}),
        error: () => this._initialisationData$.next({state: Server.InitialisationState.ARIES_READY})
      }),
      map(() => undefined as void)
    )
  }

  private _registerDID$(did: string) {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.REGISTERING_PUBLIC_DID})
      }),
      switchMap(() => from(setPublicDID({did}))),
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.PUBLIC_DID_REGISTERED, did}),
        error: () => this._initialisationData$.next({state: Server.InitialisationState.ARIES_READY})
      }),
      map(() => undefined as void)
    )
  }

  private _autoRegisterDID$(vonNetworkURL: string) {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.REGISTERING_PUBLIC_DID})
      }),
      switchMap(() => this.generateDID$()),
      switchMap(didData =>
        from(axios.post(vonNetworkURL + '/register', {role: 'ENDORSER', alias: null, did: didData.did, verkey: didData.verkey}))
          .pipe(
            switchMap(() => from(setPublicDID({did: didData.did}))),
            map(() => didData.did)
          )
      ),
      tap({
        next: did => this._initialisationData$.next({state: Server.InitialisationState.PUBLIC_DID_REGISTERED, did}),
        error: () => this._initialisationData$.next({state: Server.InitialisationState.ARIES_READY})
      }),
      map(() => undefined as void)
    )
  }

  private waitForAries$() {
    return defer(() => from(isAlive())).pipe(
      map(result => ({success: result.alive || false})),
      repeatWithBackoff$<undefined>({
        initialTimeout: 1000,
        exponential: false,
        backoff: 1000,
        maxRepeats: 20,
        failCallback: () => { throw new Error(`Aries didn't start`) }
      }),
      map(() => undefined as void)
    )
  }

  private createAriesAgent$(data: Omit<API.AriesInitialisationData, 'vonNetworkURL'>) {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.STARTING_ARIES})
      }),
      map(() => runAries({
        advertisedEndpoint: data.advertisedEndpoint,
        genesisUrl: data.genesisURL,
        tailsServerUrl: data.tailsServerURL,
        walletKey: 'walletKey',
        walletName: 'walletName'
      })),
      tap({
        error: () => this._initialisationData$.next({state: Server.InitialisationState.START_STATE})
      }),
      switchMap(() => this.waitForAries$()),
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.ARIES_READY}),
        error: () => this._initialisationData$.next({state: Server.InitialisationState.START_STATE})
      }),
      map(() => undefined as void)
    )
  }

  private _connectToAries$() {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.STARTING_ARIES})
      }),
      switchMap(() => from(isAlive())),
      map(result => {
        if (!result.alive) throw new Error(`Can't establish connection with Aries agent.`)
      }),
      tap({
        next: () => this._initialisationData$.next({state: Server.InitialisationState.ARIES_READY}),
        error: () => this._initialisationData$.next({state: Server.InitialisationState.START_STATE})
      }),
      map(() => undefined as void)
    )
  }

  private _initialise$(data: API.InitialisationData) {
    return voidObs$.pipe(
      tap({
        next: () => this._initialisationData$.next({
          state: Server.InitialisationState.INITIALISING,
          did: (this._initialisationData$.value as {did: string}).did,
          name: environment.controllerName,
          ...data
        })
      }),
      switchMap(() => (
          data.appType === API.AppType.CONTROLLER
          ? initialiseController$()
          : initialiseUser$()
        )
      ),
      tap({
        next: () => this._initialisationData$.next({
          ...this._initialisationData$.value,
          state: Server.InitialisationState.COMPLETE
        } as Server.InitialisationStateData),
        error: () => this._initialisationData$.next({
          state: Server.InitialisationState.PUBLIC_DID_REGISTERED,
          did: (this._initialisationData$.value as {did: string}).did
        })
      }),
      map(() => undefined as void)
    )
  }
}
