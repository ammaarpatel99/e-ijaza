import {catchError} from "rxjs";

export {router as apiRouter} from './api'
export {router as webhookRouter} from './webhook'

import {Initialisation} from './initialisation'
import {voidObs$} from "@project-utils";

export const attemptInitialisation$ = () =>
  Initialisation.instance.connectToAries$().pipe(
    catchError(() => voidObs$)
  )
