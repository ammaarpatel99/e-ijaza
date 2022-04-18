import {Mutex} from "./mutex";
import {OperatorFunction, switchMap, tap} from "rxjs";

export class ReadWriteMutex {
  private readonly writeMutex = new Mutex()
  private readonly readMutex = new Mutex()

  constructor() { }

  wrapAsReading$<T>(): OperatorFunction<T, T> {
    return source$ => {
      return this.writeMutex.waitForFree$.pipe(
        tap(() => this.readMutex.hold()),
        switchMap(() => source$),
        tap(() => this.readMutex.release())
      );
    }
  }

  wrapAsWriting$<T>(): OperatorFunction<T, T> {
    return source$ => {
      this.writeMutex.hold()
      return this.readMutex.waitForFree$.pipe(
        switchMap(() => source$),
        tap(() => this.writeMutex.release())
      )
    }
  }
}
