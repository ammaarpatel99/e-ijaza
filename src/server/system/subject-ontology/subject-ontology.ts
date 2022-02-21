import {Subject} from "./subject";
import {SetOfSubjects} from "./set-of-subjects";
import {SubjectQueue, SubjectSearchSetting} from './queue'

export class SubjectOntology {
  private static _instance: SubjectOntology | undefined
  static get instance() {
    if (!this._instance === undefined) this._instance = new SubjectOntology()
    return this._instance
  }
  private constructor() { }


  private readonly subjects = new Map<string, Subject>()
  private readonly searchKeys = new Set<string>()

  setSubjects(...names: string[]) {
    names
      .filter(name => !this.subjects.has(name))
      .map(name => new Subject(name))
      .forEach(subject => this.subjects.set(subject.name, subject));
    [...this.subjects.values()]
      .filter(subject => !names.includes(subject.name))
      .forEach(subject => {
        subject.destroy()
        this.subjects.delete(subject.name)
      })
  }

  setSubjectData(name: string, children: string[], componentSets: string[][]) {
    const subject = this.subjects.get(name)
    const _children = children.map(name => this.subjects.get(name))
    const _componentSets = componentSets.map(set => set.map(subject => this.subjects.get(subject)))
    if (!subject || !_children.every(x => x !== undefined) || !_componentSets.every(x => x.every(y => y !== undefined))) {
      throw new Error(``)
    }
    subject.setChildren(_children as Subject[])
    subject.setComponentSets(_componentSets as Subject[][])
  }

  checkSubjectInSearch(key: string, subject: string) {
    const path = this.subjects.get(subject)?.getReachability(key)?.path
    if (!path) return undefined
    return [...path].map(subject => subject.name)
  }

  checkRemovalOfChild(parent: string, child: string) {
    const _parent = this.subjects.get(parent)
    const _child = this.subjects.get(child)
    if (!_parent || !_child || !_parent.hasChild(_child)) throw new Error(``)
    _parent.removeChild(_child)
    const promises: Promise<void>[] = [];

    [...this.subjects.values()].forEach(subject => {
      [...subject.subjectsInComponentSets()].forEach(innerSubject => {
        promises.push(
          this.testSearch([subject.name], innerSubject.name, true)
            .then(res => {
              if (!res) throw new Error(``)
            })
        )
      })
    })
    return Promise.all(promises)
      .then(() => true)
      .catch(() => false)
      .finally(() => _parent.addChild(_child))
  }

  checkAdditionOfComponentSet(parent: string, components: string[]) {
    const _parent = this.subjects.get(parent)
    const _components = components.map(name => this.subjects.get(name))
    if (!_parent || !_components.every(x => x !== undefined)) throw new Error(``)
    return Promise.all(_components.map(subject =>
      this.testSearch([_parent.name], (subject as Subject).name, true)
        .then(res => {
          if (!res) throw new Error(``)
        })
    )).then(() => true).catch(() => false)
  }

  fullSearch(key: string, startingSubjects: string[]) {
    const subjects = startingSubjects.map(name => this.subjects.get(name))
    if (!subjects.every(subject => subject !== undefined)) {
      throw new Error(`Invalid subject in starting set`)
    }
    const startingSet = new SetOfSubjects()
    startingSet.add(...subjects as Subject[])
    return this.search({
      startingSet, key, keepKey: true, setting: SubjectSearchSetting.CLOSEST_FIRST
    })
  }

  testSearch(startingSubjects: string[], goal: string, childrenOnly: boolean = false) {
    const subjects = startingSubjects.map(name => this.subjects.get(name))
    const goalSubject = this.subjects.get(goal)
    if (!subjects.every(subject => subject !== undefined) || !goalSubject) {
      throw new Error(`Invalid subject in search`)
    }
    const startingSet = new SetOfSubjects()
    startingSet.add(...subjects as Subject[])


    return this.search({
      startingSet, goal: goalSubject,
      setting: childrenOnly ? SubjectSearchSetting.CHILDREN_ONLY : SubjectSearchSetting.FOUND_FIRST
    })
  }

  private generateSearchKey() {
    let x: string | undefined
    while (x === undefined) {
      x = Math.random().toString()
      if (this.searchKeys.has(x)) x = undefined
    }
    return x
  }

  private async search(
    {
      startingSet,
      setting = SubjectSearchSetting.FOUND_FIRST,
      goal = null,
      key = this.generateSearchKey(),
      keepKey = false
    }: {
      startingSet: SetOfSubjects,
      goal?: Subject | null,
      key?: string,
      setting?: SubjectSearchSetting,
      keepKey?: boolean
    }
  ) {
    const queue = new SubjectQueue(key, setting)
    startingSet.forEach(subject => subject.markAsStart(key))
    queue.add(...startingSet)

    while (!queue.isEmpty() && !goal?.getReachability(key)) {
      const subject = queue.remove()
      const searchRes = subject.search(key, setting === SubjectSearchSetting.CHILDREN_ONLY)
      queue.add(...searchRes.unreachedChildren)
      queue.addFromComponents(...searchRes.unreachedComponentParents)
    }

    let reached = !!goal?.getReachability(key)

    if (!keepKey) {
      [...this.subjects.values()]
        .forEach(subject => subject.removeSearchKey(key))
    }

    return reached
  }
}
