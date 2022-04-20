import {Subject} from "./subject";
import {ChildRelation} from "./child-relation";
import {ComponentSet} from "./component-set";
import {Immutable, ReadWriteMutex, voidObs$} from "@project-utils";
import {Server} from "@project-types"
import {map} from "rxjs/operators";
import {Search} from "./search";
import {SearchWrapper} from "./search-wrapper";

export class SubjectOntology {
  static readonly instance = new SubjectOntology()
  private constructor() { }


  private readonly subjects = new Set<Subject>()
  private readonly childRelations = new Set<ChildRelation>()
  private readonly componentSets = new Set<ComponentSet>()
  private readonly mutex = new ReadWriteMutex()
  private readonly searches = new Set<Search>()

  update$(state: Immutable<Server.Subjects>) {
    return voidObs$.pipe(
      map(() => {
        this.updateSubjects(new Set(state.keys()))
        this.updateChildRelations(state)
        this.updateComponentSets(state)
        this.clearSearches()
      }),
      this.mutex.wrapAsWriting$()
    )
  }

  private updateSubjects(subjects: Immutable<Set<string>>) {
    const deleted = [...this.subjects].filter(subject => !subjects.has(subject.name))
    deleted.forEach(subject => {
      [...this.childRelations]
        .filter(relation => relation.parent === subject || relation.child === subject)
        .forEach(relation => {
          relation.parent.removeChild(relation)
          this.childRelations.delete(relation)
        });
      [...this.componentSets]
        .filter(set => set.parent === subject || set.set.has(subject))
        .forEach(set => {
          set.set.forEach(_subject => _subject.removeComponentSet(set))
          this.componentSets.delete(set)
        })
      this.subjects.delete(subject)
    })

    const currentSubjectNames = new Set([...this.subjects].map(subject => subject.name))
    const added = [...subjects].filter(subject => !currentSubjectNames.has(subject))
    added.forEach(subjectName => this.subjects.add(new Subject(subjectName)))
  }

  private static childRelationID(data: {get parent(): Subject; get child(): Subject}) {
    return `${data.parent.name}->${data.child.name}`
  }

  private updateChildRelations(state: Immutable<Server.Subjects>) {
    const currentSubjects = new Map([...this.subjects].map(subject => [subject.name, subject]))
    const relations = [...state].flatMap(([key, value]) => {
      const subject = currentSubjects.get(key)!
      const children = [...value.children].map(child => currentSubjects.get(child)!)
      return children.map(child => ({parent: subject, child}))
    })

    const newRelationIDs = new Set(relations.map(relation => SubjectOntology.childRelationID(relation)))
    const deleted = [...this.childRelations]
      .filter(relation => !newRelationIDs.has(SubjectOntology.childRelationID(relation)))
    deleted.forEach(relation => {
      relation.parent.removeChild(relation)
      this.childRelations.delete(relation)
    })

    const currentRelationIDs = new Set([...this.childRelations].map(relation => SubjectOntology.childRelationID(relation)))
    const added = relations
      .filter(relation => !currentRelationIDs.has(SubjectOntology.childRelationID(relation)))
    added.forEach(relation => {
      const newRelation = new ChildRelation(relation.parent, relation.child)
      relation.parent.addChild(newRelation)
      this.childRelations.add(newRelation)
    })
  }

  private static componentSetID(data: {get parent(): Subject; get set(): ReadonlySet<Subject>}) {
    const set = [...data.set].map(subject => subject.name).sort().join('-')
    return `${data.parent.name}->${set}`
  }

  private updateComponentSets(state: Immutable<Server.Subjects>) {
    const currentSubjects = new Map([...this.subjects].map(subject => [subject.name, subject]))
    const sets = [...state].flatMap(([key, value]) => {
      const subject = currentSubjects.get(key)!
      const sets = [...value.componentSets].map(set => new Set([...set].map(subject => currentSubjects.get(subject)!)))
      return sets.map(set => ({parent: subject, set}))
    })

    const newSetIDs = new Set(sets.map(set => SubjectOntology.componentSetID(set)))
    const deleted = [...this.componentSets]
      .filter(set => !newSetIDs.has(SubjectOntology.componentSetID(set)))
    deleted.forEach(set => {
      set.parent.removeComponentSet(set)
      this.componentSets.delete(set)
    })

    const currentSetIDs = new Set([...this.componentSets].map(set => SubjectOntology.componentSetID(set)))
    const added = sets
      .filter(set => !currentSetIDs.has(SubjectOntology.componentSetID(set)))
    added.forEach(relation => {
      const newSet = new ComponentSet(relation.parent, relation.set)
      relation.parent.addComponentSet(newSet)
      this.componentSets.add(newSet)
    })
  }

  private clearSearches() {
    [...this.subjects, ...this.childRelations, ...this.componentSets].forEach(item => item.clearSearches())
    this.searches.forEach(search => search.markAsDeleted())
    this.searches.clear()
  }

  private removeSearch(search: Search) {
    [...this.subjects, ...this.childRelations, ...this.componentSets].forEach(item => item.removeSearch(search))
    search.markAsDeleted()
    this.searches.delete(search)
  }

  standardSearch$(startingSet: ReadonlySet<string>, goals?: ReadonlySet<string>, closestFirst?: boolean) {
    return voidObs$.pipe(
      map(() => {
        const subjects = new Map([...this.subjects].map(subject => [subject.name, subject] as [string, Subject]));
        const _startingSet = new Set([...startingSet].map(subjectName => {
          const subject = subjects.get(subjectName)
          if (!subject) throw new Error(`starting set includes ${subjectName} which doesn't exist`)
          return subject
        }))
        const _goals = goals ? new Set([...goals].map(subjectName => {
          const subject = subjects.get(subjectName)
          if (!subject) throw new Error(`goals includes ${subjectName} which doesn't exist`)
          return subject
        })) : undefined
        const {searchWrapper} = this.createSearch({startingSet: _startingSet, goals: _goals, closestFirst})
        return searchWrapper
      }),
      this.mutex.wrapAsReading$()
    )
  }

  private createSearch(options: ConstructorParameters<typeof Search>[0]) {
    const search = new Search(options)
    this.searches.add(search)
    const searchWrapper = new SearchWrapper(
      search,
      subjectName => [...this.subjects].filter(subject => subject.name === subjectName).shift(),
      () => this.removeSearch(search)
    )
    return {search, searchWrapper}
  }
}
