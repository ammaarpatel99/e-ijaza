import { Injectable } from '@angular/core';
import {BehaviorSubject, filter, first, of, OperatorFunction, switchMapTo, tap} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingCount = 0
  private readonly _loading$ = new BehaviorSubject(false)
  readonly loading$ = this._loading$.asObservable()

  constructor() { }

  startLoading() {
    this.loadingCount++
    if (this.loadingCount === 1) {
      this._loading$.next(true)
    }
  }

  stopLoading() {
    this.loadingCount--
    if (this.loadingCount === 0) {
      this._loading$.next(false)
    }
  }

  rxjsOperator(
    {waitForLoading = true, wrapAsLoading = true}
      : { waitForLoading?: boolean, wrapAsLoading?: boolean }
      = {waitForLoading: true, wrapAsLoading: true}
  ): OperatorFunction<any, any> {
    const obs$ = waitForLoading
      ? this.loading$
        .pipe(
          filter(loading => !loading),
          first())
      : of(true)
    return source =>
      obs$.pipe(
        tap(() => wrapAsLoading ? this.startLoading() : undefined),
        switchMapTo(source),
        tap(() => wrapAsLoading ? this.stopLoading() : undefined)
      )
  }
}
