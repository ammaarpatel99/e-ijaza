import {Initialisation} from "./initialisation";
import {catchError} from "rxjs";
import {voidObs$} from "@project-utils";

export const attemptInitialisation$ = () =>
  Initialisation.instance.connectToAries$().pipe(
    catchError(e => {
      console.error(e)
      console.error(`Couldn't establish connection with aries at startup. This simply means initialisation needs to take place.`)
      return voidObs$
    })
  )
