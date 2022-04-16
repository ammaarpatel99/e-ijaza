import {Subject} from "./subject";
import {Search} from "./search";
import {Searchable} from "./searchable";

export class ComponentSet extends Searchable {
  private readonly searchState = new Map<Search, Set<Subject>>()

  constructor(
    readonly parent: Subject,
    readonly set: ReadonlySet<Subject>
  ) {
    super()
  }

  override clearSearches() {
    super.clearSearches();
    this.searchState.clear()
  }

  override removeSearch(search: Search) {
    super.removeSearch(search);
    this.searchState.delete(search)
  }

  protected getConnected(): ReadonlySet<Searchable> {
    return new Set([this.parent])
  }

  protected produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> | undefined {
    if (!(from instanceof Subject)) throw new Error(`Reaching component set but not from a subject`)
    let set = this.searchState.get(search)?.add(from)
    if (!set) {
      set = new Set([from])
      this.searchState.set(search, set)
    }
    if (set.size !== this.set.size) return undefined
    const path = [...this.set]
      .flatMap(subject => [...(subject.getSearchPath(search)!), subject])
    return new Set(path)
  }
}
