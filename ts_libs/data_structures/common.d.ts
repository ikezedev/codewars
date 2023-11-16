import { Pair } from './helpers';
declare abstract class Option<T> {
    abstract map<U>(fn: (val: T) => U): Option<U>;
    abstract unwrapOr(fn: () => T): T;
    abstract unwrap(): T;
    abstract unwrapOrDefault(def: T): T;
    abstract zip<U>(other: Option<U>): Option<Pair<T, U>>;
    abstract flatten<U>(this: Option<Option<U>>): Option<U>;
    abstract isSome(): boolean;
    abstract isNone(): boolean;
    match<U>(patterns: {
        Some(val: T): U;
        None(): U;
    }): U;
    collect<T>(opts: Option<T>[]): Option<T[]>;
}
export declare const None: Option<never>;
export declare function Some<T>(val: T): Option<T>;
declare abstract class Either<L, R> {
    abstract mapLeft<U>(fn: (val: L) => U): Either<U, R>;
    abstract mapRight<U>(fn: (val: R) => U): Either<L, U>;
    abstract unwrapLeftOr(fn: () => L): L;
    abstract unwrapLeftOrDefault(def: L): L;
    abstract unwrapRightOr(fn: () => R): R;
    abstract unwrapRightOrDefault(def: R): R;
    abstract unwrapRight(): R;
    abstract unwrapLeft(): L;
    abstract zipLeft<U>(other: Either<U, R>): Either<Pair<L, U>, R>;
    abstract flattenLeft<U>(this: Either<Either<U, R>, R>): Either<U, R>;
    abstract flattenRight<U>(this: Either<L, Either<L, U>>): Either<L, U>;
    abstract zipRight<U>(other: Either<L, U>): Either<L, Pair<R, U>>;
    abstract isLeft(): boolean;
    abstract isRight(): boolean;
    abstract swap(): Either<R, L>;
    abstract ok(): Option<L>;
    match<U>(patterns: {
        Left(val: L): U;
        Right(val: R): U;
    }): U;
    static collectLeft<L, R>(eithers: Either<L, R>[]): Either<L[], R>;
    static collectRight<L, R>(eithers: Either<L, R>[]): Either<L, R[]>;
}
export { Either, Option };
export declare function Left<L, R = never>(val: L): Either<L, R>;
export declare function Right<R, L = never>(val: R): Either<L, R>;
