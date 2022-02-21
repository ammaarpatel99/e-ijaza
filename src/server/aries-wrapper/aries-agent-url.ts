export class AriesAgentUrl {
  private static _value: string|undefined

  static set value(value: string) {
    this._value = value
  }

  static getValue(): string
  static getValue(throwIfUndefined: false): string|undefined
  static getValue(throwIfUndefined: boolean = true): string|undefined {
    const value = this._value
    if (value === undefined && throwIfUndefined) {
      throw new Error(`No Aries Agent Url`)
    }
    return value
  }
}
