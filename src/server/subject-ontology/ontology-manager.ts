import {OntologyShareProtocol, OntologyStoreProtocol} from '../aries-based-protocols'
import {first, ReplaySubject, switchMap} from "rxjs";
import {Server} from '@project-types'
import {map} from "rxjs/operators";
import {Immutable} from "@project-utils";

export class OntologyManager {
  static readonly instance = new OntologyManager()
  private constructor() { }

  private readonly _state$ = new ReplaySubject<Immutable<Server.Subjects>>(1)
  readonly state$ = this._state$.asObservable()

  controllerInitialise$() {
    return OntologyShareProtocol.instance.controllerInitialise$().pipe(
      switchMap(() => OntologyStoreProtocol.instance.controllerInitialise$()),
      map(state => {
        this._state$.next(state)
        this.ensureOntologyIsNotEmpty()
      })
    )
  }

  private ensureOntologyIsNotEmpty() {
    this._state$.subscribe(state => {
      if (state.size === 0) {
        const newState: Server.Subjects = new Map()
        newState.set('knowledge', {children: new Set(), componentSets: new Set()})
        this._state$.next(newState)
      }
    })
  }

  addComponentSet$(parent: string, set: ReadonlySet<string>) {
    return this._state$.pipe(
      first(),
      map(state => {
        const newState = this.addComponentSet(parent, set, state);
        this._state$.next(newState)
      })
    )
  }

  private addComponentSet(parent: string, set: ReadonlySet<string>, state: Immutable<Server.Subjects>) {
    const newState = new Map()
    state.forEach((value, key) => {
      if (key !== parent) newState.set(key, value)
      else {
        const componentSets = new Set<Immutable<Set<string>>>()
        componentSets.add(new Set(set))
        value.componentSets.forEach(set => componentSets.add(set))
        newState.set(key, {children: value.children, componentSets} as typeof value)
      }
    })
    return newState as typeof state
  }

  removeComponentSet$(parent: string, set: ReadonlySet<string>) {
    return this._state$.pipe(
      first(),
      map(state => {
        const newState = this.removeComponentSet(parent, set, state)
        this._state$.next(newState)
      })
    )
  }

  private removeComponentSet(parent: string, set: ReadonlySet<string>, state: Immutable<Server.Subjects>) {
    const componentSetID = (set: Immutable<Set<string>>) => [...set].sort().join('-')
    const setToRemoveID = componentSetID(set)
    const newState = new Map()
    state.forEach((value, key) => {
      if (key !== parent) newState.set(key, value)
      else {
        const componentSets = new Set<Immutable<Set<string>>>()
        value.componentSets.forEach(set => {
          if (componentSetID(set) !== setToRemoveID) componentSets.add(set)
        })
        newState.set(key, {children: value.children, componentSets} as typeof value)
      }
    })
    return newState as typeof state
  }

  addChild$(parent: string, child: string) {
    return this._state$.pipe(
      first(),
      map(state => {
        const newState = this.addChild(parent, child, state)
        this._state$.next(newState)
      })
    )
  }

  private addChild(parent: string, child: string, state: Immutable<Server.Subjects>) {
    const newState = new Map()
    state.forEach((value, key) => {
      if (key !== parent) newState.set(key, value)
      else {
        const children = new Set<string>()
        children.add(child)
        value.children.forEach(child => children.add(child))
        newState.set(key, {children, componentSets: value.componentSets} as typeof value)
      }
    })
    if (!newState.has(child)) {
      (newState as Server.Subjects)
        .set(child, {children: new Set(), componentSets: new Set()})
    }
    return newState as typeof state
  }

  removeChild$(parent: string, child: string, subjectsToRemove: ReadonlySet<string> | null = null) {
    return this._state$.pipe(
      first(),
      map(state => {
        const newState = this.removeChild(parent, child, subjectsToRemove, state)
        this._state$.next(newState)
      })
    )
  }

  private removeChild(parent: string, child: string, subjectsToRemove: ReadonlySet<string> | null, state: Immutable<Server.Subjects>) {
    let newState = this._removeChild(parent, child, state)
    if (!subjectsToRemove) return newState
    for (const subject of subjectsToRemove) {
      newState = this.removeSubject(subject, newState)
    }
    return newState
  }

  private _removeChild(parent: string, child: string, state: Immutable<Server.Subjects>) {
    const newState = new Map()
    state.forEach((value, key) => {
      if (key !== parent) newState.set(key, value)
      else {
        const children = new Set<string>()
        value.children.forEach(_child => {
          if (_child !== child) children.add(_child)
        })
        newState.set(key, {children, componentSets: value.componentSets} as typeof value)
      }
    })
    return newState as typeof state
  }

  private removeSubject(subject: string, state: Immutable<Server.Subjects>) {
    let newState = new Map()
    state.forEach((value, key) => {
      if (key !== subject) newState.set(key, value)
    })
    return newState
  }
}
