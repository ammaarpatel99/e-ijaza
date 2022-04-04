import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

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
}
