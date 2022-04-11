import {from, lastValueFrom, Observable, OperatorFunction} from "rxjs";

export function asyncTimout(timout: number) {
  return new Promise(resolve => setTimeout(resolve, timout))
}

interface callbackRes<T> {
  success: boolean
  value?: T
}

interface Options<Result> {
  initialTimeout?: number;
  backoff?: number;
  maxRepeats?: number;
  failCallback?: () => Result | Promise<Result>;
  callback: () => callbackRes<Result> | Promise<callbackRes<Result>>;
  exponential?: boolean;
}

export async function repeatWithBackoff<Result>(
  {
    initialTimeout = 0,
    maxRepeats = 5,
    backoff = 200,
    callback,
    failCallback = () => {throw new Error(`Timed out`)},
    exponential = true
  }: Options<Result>)
{
  let timeout = initialTimeout
  for (let i = 1; i <= maxRepeats; i++) {
    await asyncTimout(timeout)
    const res = await callback()
    if (res.success) return res
    if (exponential) timeout = initialTimeout + (backoff * (2**i))
    else timeout = initialTimeout + (backoff * i)
  }
  const failRes = await failCallback()
  return {success: false, value: failRes} as callbackRes<Result>
}

export function repeatWithBackoff$<T>(options: Omit<Options<T>, "callback">): OperatorFunction<callbackRes<T>, callbackRes<T>> {
  return source => from(repeatWithBackoff(
    {...options, callback: () => lastValueFrom(source)}
  ))
}
