import {ChildRelation} from "./child-relation";
import {ComponentSet} from "./component-set";
import {Searchable} from "./searchable";
import {Search} from "./search";

export class Subject extends Searchable {
  private readonly childRelations = new Set<ChildRelation>()
  private readonly componentSets = new Set<ComponentSet>()

  constructor(readonly name: string) {
    super()
  }

  protected override getConnected(): ReadonlySet<Searchable> {
    return new Set([...this.childRelations, ...this.componentSets] as Searchable[])
  }

  protected produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    return from.getSearchPath(search)!
  }
}
