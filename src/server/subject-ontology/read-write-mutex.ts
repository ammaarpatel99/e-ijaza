import {BehaviorSubject, filter, first, OperatorFunction, switchMapTo, tap} from "rxjs";
import {map} from "rxjs/operators";

export class ReadWriteMutex {
  private readers = 0
  private writers = 0
  private writersWaitingToComplete = 0
  private readonly reading$ = new BehaviorSubject(false)
  private readonly writing$ = new BehaviorSubject(false)

  private readonly waitForNot: OperatorFunction<boolean, void> =
    source => source.pipe(
      filter(bool => !bool),
      first(),
      map(() => undefined)
    )

  constructor(private readonly isConsistentState: () => boolean) {}


  read$<T>(callback: () => T) {
    return this.writing$.pipe(
      this.waitForNot,
      tap(() => this.stopReading()),
      switchMapTo(this.writing$.pipe(this.waitForNot)),
      map(() => callback()),
      tap(() => this.stopReading())
    )
  }

  write$<T>(callback: () => T) {
    this.startWriting()
    return this.reading$.pipe(
      this.waitForNot,
      map(() => callback()),
      tap(() => {
        this.writersWaitingToComplete++
        if (this.isConsistentState()) {
          let i = 0
          while(this.writersWaitingToComplete >= i) {
            this.stopWriting()
            i++
          }
          this.writersWaitingToComplete -= i
        }
      })
    )
  }

  private startReading() {
    this.readers++
    if (this.readers === 1) this.reading$.next(true)
  }

  private stopReading() {
    this.readers--
    if (this.readers === 0) this.reading$.next(false)
  }

  private startWriting() {
    this.writers++
    if (this.writers === 1) this.writing$.next(true)
  }

  private stopWriting() {
    this.writers--
    if (this.writers === 0) this.writing$.next(false)
  }
}
