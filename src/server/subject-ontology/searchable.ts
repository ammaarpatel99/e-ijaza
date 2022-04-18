import {Search} from "./search";
import {Subject} from "./subject";

export abstract class Searchable {
  private readonly searchPaths = new Map<Search, ReadonlySet<Subject> | null>()

  setUnsearchable(search: Search) {
    this.searchPaths.set(search, null)
  }

  markAsStart(search: Search) {
    if (this.hasSearchPath(search)) throw Error(`Can't mark as start when already has path`)
    const path = new Set<Subject>()
    if (this instanceof Subject) path.add(this)
    this.searchPaths.set(search, path)
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
