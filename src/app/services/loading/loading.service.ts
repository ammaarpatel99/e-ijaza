import {Injectable, OnDestroy} from '@angular/core';
import {Mutex} from "@project-utils";

@Injectable({
  providedIn: 'root'
})
export class LoadingService implements OnDestroy {
  private readonly mutex = new Mutex()
  readonly loading$ = this.mutex.isHeld$
  readonly wrapObservable = this.mutex.wrapObservable.bind(this.mutex)

  startLoading() { this.mutex.hold() }

  stopLoading() { this.mutex.release() }

  ngOnDestroy(): void {
    this.mutex.destroy()
  }
}
