let value: string | undefined

export function setAriesAgentUrl(url: string) {
  if (value) throw new Error(`Aries Agent URL already set`)
  value = url
}

export function getAriesAgentUrl(): string
export function getAriesAgentUrl(throwIfUndefined: false): string|undefined
export function getAriesAgentUrl(throwIfUndefined: boolean = true): string|undefined {
  if (value === undefined && throwIfUndefined) {
    throw new Error(`No Aries Agent Url to get`)
  }
  return value
}
