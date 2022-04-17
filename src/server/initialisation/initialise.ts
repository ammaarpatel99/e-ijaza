import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {switchMap} from "rxjs";
import {MasterCredentialsManager} from "../master-credentials";
import {ShareMastersData} from "../aries-based-protocols";

export function initialiseController$() {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),
    switchMap(() => MasterCredentialsManager.instance.initialise$())
  )
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),
    switchMap(() => ShareMastersData.instance.userInitialise$())
  )
}
