import {Subject} from "./subject";
import {Searchable} from "./searchable";

export interface Options {
  startingSet: ReadonlySet<Subject>
  goals?: ReadonlySet<Subject>
  ignore?: ReadonlySet<Searchable>
  closestFirst?: boolean
}

export class Search {
  private readonly toSearch = new Set<Searchable>()
  readonly goals?: ReadonlySet<Subject>
  private readonly goalsRemaining?: Set<Subject>
  private readonly closestFirst

  private _deleted = false
  get deleted() {return this._deleted}

  constructor({startingSet, ignore = new Set(), goals, closestFirst = false}: Options) {
    this.closestFirst = closestFirst
    if (goals) {
      this.goals = goals
      this.goalsRemaining = new Set(goals)
    }
    ignore.forEach(subject => subject.setUnsearchable(this))
    startingSet.forEach(subject => subject.markAsStart(this))

    while (this.toSearch.size > 0 && (this.goalsRemaining?.size || 1) > 0) {
      this.getNextSearchItems().forEach(searchable => searchable.search(this))
    }
  }

  addToSearchQueue(searchable: Searchable) {
    this.toSearch.add(searchable)
    if (this.goalsRemaining) {
      this.goalsRemaining.delete(searchable as Subject)
    }
  }

  private getNextSearchItems() {
    if (!this.closestFirst) {
      const toSearch = [...this.toSearch]
      this.toSearch.clear()
      return toSearch
    } else {
      const next = [...this.toSearch.values()]
        .sort((a, b) => b.getSearchPath(this)!.size - a.getSearchPath(this)!.size)[0]
      this.toSearch.delete(next)
      return [next]
    }
  }

  markAsDeleted() {
    this._deleted = true
  }
}

