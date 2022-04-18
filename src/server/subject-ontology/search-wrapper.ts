import {Search} from "./search";
import {Subject} from "./subject";

export class SearchWrapper {
  readonly reachedGoals = this.getReachedGoals()

  get deleted() {
    return this.search.deleted
  }

  constructor(
    private readonly search: Search,
    private readonly getSubject: (subject: string) => Subject | undefined
  ) {
  }

  getSearchPath(subject: string) {
    const _subject = this.getSubject(subject)
    if (!_subject) throw new Error(`Finding search path for non-existent subject`)
    return this._getSearchPath(_subject)
  }

  private _getSearchPath(subject: Subject) {
    if (this.deleted) return undefined
    const set = subject.getSearchPath(this.search)
    if (!set) return null
    return new Set([...set].map(subject => subject.name))
  }

  private getReachedGoals(): Map<string, () => (Set<string> | null | undefined)> {
    const goals = this.search.goals
    if (!goals) return new Map();
    return new Map(
      [...goals].map(subject => [
        subject.name,
        () => this._getSearchPath(subject)
      ] as [string, () => (Set<string> | null | undefined)])
    )
  }
}
