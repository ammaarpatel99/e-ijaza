import {Subject} from './subject'

class Queue<T> {
  protected readonly queue: T[] = []

  isEmpty() {
    return this.queue.length === 0
  }

  add(...data: T[]) {
    this.queue.push(...data)
  }

  peak() {
    if (this.isEmpty()) {
      throw new Error(`Can't peak on empty queue`)
    }
    return this.queue[0]
  }

  remove() {
    const res = this.queue.shift()
    if (res === undefined) {
      throw new Error(`Can't remove from empty queue`)
    }
    return res
  }
}

class OrderedQueue<T> extends Queue<T> {
  constructor(
    private readonly valueFun: (item: T) => number,
    private readonly equalityFun: (item1: T, item2: T) => boolean = () => false
  ) {
    super();
  }

  peakValue() {
    return this.valueFun(this.peak())
  }

  override add(...data: T[]) {
    for (const item of data) {
      let placed = false
      for (let i = 0; i < this.queue.length; i++) {
        if (!placed && this.valueFun(item) < this.valueFun(this.queue[i])) {
          this.queue.splice(i, 0, item)
          placed = true
        } else if (this.equalityFun(item, this.queue[i])) {
          this.queue.splice(i, 1)
        }
      }
      if (!placed) super.add(item)
    }
  }
}

export enum SubjectSearchSetting {
  FOUND_FIRST,
  CHILDREN_FIRST,
  CLOSEST_FIRST,
  CHILDREN_ONLY
}

export class SubjectQueue {
  private readonly queue = new Queue<Subject>()
  private readonly orderedQueue = new OrderedQueue<Subject>(
    item => this.distanceUsingComponents(item),
    (item1, item2) => item1 === item2
  )

  constructor(private readonly key: string, private readonly setting: SubjectSearchSetting) { }

  private distanceUsingComponents(subject: Subject) {
    const value = subject.getReachability(this.key, true)?.distanceUsingComponents
    if (value === undefined) throw new Error(``)
    return value
  }

  isEmpty() {
    return this.queue.isEmpty() && this.orderedQueue.isEmpty()
  }

  add(...data: Subject[]) {
    this.queue.add(...data)
  }

  addFromComponents(...data: Subject[]) {
    if (this.setting === SubjectSearchSetting.CHILDREN_ONLY) {
      return
    }
    if (this.setting === SubjectSearchSetting.FOUND_FIRST) {
      data.forEach(subject => subject.reachFromComponents(this.key))
      this.add(...data)
    } else {
      this.orderedQueue.add(...data)
    }
  }

  remove() {
    if (this.isEmpty()) {
      throw new Error(`can't remove from empty subject queue`)
    } else if (this.orderedQueue.isEmpty() || (!this.queue.isEmpty() && this.setting === SubjectSearchSetting.CHILDREN_FIRST)) {
      return this.queue.remove()
    } else if (!this.queue.isEmpty()) {
      const r = this.queue.peak().getReachability(this.key)
      if (!r || !r.path) throw new Error(`Subject at the front of the queue isn't reachable, and so can't be removed`)
      if (r.path.size >= this.orderedQueue.peakValue()) {
        return this.queue.remove()
      }
    }
    const item = this.orderedQueue.remove()
    item.reachFromComponents(this.key)
    return item
  }

  private removeItemFromOrderedQueue() {
    const item = this.orderedQueue.remove()
    item.reachFromComponents(this.key)
    this.queue.add(item)
  }
}
