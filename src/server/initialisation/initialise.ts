import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {Observable, switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "../master-credentials";
import {
  MasterVoteProtocol,
  MastersShareProtocol,
  OntologyShareProtocol
} from "../aries-based-protocols";
import {OntologyManager} from "../subject-ontology";
import {UserCredentialsManager} from "../credentials";

export function initialiseController$(): Observable<void> {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),

    switchMap(() => MasterCredentialsManager.instance.initialiseController$()),

    switchMap(() => OntologyManager.instance.initialiseController$()),

    switchMap(() => MasterProposalsManager.instance.controllerInitialise$())
  )
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),

    switchMap(() => MastersShareProtocol.instance.initialiseUser$()),

    switchMap(() => OntologyShareProtocol.instance.initialiseUser$()),

    switchMap(() => MasterVoteProtocol.instance.userInitialisation$()),

    switchMap(() => UserCredentialsManager.instance.userInitialise$())
  )
}
