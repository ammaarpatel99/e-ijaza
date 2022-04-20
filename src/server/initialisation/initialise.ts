import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "../master-credentials";
import {
  MasterCredsStoreProtocol, MasterProposalStoreProtocol, MasterVoteProtocol,
  ShareMastersProtocol,
  ShareSubjectOntologyProtocol,
  SubjectsStoreProtocol
} from "../aries-based-protocols";
import {SubjectOntologyManager} from "../subject-ontology";

export function initialiseController$() {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),

    switchMap(() => ShareMastersProtocol.instance.controllerInitialise$()),
    switchMap(() => MasterCredsStoreProtocol.instance.initialise$()),
    switchMap(() => MasterCredentialsManager.instance.initialise$()),

    switchMap(() => ShareSubjectOntologyProtocol.instance.controllerInitialise$()),
    switchMap(() => SubjectsStoreProtocol.instance.initialise$()),
    switchMap(() => SubjectOntologyManager.instance.controllerInitialise$()),

    switchMap(() => MasterProposalStoreProtocol.instance.initialise$()),
    switchMap(() => MasterVoteProtocol.instance.controllerInitialisation$()),
    switchMap(() => MasterProposalsManager.instance.initialise$())
  )
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),

    switchMap(() => ShareMastersProtocol.instance.userInitialise$()),

    switchMap(() => ShareSubjectOntologyProtocol.instance.userInitialise$()),

    switchMap(() => MasterVoteProtocol.instance.userInitialisation$())
  )
}
