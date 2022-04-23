import {BehaviorSubject, filter, first, OperatorFunction, switchMap, tap} from "rxjs";
import {map} from "rxjs/operators";
import {voidObs$} from "./void-observable";

export class Mutex {
  private users = 0
  private readonly _isHeld$ = new BehaviorSubject(false)
  readonly isHeld$ = this._isHeld$.asObservable()
  readonly waitForFree$ = this._waitForFree$()

  constructor() { }

  hold() {
    this.users++
    if (this.users === 1) this._isHeld$.next(true)
  }

  release() {
    this.users--
    if (this.users === 0) this._isHeld$.next(false)
    if (this.users < 0) throw new Error(`Have released mutex more times than it was held`)
  }

  wrapObservable<T>(
    {waitForFree = true, wrapAsHolding = true}
      : { waitForFree?: boolean, wrapAsHolding?: boolean }
      = {waitForFree: true, wrapAsHolding: true}
  ): OperatorFunction<T, T> {
    const obs$ = waitForFree ? this.waitForFree$ : voidObs$
    return source =>
      obs$.pipe(
        tap(() => wrapAsHolding ? this.hold() : undefined),
        switchMap(() => source),
        tap(() => wrapAsHolding ? this.release() : undefined)
      )
  }

  destroy() {
    this._isHeld$.complete()
  }

  private _waitForFree$() {
    return this.isHeld$.pipe(
      filter(isHeld => !isHeld),
      first(),
      map(() => undefined as void)
    )
  }
}
