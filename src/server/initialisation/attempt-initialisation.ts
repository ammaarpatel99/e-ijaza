import {Initialisation} from "./initialisation";
import {catchError} from "rxjs";
import {voidObs$} from "@project-utils";

export const attemptInitialisation$ = () =>
  Initialisation.instance.connectToAries$().pipe(
    catchError(() => voidObs$)
  )
