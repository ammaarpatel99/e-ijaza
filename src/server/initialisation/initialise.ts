import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {Observable, switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "../master-credentials";
import {
  MasterProposalStoreProtocol,
  MasterVoteProtocol,
  MastersShareProtocol,
  OntologyShareProtocol
} from "../aries-based-protocols";
import {OntologyManager} from "../subject-ontology";

export function initialiseController$(): Observable<void> {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),

    switchMap(() => MasterCredentialsManager.instance.controllerInitialise()),

    switchMap(() => OntologyManager.instance.controllerInitialise$()),

    switchMap(() => MasterProposalStoreProtocol.instance.initialise$()),
    switchMap(() => MasterVoteProtocol.instance.controllerInitialisation$()),
    switchMap(() => MasterProposalsManager.instance.initialise$())
  ) as Observable<void>
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),

    switchMap(() => MastersShareProtocol.instance.userInitialise$()),

    switchMap(() => OntologyShareProtocol.instance.userInitialise$()),

    switchMap(() => MasterVoteProtocol.instance.userInitialisation$())
  )
}
