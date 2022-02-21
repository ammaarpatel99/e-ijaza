export function asyncTimout(timout: number) {
  return new Promise(resolve => setTimeout(resolve, timout))
}
