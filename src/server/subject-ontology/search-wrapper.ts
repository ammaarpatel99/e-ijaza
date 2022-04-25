import {Search} from "./search";
import {Subject} from "./subject";

export class SearchWrapper {
  get deleted() {
    return this.search.deleted
  }

  constructor(
    private readonly search: Search,
    private readonly getSubject: (subject: string) => Subject | undefined,
    readonly deleteSearch: () => void
  ) {
  }

  getSearchPath(subjectName: string) {
    if (this.deleted) return undefined
    const subject = this.getSubject(subjectName)
    if (!subject) throw new Error(`Finding search path for non-existent subject`)
    const set = subject.getSearchPath(this.search)
    if (!set) return null
    return new Set([...set].map(subject => subject.name))
  }
}
