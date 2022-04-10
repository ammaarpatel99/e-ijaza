import {SetOfSubjects} from "./set-of-subjects";
import {SetOfSets} from "./set-of-sets";
import {Subject} from "./subject";

export class Reachability {
  private _path = new SetOfSubjects()
  private readonly reachableComponentSets = new SetOfSets()
  private closestComponentSet: [SetOfSubjects, number]|undefined

  static reachabilityFromSet(key: string, set: SetOfSubjects) {
    const reachability = new Reachability(key)
    for (const subject of set) {
      const _reachability = subject.getReachability(key)
      if (!_reachability) return undefined
      reachability.concat(_reachability)
    }
    reachability.setReached()
    return reachability
  }

  constructor(readonly key: string) { }

  get path() {
    if (this.reached) {
      return this._path
    }
    return undefined
  }

  get distanceUsingComponents() {
    if (!this.closestComponentSet) return undefined
    else return this.closestComponentSet[1]
  }

  get reached() {
    return this._path.readonly
  }

  setReached() {
    this._path.setReadonly()
  }

  addToPath(subject: Subject) {
    this._path.add(subject)
  }

  concat(reachability: Reachability) {
    this._path.add(...reachability._path)
  }

  addReachableComponentSet(set: SetOfSubjects) {
    if (this.reached) {
      throw new Error(`Can't add reachable component`)
    }
    const newPath = Reachability.reachabilityFromSet(this.key, set)?.path?.size
    if (newPath === undefined) {
      throw new Error(`Reachable component is not reachable`)
    }
    if (this.reachableComponentSets.add(set)) {
      if (!this.closestComponentSet || newPath < this.closestComponentSet[1]) {
        this.closestComponentSet = [set, newPath]
        return true
      }
    }
    return false
  }

  reachFromComponents() {
    if (this.reached || !this.closestComponentSet) {
      throw new Error(`Can't use components to reach`)
    }
    const reachability = Reachability.reachabilityFromSet(this.key, this.closestComponentSet[0])
    if (!reachability) {
      throw new Error(`Can't use components to reach`)
    }
    this._path = reachability._path
    this.setReached()
  }

  duplicate() {
    const duplicate = new Reachability(this.key)
    duplicate._path = new SetOfSubjects(this._path)
    return duplicate
  }
}
