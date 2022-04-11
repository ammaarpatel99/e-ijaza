import {ChildRelation} from "@server/subject-ontology/child-relation";
import {ComponentSet} from "@server/subject-ontology/component-set";
import {Searchable} from "@server/subject-ontology/searchable";
import {Search} from "@server/subject-ontology/search";

export class Subject extends Searchable {
  private readonly childRelations = new Set<ChildRelation>()
  private readonly componentSets = new Set<ComponentSet>()

  constructor(readonly name: string) {
    super()
  }

  protected getConnected(): ReadonlySet<Searchable> {
    return new Set([...this.childRelations, ...this.componentSets]);
  }

  protected produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    return from.getSearchPath(search)!
  }
}
