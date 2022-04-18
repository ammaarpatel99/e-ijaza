import {Subject} from "./subject";
import {Searchable} from "./searchable";
import {Search} from "./search";

export class ChildRelation extends Searchable {
  constructor(
    readonly parent: Subject,
    readonly child: Subject
  ) {
    super()
  }

  protected override getConnected(): ReadonlySet<Searchable> {
    return new Set([this.child])
  }

  protected override produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    if (!(from instanceof Subject)) throw new Error(`Reaching child relation but not from a subject`)
    return this.parent.getSearchPath(search)!
  }
}
