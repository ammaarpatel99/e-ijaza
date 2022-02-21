import {SetOfSubjects} from './set-of-subjects'
import {SetOfSets} from './set-of-sets'
import {Reachability} from "./reachability";

export class Subject {
  // subjects that are directly reachable from this one
  private readonly childSubjects = new SetOfSubjects()
  // subjects that can directly reach this one
  private readonly parentSubjects = new SetOfSubjects()
  // sets of subjects where if all subjects in a set are reachable then so is this one
  private readonly componentSubjectSets = new SetOfSets()
  // subjects that could potentially be reachable if this one is
  private readonly componentSubjectParents = new Map<Subject, SetOfSets>()
  // a map from search keys to Reachability
  private readonly reachability = new Map<string, Reachability>()

  constructor(readonly name: string) {}

  addChild(child: Subject) {
    this.childSubjects.add(child)
    child.parentSubjects.add(this)
  }

  removeChild(child: Subject) {
    this.childSubjects.delete(child)
    child.parentSubjects.delete(this)
  }

  setChildren(children: Iterable<Subject>) {
    [...children]
      .filter(child => !this.childSubjects.has(child))
      .forEach(child => this.addChild(child));
    [...this.childSubjects]
      .filter(child => ![...children].includes(child))
      .forEach(child => this.removeChild(child))
  }

  private addComponentSet(componentSet: SetOfSubjects) {
    componentSet.setReadonly()
    this.componentSubjectSets.add(componentSet)
    componentSet.forEach(subject => {
      let set = subject.componentSubjectParents.get(this)
      if (!set) {
        set = new SetOfSets()
        subject.componentSubjectParents.set(this, set)
      }
      set.add(componentSet)
    })
  }

  private removeComponentSet(componentSet: SetOfSubjects) {
    this.componentSubjectSets.delete(componentSet)
    componentSet.forEach(subject => {
      const set = subject.componentSubjectParents.get(this)
      set?.delete(componentSet)
    })
  }

  setComponentSets(componentSets: Iterable<Iterable<Subject>>) {
    const _sets = new SetOfSets(componentSets)
    const toRemove = new SetOfSets()
    this.componentSubjectSets.forEach(set => {
      if (!_sets.delete(set)) toRemove.add(set)
    })
    toRemove.forEach(set => this.removeComponentSet(set))
    _sets.forEach(set => this.addComponentSet(set))
  }

  hasChild(child: Subject) {
    return this.childSubjects.has(child)
  }

  subjectsInComponentSets() {
    const setOfSubjects = new SetOfSubjects()
    this.componentSubjectSets.forEach(set => setOfSubjects.add(...set))
    return setOfSubjects
  }

  markAsStart(key: string) {
    this.getOrCreateReachability(key).setReached()
  }

  getReachability(key: string, allowUnreached: boolean = false) {
    let reachability = this.reachability.get(key)
    if (!allowUnreached && !reachability?.reached) return undefined
    return reachability
  }

  private getOrCreateReachability(key: string) {
    let reachability = this.getReachability(key, true)
    if (!reachability) {
      reachability = new Reachability(key)
      this.reachability.set(key, reachability)
    }
    return reachability
  }

  reachFromComponents(key: string) {
    const reachability = this.getReachability(key, true)
    if (!reachability) throw new Error(`Error: can't reach from components as no reachability`)
    reachability.reachFromComponents()
  }

  removeSearchKey(key: string) {
    this.reachability.delete(key)
  }

  search(key: string, childrenOnly: boolean = false) {
    const reachability = this.getReachability(key)
    if (!reachability) {
      throw new Error(`Searching from unreached place`)
    }

    const unreachedChildren = new SetOfSubjects()
    this.childSubjects.forEach(subject => {
      const subjectReachability = subject.getReachability(key, true)
      if (!subjectReachability?.reached) {
        const _reachability = reachability.duplicate()
        _reachability.addToPath(this)
        _reachability.setReached()
        subject.reachability.set(key, _reachability)
        unreachedChildren.add(subject)
      }
    })

    const unreachedComponentParents = new SetOfSubjects()
    if (childrenOnly) {
      return {unreachedChildren, unreachedComponentParents}
    }
    this.componentSubjectParents.forEach((componentSets, subject) => {
      let subjectReachability = subject.getReachability(key, true)
      if (!subjectReachability?.reached) {
        componentSets.forEach(setOfSubjects => {
          if (!!Reachability.reachabilityFromSet(key, setOfSubjects)) {
            if (!subjectReachability) {
              subjectReachability = new Reachability(key)
              subject.reachability.set(key, subjectReachability)
            }
            if (subjectReachability.addReachableComponentSet(setOfSubjects)) {
              unreachedComponentParents.add(subject)
            }
          }
        })
      }
    })

    return {unreachedChildren, unreachedComponentParents}
  }

  destroy() {
    this.setChildren(new SetOfSubjects())
    this.setComponentSets(new SetOfSets());
    [...this.parentSubjects].forEach(subject => subject.removeChild(this));
    [...this.componentSubjectParents].forEach(value => value[1].forEach(set => value[0].removeComponentSet(set)))
  }
}
