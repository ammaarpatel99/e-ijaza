import {Immutable} from "@project-utils";
import {API} from '@project-types'
import {State} from '../state'
import {map} from "rxjs/operators";
import {defer, of} from "rxjs";

interface _TimedData<T> {
  timestamp: number
  data: T
}
type TimedData<T> = Immutable<_TimedData<T>>

export function initialiseAPIStateTracker$() {
  return defer(() => of(StateManager.instance)).pipe(
    map(() => undefined as void)
  )
}

export class StateManager {
  private static _instance: StateManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new StateManager()
    return this._instance
  }
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

  private _masterProposals: TimedData<API.MasterProposal[]> | undefined
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

  private _subjectProposals: TimedData<API.SubjectProposal[]> | undefined
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
      data: [...data]
        .map(([did, subjects]) => {
          const subjectNames = [...subjects].map(([name]) => name)
          return {did, subjects: subjectNames}
        })
    })

    state.userMasters$.subscribe(data => this._masters = {
      timestamp: Date.now(),
      data: [...data].map(([did, subjects]) => ({did, subjects: [...subjects]}))
    })

    state.subjectOntology$.subscribe(data => this._subjects = {
      timestamp: Date.now(),
      data: [...data].map(([subject, data]) => ({
        name: subject,
        children: [...data.children],
        componentSets: [...data.componentSets].map(set => [...set])
      }))
    })

    state.controllerMasterProposals$.subscribe(data => this._masterProposals = {
      timestamp: Date.now(),
      data: [...data].map(([_, proposal]) => ({
        did: proposal.did,
        proposalType: proposal.proposalType,
        subject: proposal.subject,
        votes: {
          for: [...proposal.votes.values()].map(vote => vote === true).length,
          against: [...proposal.votes.values()].map(vote => vote === false).length,
          total: proposal.votes.size
        }
      }))
    })

    state.userMasterVotes$.subscribe(data => this._masterProposals = {
      timestamp: Date.now(),
      data: [...data].map(([_, proposal]) => ({
        did: proposal.did,
        proposalType: proposal.proposalType,
        subject: proposal.subject
      }))
    })

    state.controllerOntologyProposals$.subscribe(data => this._subjectProposals = {
      timestamp: Date.now(),
      data: [...data].map(([_, proposal]) => ({
        subject: proposal.subject,
        proposalType: proposal.proposalType,
        change: proposal.change.type === API.SubjectProposalType.CHILD
          ? {type: API.SubjectProposalType.CHILD, child: proposal.change.child}
          : {type: API.SubjectProposalType.COMPONENT_SET, componentSet: [...proposal.change.component_set]},
        votes: {
          for: [...proposal.votes.values()].map(vote => vote === true).length,
          against: [...proposal.votes.values()].map(vote => vote === false).length,
          total: proposal.votes.size
        }
      }))
    })

    state.userOntologyVotes$.subscribe(data => this._subjectProposals = {
      timestamp: Date.now(),
      data: [...data].map(([_, proposal]) => ({
        subject: proposal.subject,
        proposalType: proposal.proposalType,
        change: proposal.change.type === API.SubjectProposalType.CHILD
          ? {type: API.SubjectProposalType.CHILD, child: proposal.change.child}
          : {type: API.SubjectProposalType.COMPONENT_SET, componentSet: [...proposal.change.component_set]}
      }))
    })

    state.heldCredentials$.subscribe(data => this._heldCredentials = {
      timestamp: Date.now(),
      data: [...data].map(cred => ({
        did: cred.issuerDID,
        subject: cred.subject,
        public: cred.public
      }))
    })

    state.issuedCredentials$.subscribe(data => this._issuedCredentials = {
      timestamp: Date.now(),
      data: [...data].map(cred => ({
        did: cred.theirDID,
        subject: cred.subject
      }))
    })

    state.reachableSubjects$.subscribe(data => this._reachableSubjects = {
      timestamp: Date.now(),
      data: [...data].map(([subject, master]) => ({
        name: subject,
        reachableByMasterCredentials: master
      }))
    })

    state.outgoingProofs$.subscribe(data => this._outgoingProofRequests = {
      timestamp: Date.now(),
      data
    })

    state.incomingProofs$.subscribe(data => this._incomingProofRequests = {
      timestamp: Date.now(),
      data
    })
  }

  private static hasNewData<T>(data: TimedData<T> | undefined, timestamp: number) {
    return data?.data && data.timestamp > timestamp
  }

  getStateUpdate({timestamp}: API.State.UpdateReq): API.State.UpdateRes {
    return {
      state: this.initState,
      did: this.did,
      appType: this.appType,
      timestamp: Date.now(),
      masters: StateManager.hasNewData(this._masters, timestamp),
      masterProposals: StateManager.hasNewData(this._masterProposals, timestamp),
      subjects: StateManager.hasNewData(this._subjects, timestamp),
      subjectProposals: StateManager.hasNewData(this._subjectProposals, timestamp),
      heldCredentials: StateManager.hasNewData(this._heldCredentials, timestamp),
      issuedCredentials: StateManager.hasNewData(this._issuedCredentials, timestamp),
      outgoingProofRequests: StateManager.hasNewData(this._outgoingProofRequests, timestamp),
      incomingProofRequests: StateManager.hasNewData(this._incomingProofRequests, timestamp),
      reachableSubjects: StateManager.hasNewData(this._reachableSubjects, timestamp)
    } as API.State.UpdateRes
  }
}
