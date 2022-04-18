import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {switchMap} from "rxjs";
import {MasterCredentialsManager} from "../master-credentials";
import {
  MasterCredsStoreProtocol,
  ShareMastersProtocol,
  ShareSubjectOntologyProtocol,
  SubjectsStoreProtocol
} from "../aries-based-protocols";

export function initialiseController$() {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),
    switchMap(() => ShareMastersProtocol.instance.controllerInitialise$()),
    switchMap(() => MasterCredsStoreProtocol.instance.initialise$()),
    switchMap(() => MasterCredentialsManager.instance.initialise$()),
    switchMap(() => ShareSubjectOntologyProtocol.instance.controllerInitialise$()),
    switchMap(() => SubjectsStoreProtocol.instance.initialise$())
  )
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),
    switchMap(() => ShareMastersProtocol.instance.userInitialise$()),
    switchMap(() => ShareSubjectOntologyProtocol.instance.userInitialise$())
  )
}
