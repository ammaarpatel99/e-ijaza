import {Initialisation} from './initialisation'
import {distinct, map, shareReplay} from "rxjs/operators";
import {combineLatestWith, delay, filter, Observable, switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "./master-credentials";
import {
  MastersShareProtocol,
  MasterVoteProtocol,
  OntologyShareProtocol,
  OntologyVoteProtocol
} from "./aries-based-protocols";
import {OntologyManager, OntologyProposalManager} from "./subject-ontology";
import {Server} from '@project-types'
import {CredentialProofManager, UserCredentialsManager} from "./credentials";
import {Mutex} from "@project-utils";

export class State {
  private static _instance: State | undefined
  static get instance() {
    if (!this._instance) this._instance = new State()
    return this._instance
  }
  private constructor() { }

  private readonly mutex = new Mutex()

  readonly _initialisationState$ = Initialisation.instance.initialisationData$.pipe(
    map(data => data.state),
    distinct(),
    shareReplay(1)
  )

  readonly initialisationState$ = this._initialisationState$.pipe(this.waitForNotUpdating)

  readonly _did$ = Initialisation.instance.initialisationData$.pipe(
    map(data => 'did' in data ? data.did : undefined),
    filter(data => data !== undefined),
    map(data => data as Exclude<typeof data, undefined>),
    distinct(),
    shareReplay(1)
  )


  readonly did$ = this._did$.pipe(this.waitForNotUpdating)

  readonly _name$ = Initialisation.instance.initialisationData$.pipe(
    map(data => 'name' in data ? data.name : undefined),
    filter(data => data !== undefined),
    map(data => data as Exclude<typeof data, undefined>),
    distinct(),
    shareReplay(1)
  )

  readonly name$ = this._name$.pipe(this.waitForNotUpdating)

  readonly _appType$ = Initialisation.instance.initialisationData$.pipe(
    map(data => "appType" in data ? data.appType : undefined),
    filter(data => data !== undefined),
    map(data => data as Exclude<typeof data, undefined>),
    distinct(),
    shareReplay(1)
  )

  readonly appType$ = this._appType$.pipe(this.waitForNotUpdating)

  readonly _controllerDID$ = Initialisation.instance.initialisationData$.pipe(
    map(data => "controllerDID" in data ? data.controllerDID : undefined),
    filter(data => data !== undefined),
    map(data => data as Exclude<typeof data, undefined>),
    distinct(),
    shareReplay(1)
  )

  readonly controllerDID$ = this._controllerDID$.pipe(this.waitForNotUpdating)

  readonly _controllerMasters$ = MasterCredentialsManager.instance.state$
  readonly controllerMasters$ = this._controllerMasters$.pipe(this.waitForNotUpdating)

  readonly _userMasters$ = MastersShareProtocol.instance.userState$
  readonly userMasters$ = this._userMasters$.pipe(this.waitForNotUpdating)

  readonly _subjectOntology$ = this._appType$.pipe(
    switchMap(appType => appType === Server.AppType.CONTROLLER
      ? OntologyManager.instance.state$
      : OntologyShareProtocol.instance.userState$
    )
  )

  readonly subjectOntology$ = this._subjectOntology$.pipe(this.waitForNotUpdating)

  readonly _controllerMasterProposals$ = MasterProposalsManager.instance.state$
  readonly controllerMasterProposals$ = this._controllerMasterProposals$.pipe(this.waitForNotUpdating)

  readonly _userMasterVotes$ = MasterVoteProtocol.instance.userVotes$
  readonly userMasterVotes$ = this._userMasterVotes$.pipe(this.waitForNotUpdating)

  readonly _controllerOntologyProposals$ = OntologyProposalManager.instance.state$
  readonly controllerOntologyProposals$ = this._controllerOntologyProposals$.pipe(this.waitForNotUpdating)

  readonly _userOntologyVotes$ = OntologyVoteProtocol.instance.userVotes$
  readonly userOntologyVotes$ = this._userOntologyVotes$.pipe(this.waitForNotUpdating)

  readonly _heldCredentials$ = UserCredentialsManager.instance.heldCredentials$
  readonly heldCredentials$ = this._heldCredentials$.pipe(this.waitForNotUpdating)

  readonly _issuedCredentials$ = UserCredentialsManager.instance.issuedCredentials$
  readonly issuedCredentials$ = this._issuedCredentials$.pipe(this.waitForNotUpdating)

  readonly _reachableSubjects$ = UserCredentialsManager.instance.reachableSubjects$
  readonly reachableSubjects$ = this._reachableSubjects$.pipe(this.waitForNotUpdating)

  readonly _outgoingProofs$ = CredentialProofManager.instance.outgoingProofs$
  readonly outgoingProofs$ = this._outgoingProofs$.pipe(this.waitForNotUpdating)

  readonly _incomingProofs$ = CredentialProofManager.instance.incomingProofs$
  readonly incomingProofs$ = this._incomingProofs$.pipe(this.waitForNotUpdating)

  startUpdating() { this.mutex.hold() }
  stopUpdating() {this.mutex.release() }

  private waitForNotUpdating<T>(source: Observable<T>): Observable<T> {
    let storedValue: T | undefined
    return source.pipe(
      delay(50), // allow other code to take hold of mutex before checking if mutex is held
      combineLatestWith(this.mutex.isHeld$),
      map(([value, isHeld]) => {
        if (!isHeld) return value
        else {
          storedValue = value
          return
        }
      }),
      distinct(),
      filter(value => value !== undefined),
      map(value => value as Exclude<typeof value, undefined>),
      shareReplay(1)
    )
  }
}
