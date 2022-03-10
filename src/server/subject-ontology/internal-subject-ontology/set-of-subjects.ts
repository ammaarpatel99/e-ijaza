import {Subject} from './subject'

export class SetOfSubjects {
  private readonly set = new Set<Subject>()
  private _readonly = false

  constructor(subjects?: Iterable<Subject>) {
    if (subjects) {
      this.add(...subjects)
    }
  }

  get readonly() {
    return this._readonly
  }

  get size() {
    return this.set.size
  }

  toString() {
    return [...this].map(subject => subject.name).sort().join(', ')
  }

  has(subject: Subject) {
    return this.set.has(subject)
  }

  add(...subjects: Subject[]): boolean {
    if (this.readonly) {
      throw new Error(`Can't add subject to readonly set`)
    }
    let changed = false
    subjects.forEach(subject => {
      if (!this.has(subject)) {
        this.set.add(subject)
        changed = true
      }
    })
    return changed
  }

  delete(subject: Subject) {
    if (this.readonly) {
      throw new Error(`Can't delete subject from readonly set`)
    }
    return this.set.delete(subject)
  }

  forEach(callback: (subject: Subject) => void) {
    return this.set.forEach(callback)
  }

  isEqual(setOfSubjects: SetOfSubjects) {
    return this.size === setOfSubjects.size &&
      [...this].every(subject => setOfSubjects.has(subject))
  }

  setReadonly() {
    this._readonly = true
  }

  get [Symbol.iterator]() {
    return this.set[Symbol.iterator].bind(this.set)
  }
}
