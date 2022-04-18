import {ChildRelation} from "./child-relation";
import {ComponentSet} from "./component-set";
import {Searchable} from "./searchable";
import {Search} from "./search";

export class Subject extends Searchable {
  private readonly _childRelations = new Set<ChildRelation>()
  readonly childRelations: ReadonlySet<ChildRelation> = this._childRelations
  private readonly _componentSets = new Set<ComponentSet>()
  readonly componentSets: ReadonlySet<ComponentSet> = this._componentSets

  constructor(readonly name: string) {
    super()
  }

  protected override getConnected(): ReadonlySet<Searchable> {
    return new Set([...this.childRelations, ...this.componentSets] as Searchable[])
  }

  protected override produceSearchPath(search: Search, from: Searchable): ReadonlySet<Subject> {
    if (from instanceof Subject) throw new Error(`Reaching subject directly from another subject in ontology`)
    return new Set([...from.getSearchPath(search)!, this])
  }

  addChild(child: ChildRelation) {
    this._childRelations.add(child)
  }

  removeChild(child: ChildRelation) {
    return this._childRelations.delete(child)
  }

  addComponentSet(set: ComponentSet) {
    this._componentSets.add(set)
  }

  removeComponentSet(set: ComponentSet) {
    return this._componentSets.delete(set)
  }
}
