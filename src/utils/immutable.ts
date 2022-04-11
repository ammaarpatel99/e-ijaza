type Primitive = undefined | null | boolean | string | number | Function

export type Immutable<T> =
  T extends Primitive ? T :
    T extends Array<infer U> ? ImmutableArray<U> :
      T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
        T extends Set<infer S> ? ImmutableSet<S> : ImmutableObject<T>

interface ImmutableArray<T> extends ReadonlyArray<Immutable<T>> {}
interface ImmutableMap<K, V> extends ReadonlyMap<Immutable<K>, Immutable<V>> {}
interface ImmutableSet<T> extends ReadonlySet<Immutable<T>> {}
type ImmutableObject<T> = {
  readonly [K in keyof T]: Immutable<T[K]>
}
