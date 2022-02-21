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
    return [...this.set].map(subject => subject.name).sort().join(', ')
  }

  has(subject: Subject) {
    return this.set.has(subject)
  }

  add(...subjects: Subject[]) {
    if (this.readonly) {
      throw new Error(`Can't add subject to readonly set`)
    }
    let exists = subjects.length === 1 ? this.set.has(subjects[0]) : true
    subjects.forEach(subject => this.set.add(subject))
    return exists
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
    return this.set.size === setOfSubjects.set.size &&
      [...this.set].every(subject => setOfSubjects.set.has(subject))
  }

  setReadonly() {
    this._readonly = true
  }

  get [Symbol.iterator]() {
    return this.set[Symbol.iterator]
  }
}
