import {Subject} from "./subject";
import {ChildRelation} from "./child-relation";
import {ComponentSet} from "./component-set";
import {ReadWriteMutex} from "./read-write-mutex";

export class SubjectOntology {
  static readonly instance = new SubjectOntology()
  private constructor() { }


  private readonly subjects = new Set<Subject>()
  private readonly childRelations = new Set<ChildRelation>()
  private readonly componentSets = new Set<ComponentSet>()
  private readonly mutex = new ReadWriteMutex(this.isConsistentState.bind(this))

  private isConsistentState() {
    const subjectNames = [...this.subjects].map(subject => subject.name)
    const subjectNamesInUse = [...this.childRelations]
      .flatMap(relation => [relation.parent.name, relation.child.name])
      .concat(
        [...this.componentSets]
          .flatMap(set => [...set.set, set.parent].map(subject => subject.name))
      )
    return subjectNamesInUse.every(name => subjectNames.includes(name))
  }

  private clearSearches() {
    [...this.subjects, ...this.childRelations, ...this.componentSets].forEach(item => item.clearSearches())
  }
}
