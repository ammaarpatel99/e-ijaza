import {Search} from "@server/subject-ontology/search";
import {Subject} from "@server/subject-ontology/subject";

export abstract class Searchable {
  private readonly searchPaths = new Map<Search, ReadonlySet<Subject> | null>()

  setUnsearchable(search: Search) {
    this.searchPaths.set(search, null)
  }

  markAsStart(search: Search) {
    if (this.hasSearchPath(search)) throw Error(`Can't mark as start when already has path`)
    this.searchPaths.set(search, new Set())
    search.addToSearchQueue(this)
  }

  clearSearches() {
    this.searchPaths.clear()
  }

  removeSearch(search: Search) {
    this.searchPaths.delete(search)
  }

  getSearchPath(search: Search): ReadonlySet<Subject> | undefined {
    return this.searchPaths.get(search) || undefined
  }

  hasSearchPath(search: Search): boolean {
    return this.getSearchPath(search) !== undefined
  }

  found(search: Search, from: Searchable) {
    let searchPath = this.searchPaths.get(search)
    if (searchPath !== undefined) return
    searchPath = this.produceSearchPath(search, from)
    if (!searchPath) return
    this.searchPaths.set(search, searchPath)
    search.addToSearchQueue(this)
  }

  search(search: Search) {
    this.getConnected().forEach(item => item.found(search, this))
  }

  protected abstract getConnected(): ReadonlySet<Searchable>

  protected abstract produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> | undefined
}
