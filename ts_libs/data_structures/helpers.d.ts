export interface Map<T> {
    map<V>(fn: (value: T) => V): Map<V>;
}
export declare class Pair<T, U> {
    first: T;
    second: U;
    constructor(first: T, second: U);
}
export declare class Triple<T, U, V> {
    first: T;
    second: U;
    third: V;
    constructor(first: T, second: U, third: V);
}
type ADT<F = unknown, S = unknown, T = unknown> = Pair<F, S> | Triple<F, S, T>;
export declare const first: <F>(ds: ADT<F, unknown, unknown>) => F;
export declare const second: <S>(ds: ADT<unknown, S, unknown>) => S;
export declare const third: <T>(ds: Triple<unknown, unknown, T>) => T;
export declare const join: (strArr: string[]) => string;
export declare function zip<T, U>(xs: T[], ys: U[]): Array<[T, U]>;
export declare function zipWithNext<T>(xs: T[]): Array<[T, T]>;
export declare function getOrThrow<M extends Record<K, unknown>, K extends PropertyKey>(map: M, key: K): M[K];
export {};
