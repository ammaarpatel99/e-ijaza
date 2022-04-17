import {Immutable} from "@project-utils";
import {API} from '@project-types'
import {State} from '../../state'

interface _TimedData<T> {
  timestamp: number
  data: T
}
type TimedData<T> = Immutable<_TimedData<T>>


export class StateManager {
  static readonly instance = new StateManager()
  private constructor() { this.initialise() }

  private initState: API.State.InitialisationState = API.State.InitialisationState.START_STATE

  private did: string | undefined

  private appType: API.AppType | undefined

  private _masters: TimedData<API.Master[]> | undefined
  get masters() {
    const data = this._masters?.data
    if (data === undefined) throw new Error(`Requested masters from state (api) but not set`)
    return data
  }

  private _masterProposals: TimedData<API.MasterProposalsFetchRes> | undefined
  get masterProposals() {
    const data = this._masterProposals?.data
    if (data === undefined) throw new Error(`Requested master proposals from state (api) but not set`)
    return data
  }

  private _subjects: TimedData<API.Subject[]> | undefined
  get subjects() {
    const data = this._subjects?.data
    if (data === undefined) throw new Error(`Requested subjects from state (api) but not set`)
    return data
  }

  private _subjectProposals: TimedData<API.SubjectProposalsFetchRes> | undefined
  get subjectProposals() {
    const data = this._subjectProposals?.data
    if (data === undefined) throw new Error(`Requested subject proposals from state (api) but not set`)
    return data
  }

  private _heldCredentials: TimedData<API.HeldCredential[]> | undefined
  get heldCredentials() {
    const data = this._heldCredentials?.data
    if (data === undefined) throw new Error(`Requested held credentials from state (api) but not set`)
    return data
  }

  private _issuedCredentials: TimedData<API.IssuedCredential[]> | undefined
  get issuedCredentials() {
    const data = this._issuedCredentials?.data
    if (data === undefined) throw new Error(`Requested issued credentials from state (api) but not set`)
    return data
  }

  private _outgoingProofRequests: TimedData<API.OutgoingProofRequest[]> | undefined
  get outgoingProofRequests() {
    const data = this._outgoingProofRequests?.data
    if (data === undefined) throw new Error(`Requested outgoing proof requests from state (api) but not set`)
    return data
  }

  private _incomingProofRequests: TimedData<API.IncomingProofRequest[]> | undefined
  get incomingProofRequests() {
    const data = this._incomingProofRequests?.data
    if (data === undefined) throw new Error(`Requested incoming proof requests from state (api) but not set`)
    return data
  }

  private _reachableSubjects: TimedData<API.ReachableSubject[]> | undefined
  get reachableSubjects() {
    const data = this._reachableSubjects?.data
    if (data === undefined) throw new Error(`Requested reachable subjects from state (api) but not set`)
    return data
  }

  private initialise() {
    const state = State.instance
    state.initialisationState$.subscribe(data => this.initState = data)
    state.did$.subscribe(data => this.did = data)
    state.appType$.subscribe(data => this.appType = data)
    state.controllerMasters$.subscribe(data => this._masters = {
      timestamp: Date.now(),
      data: [...data].map(([did, subjectsMap]) => {
        const subjects = [...subjectsMap].map(([subject]) => subject)
        return {did, subjects}
      })
    })
    state.userMasters$.subscribe(data => this._masters = {
      timestamp: Date.now(),
      data: [...data].map(([did, subjectsSet]) => ({did, subjects: [...subjectsSet]}))
    })
    // TODO: add remaining
  }

  private static hasNewData<T>(data: TimedData<T> | undefined, timestamp: number) {
    return data?.data && data.timestamp > timestamp
  }

  getStateUpdate(req: API.State.UpdateReq): API.State.UpdateRes {
    return {
      state: this.initState,
      did: this.did,
      appType: this.appType,
      timestamp: Date.now(),
      masters: StateManager.hasNewData(this._masters, req.timestamp),
      masterProposals: StateManager.hasNewData(this._masterProposals, req.timestamp),
      subjects: StateManager.hasNewData(this._subjects, req.timestamp),
      subjectProposals: StateManager.hasNewData(this._subjectProposals, req.timestamp),
      heldCredentials: StateManager.hasNewData(this._heldCredentials, req.timestamp),
      issuedCredentials: StateManager.hasNewData(this._issuedCredentials, req.timestamp),
      outgoingProofRequests: StateManager.hasNewData(this._outgoingProofRequests, req.timestamp),
      incomingProofRequests: StateManager.hasNewData(this._incomingProofRequests, req.timestamp),
      reachableSubjects: StateManager.hasNewData(this._reachableSubjects, req.timestamp)
    } as API.State.UpdateRes
  }
}
