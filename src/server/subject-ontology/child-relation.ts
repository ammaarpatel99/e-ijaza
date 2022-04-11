import {Subject} from "@server/subject-ontology/subject";
import {Searchable} from "@server/subject-ontology/searchable";
import {Search} from "@server/subject-ontology/search";

export class ChildRelation extends Searchable {
  constructor(
    readonly parent: Subject,
    readonly child: Subject
  ) {
    super()
  }

  protected getConnected(): ReadonlySet<Searchable> {
    return new Set([this.child])
  }

  protected produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    return new Set([...(this.parent.getSearchPath(search)!), this.parent])
  }
}
