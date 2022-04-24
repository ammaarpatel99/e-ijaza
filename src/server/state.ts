import {Initialisation} from './initialisation'
import {map, shareReplay} from "rxjs/operators";
import {filter, switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "./master-credentials";
import {
  MastersShareProtocol,
  MasterVoteProtocol,
  OntologyShareProtocol,
  OntologyVoteProtocol
} from "./aries-based-protocols";
import {OntologyManager, SubjectOntology, OntologyProposalManager} from "./subject-ontology";
import {Server} from '@project-types'

export class State {
  static readonly instance = new State()
  private constructor() { }

  readonly initialisationState$ =
    Initialisation.instance.initialisationData$
      .pipe(map(data => data.state))

  readonly did$ =
    Initialisation.instance.initialisationData$
      .pipe(
        map(data => "did" in data ? data.did : null),
        filter(data => data !== null),
        map(data => data as Exclude<typeof data, null>)
      )

  readonly name$ =
    Initialisation.instance.initialisationData$
      .pipe(
        map(data => "name" in data ? data.name : null),
        filter(data => data !== null),
        map(data => data as Exclude<typeof data, null>)
      )

  readonly appType$ =
    Initialisation.instance.initialisationData$
      .pipe(
        map(data => "appType" in data ? data.appType : null),
        filter(data => data !== null),
        map(data => data as Exclude<typeof data, null>)
      )

  readonly controllerDID$ =
    Initialisation.instance.initialisationData$
      .pipe(
        map(data => "controllerDID" in data ? data.controllerDID : null),
        filter(data => data !== null),
        map(data => data as Exclude<typeof data, null>)
      )

  readonly controllerMasters$ =
    MasterCredentialsManager.instance.controllerState$

  readonly userMasters$ =
    MastersShareProtocol.instance.userState$

  readonly subjectOntology$ =
    this.appType$.pipe(
      switchMap(appType => appType === Server.AppType.CONTROLLER
        ? OntologyManager.instance.state$
        : OntologyShareProtocol.instance.userState$
      ),
      switchMap(state =>
        SubjectOntology.instance.update$(state)
          .pipe(map(() => state))
      ),
      shareReplay(1)
    )

  readonly controllerMasterProposals$ =
    MasterProposalsManager.instance.state$

  readonly userMasterVotes$ =
    MasterVoteProtocol.instance.userVotes$

  readonly controllerOntologyProposals$ =
    OntologyProposalManager.instance.state$

  readonly userOntologyVotes$ =
    OntologyVoteProtocol.instance.userVotes$
}
