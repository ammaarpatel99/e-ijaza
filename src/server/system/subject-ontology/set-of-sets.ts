import {SetOfSubjects} from './set-of-subjects'
import {Subject} from "./subject";

export class SetOfSets {
  private readonly data = new Set<SetOfSubjects>()
  private _readonly = false

  constructor(sets?: Iterable<Iterable<Subject>>) {
    if (sets) {
      this.add(...[...sets].map(set => new SetOfSubjects(set)))
    }
  }

  get readonly() {
    return this._readonly
  }

  setReadonly() {
    this._readonly = true
  }

  forEach(callback: (setOfSubjects: SetOfSubjects) => void) {
    return this.data.forEach(callback)
  }

  add(...setsOfSubjects: SetOfSubjects[]) {
    if (this.readonly) {
      throw new Error(`Can't add set of subjects to readonly set of sets`)
    }
    let exists = true
    setsOfSubjects.forEach(setOfSubjects => {
      if (!this.has(setOfSubjects)) {
        exists = false
        this.data.add(setOfSubjects)
      }
    })
    if (setsOfSubjects.length === 1) {
      return exists
    }
    return true
  }

  delete(setOfSubjects: SetOfSubjects) {
    if (this.readonly) {
      throw new Error(`Can't delete set of subjects to readonly set of sets`)
    }
    const set = this.get(setOfSubjects)
    return set === undefined ? false : this.data.delete(set)
  }

  private get(setOfSubjects: SetOfSubjects) {
    const set = [...this.data]
      .filter(set => setOfSubjects.isEqual(set))
    if (set.length > 0) {
      return set[0]
    } else {
      return undefined
    }
  }

  private has(setOfSubjects: SetOfSubjects) {
    return this.get(setOfSubjects) !== undefined
  }

  get [Symbol.iterator]() {
    return this.data[Symbol.iterator]
  }
}
