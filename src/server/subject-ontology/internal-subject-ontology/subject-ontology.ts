import {Subject} from "./subject";
import {SetOfSubjects} from "./set-of-subjects";
import {SubjectQueue, SubjectSearchSetting} from './queue'

export class SubjectOntology {
  private static _instance: SubjectOntology | undefined
  static get instance() {
    if (!this._instance) this._instance = new SubjectOntology()
    return this._instance
  }
  private constructor() { }


  private readonly subjects = new Map<string, Subject>()
  private readonly searchKeys = new Set<string>()

  flushSearches() {
    this.searchKeys.forEach(key => this.deleteSearchKey(key))
  }

  hasSearchKey(key: string) {
    return this.searchKeys.has(key)
  }

  setSubjects(...names: string[]) {
    names
      .filter(name => !this.subjects.has(name))
      .map(name => new Subject(name))
      .forEach(subject => this.subjects.set(subject.name, subject));
    [...this.subjects.values()]
      .filter(subject => !names.includes(subject.name))
      .forEach(subject => {
        this.subjects.delete(subject.name)
      })
  }

  getSubjects() {
    return [...this.subjects.keys()]
  }

  hasSubject(subject: string) {
    return this.subjects.has(subject)
  }

  setSubjectData(name: string, children: string[], componentSets: string[][]) {
    const subject = this.subjects.get(name)
    const _children = children.map(name => this.subjects.get(name))
    const _componentSets = componentSets.map(set => set.map(subject => this.subjects.get(subject)))
    if (!subject || !_children.every(x => x !== undefined) || !_componentSets.every(x => x.every(y => y !== undefined))) {
      throw new Error(`subject data includes non-existent subjects`)
    }
    subject.setChildren(_children as Subject[])
    subject.setComponentSets(_componentSets as Subject[][])
  }

  getSubjectData(name: string) {
    const subject = this.subjects.get(name)
    if (!subject) return
    return {
      name, children: subject.getChildren(), componentSets: subject.getComponentSets()
    }
  }

  checkSubjectInSearch(key: string, subject: string) {
    const path = this.subjects.get(subject)?.getReachability(key)?.path
    if (!path) return undefined
    return [...path].map(subject => subject.name)
  }

  async checkRemovalOfChild(parent: string, child: string) {
    const _parent = this.subjects.get(parent)
    const _child = this.subjects.get(child)
    if (!_parent || !_child || !_parent.hasChild(_child)) throw new Error(`Can't remove non-existent child edge`)
    _parent.removeChild(_child)
    try {
      if (_child.canDestroy()) return true
      try {
        await Promise.all(
          [...this.subjects.values()].flatMap(subject =>
            [...subject.subjectsInComponentSets()].map(innerSubject =>
              this.testSearch([subject.name], innerSubject.name, true)
                .then(res => { if (!res) throw new Error(`Unreachable subject in component set`) })
            )))
        return true
      } catch (e) {
        return false
      }
    } finally {
      _parent.addChild(_child);
    }
  }

  checkIfSubjectToBeDestroyed(subject: string) {
    const _subject = this.subjects.get(subject)
    if (!_subject) throw new Error(`Subject to check if destroyable doesn't exist`)
    return _subject.canDestroy()
  }

  checkAdditionOfComponentSet(parent: string, components: string[]) {
    const _parent = this.subjects.get(parent)
    const _components = components.map(name => this.subjects.get(name))
    if (!_parent || !_components.every(x => x !== undefined)) {
      throw new Error(`Can't check addition of component set`)
    }
    return Promise.all(_components.map(subject =>
      this.testSearch([_parent.name], (subject as Subject).name, true)
        .then(res => {
          if (!res) throw new Error(``)
        })
    )).then(() => true).catch(() => false)
  }

  async fullSearch(startingSubjects: string[]) {
    const subjects = startingSubjects.map(name => this.subjects.get(name))
    if (!subjects.every(subject => subject !== undefined)) {
      throw new Error(`Invalid subject in starting set`)
    }
    const startingSet = new SetOfSubjects()
    startingSet.add(...subjects as Subject[])
    const key = this.generateSearchKey()

    await this.search({
      startingSet, key, keepKey: true, setting: SubjectSearchSetting.CLOSEST_FIRST
    })
    return key
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
    let key: string | undefined
    while (key === undefined) {
      key = Math.random().toString()
      if (this.searchKeys.has(key)) key = undefined
      else this.searchKeys.add(key)
    }
    return key
  }

  private deleteSearchKey(key: string) {
    this.searchKeys.delete(key)
    this.subjects.forEach(subject => subject.removeSearchKey(key))
  }

  private async search(
    {
      startingSet,
      setting = SubjectSearchSetting.FOUND_FIRST,
      goal = null,
      keepKey = false
    }: {
      startingSet: SetOfSubjects,
      goal?: Subject | null,
      key?: string,
      setting?: SubjectSearchSetting,
      keepKey?: boolean
    }
  ) {
    while (true) {
      const key = this.generateSearchKey()
      const queue = new SubjectQueue(key, setting)
      startingSet.forEach(subject => subject.markAsStart(key))
      queue.add(...startingSet)

      while (!queue.isEmpty() && !goal?.getReachability(key)) {
        if (!this.searchKeys.has(key)) {
          this.deleteSearchKey(key)
          continue
        }
        const subject = queue.remove()
        const searchRes = subject.search(key, setting === SubjectSearchSetting.CHILDREN_ONLY)
        queue.add(...searchRes.unreachedChildren)
        queue.addFromComponents(...searchRes.unreachedComponentParents)
      }

      if (!this.searchKeys.has(key)) {
        this.deleteSearchKey(key)
        continue
      }

      let reached = !!goal?.getReachability(key)

      if (!keepKey) this.deleteSearchKey(key)
      return {reached, key: keepKey ? key : null}
    }
  }

  addChild(parent: string, child: string) {
    const _parent = this.subjects.get(parent)
    let _child = this.subjects.get(child)
    if (!_parent) throw new Error(`can't add child`)
    let created = false
    if (!_child) {
      _child = new Subject(child)
      this.subjects.set(child, _child)
      created = true
    }
    _parent.addChild(_child)
    return created
  }

  removeChild(parent: string, child: string) {
    const _parent = this.subjects.get(parent)
    const _child = this.subjects.get(child)
    if (!_parent || !_child) throw new Error(`can't remove child`)
    _parent.removeChild(_child)
    let destroyed = false
    if (_child.canDestroy()) {
      _child.destroy()
      this.subjects.delete(child)
      destroyed = true
    }
    return destroyed
  }

  addComponentSet(parent: string, set: string[]) {
    const _parent = this.subjects.get(parent)
    const _set = set.map(subject => this.subjects.get(subject))
    if (!_parent || !_set.every(subject => !!subject)) throw new Error(`can't add component set`)
    _parent.addComponentSet(new SetOfSubjects(_set as Subject[]))
  }

  removeComponentSet(parent: string, set: string[]) {
    const _parent = this.subjects.get(parent)
    const _set = set.map(subject => this.subjects.get(subject))
    if (!_parent || !_set.every(subject => !!subject)) throw new Error(`can't remove component set`)
    _parent.removeComponentSet(new SetOfSubjects(_set as Subject[]))
  }
}
