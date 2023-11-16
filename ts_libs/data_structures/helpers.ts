export interface Map<T> {
  map<V>(fn: (value: T) => V): Map<V>;
}

export class Pair<T, U> {
  constructor(public first: T, public second: U) {}
}

export class Triple<T, U, V> {
  constructor(public first: T, public second: U, public third: V) {}
}

type ADT<F = unknown, S = unknown, T = unknown> = Pair<F, S> | Triple<F, S, T>;
export const first = <F>(ds: ADT<F>) => ds.first;
export const second = <S>(ds: ADT<unknown, S>) => ds.second;
export const third = <T>(ds: Triple<unknown, unknown, T>) => ds.third;
export const join = (strArr: string[]) => strArr.join('');

export function zip<T, U>(xs: T[], ys: U[]): Array<[T, U]> {
  const minLength = Math.min(xs.length, ys.length);
  return xs.slice(0, minLength).map((v, i) => [v, ys.slice(0, minLength)[i]]);
}

export function zipWithNext<T>(xs: T[]): Array<[T, T]> {
  return zip(xs, xs.slice(1));
}

export function getOrThrow<M extends Record<K, unknown>, K extends PropertyKey>(
  map: M,
  key: K
): M[K] {
  const value = map[key];
  if (!value) {
    throw `[Undefined] use of an undefined reference ${String(key)}`;
  }
  return value;
}
