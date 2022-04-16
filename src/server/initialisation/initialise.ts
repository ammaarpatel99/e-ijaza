import {voidObs$} from "@project-utils";
import {API} from '@project-types'
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {switchMap} from "rxjs";

export function initialiseController$(data: API.InitialisationData_controller) {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$())
  )
}

export function initialiseUser$(data: API.InitialisationData_user) {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$(data.controllerDID))
  )
}
