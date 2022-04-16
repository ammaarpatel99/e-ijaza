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

  protected getConnected(): ReadonlySet<Searchable> {
    return new Set([this.child] as Searchable[])
  }

  protected produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    return new Set([...(this.parent.getSearchPath(search)!), this.parent])
  }
}
