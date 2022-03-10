function asyncTimout(timout: number) {
  return new Promise(resolve => setTimeout(resolve, timout))
}

interface successCallbackRes<T> {
  success: true
  value?: T
}
interface failCallbackRes {
  success: false
  value?: any
}
type callbackRes<T> = successCallbackRes<T> | failCallbackRes | boolean

export async function repeatWithBackoff<Result>(
  {
    initialTimeout = 0,
    maxRepeats = 5,
    backoff = 200,
    callback,
    failCallback = () => {throw new Error(`Timed out`)},
    exponential = true
  }: {
    initialTimeout?: number,
    backoff?: number,
    maxRepeats?: number,
    failCallback?: () => Result | Promise<Result>,
    callback: () => callbackRes<Result> | Promise<callbackRes<Result>>,
    exponential?: boolean
  })
{
  let timeout = initialTimeout
  for (let i = 1; i <= maxRepeats; i++) {
    await asyncTimout(timeout)
    const res = await callback()
    if (res === true) return
    if (res && res.success) return res.value
    if (exponential) timeout = initialTimeout + (backoff * (2**i))
    else timeout = initialTimeout + (backoff * i)
  }
  return failCallback()
}
