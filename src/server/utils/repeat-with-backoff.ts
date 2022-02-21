function asyncTimout(timout: number) {
  return new Promise(resolve => setTimeout(resolve, timout))
}

export async function repeatWithBackoff<Result>(
  {
    initialTimeout = 200,
    maxRepeats = 5,
    backoff = null,
    callback,
    failCallback = () => {throw new Error(`Timed out`)}
  }: {
    initialTimeout?: number,
    backoff?: number | null,
    maxRepeats?: number,
    failCallback?: () => Result | Promise<Result>,
    callback: () => [true, Result] | [false, any] | false | Promise<[true, Result] | [false, any] | false>
  })
{
  let timeout = initialTimeout
  for (let i = 1; i < maxRepeats; i++) {
    if (i > 0) await asyncTimout(timeout)
    const res = await callback()
    if (res !== false && res[0] === true) return res[1]
    if (backoff !== null) timeout += backoff
    else timeout *= 2
  }
  return failCallback()
}
