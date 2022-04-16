import {Initialisation} from './initialisation'
import {map} from "rxjs/operators";
import {filter} from "rxjs";

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
}
