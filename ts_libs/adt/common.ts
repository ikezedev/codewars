import { Pair } from '../parser/helpers.ts';

abstract class Option<T> {
  abstract map<U>(fn: (val: T) => U): Option<U>;

  abstract unwrapOr(fn: () => T): T;
  abstract unwrap(): T;

  abstract unwrapOrDefault(def: T): T;
  abstract zip<U>(other: Option<U>): Option<Pair<T, U>>;
  abstract flatten<U>(this: Option<Option<U>>): Option<U>;

  abstract isSome(): boolean;
  abstract isNone(): boolean;

  match<U>(patterns: { Some(val: T): U; None(): U }): U {
    return this.map(patterns.Some).unwrapOr(patterns.None);
  }

  collect<T>(opts: Option<T>[]): Option<T[]> {
    const res: T[] = [];
    let seenNone = false;

    for (const opt of opts) {
      if (seenNone) return None;
      opt.match({
        Some(val) {
          res.push(val);
        },
        None() {
          seenNone = true;
        },
      });
    }
    return Some(res);
  }
}

class Some_<T> extends Option<T> {
  isSome(): boolean {
    return true;
  }
  isNone(): boolean {
    return false;
  }
  flatten<U>(this: Option<Option<U>>): Option<U> {
    return this.match({
      Some(val) {
        return val;
      },
      None() {
        return None;
      },
    });
  }

  zip<U>(other: Option<U>): Option<Pair<T, U>> {
    return other.map((o) => new Pair(this.val, o));
  }
  constructor(public val: T) {
    super();
  }

  map<U>(fn: (val: T) => U): Option<U> {
    return new Some_(fn(this.val));
  }

  unwrap(): T {
    return this.val;
  }

  unwrapOr(): T {
    return this.val;
  }

  unwrapOrDefault() {
    return this.unwrapOr();
  }
}

class None_<T> extends Option<T> {
  isSome(): boolean {
    return false;
  }
  isNone(): boolean {
    return true;
  }
  flatten<U>(this: Option<Option<U>>): Option<U> {
    return None;
  }

  zip<U>(): Option<Pair<T, U>> {
    return None;
  }
  map<U>(): Option<U> {
    return new None_<U>();
  }

  unwrapOr(fn: () => T): T {
    return fn();
  }

  unwrap(): T {
    throw new Error('Tried to unwrap a None variant');
  }

  unwrapOrDefault(def: T) {
    return def;
  }
}

export const None: Option<never> = new None_();

export function Some<T>(val: T): Option<T> {
  return new Some_(val);
}

abstract class Either<L, R> {
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

  match<U>(patterns: { Left(val: L): U; Right(val: R): U }): U {
    if (this.isLeft()) {
      return this.mapLeft(patterns.Left).unwrapLeft();
    }
    return this.mapRight(patterns.Right).unwrapRight();
  }
  static collectLeft<L, R>(eithers: Either<L, R>[]): Either<L[], R> {
    const res: L[] = [];
    let seenRight: Pair<boolean, R | null> = new Pair(false, null);
    for (const e of eithers) {
      if (seenRight.first) {
        return Right(seenRight.second!);
      }
      e.match({
        Left(val) {
          res.push(val);
        },
        Right(val) {
          seenRight = new Pair(true, val);
        },
      });
    }
    return Left(res);
  }
  static collectRight<L, R>(eithers: Either<L, R>[]): Either<L, R[]> {
    const res: R[] = [];
    let seenLeft: Pair<boolean, L | null> = new Pair(false, null);
    for (const e of eithers) {
      if (seenLeft.first) {
        return Left(seenLeft.second!);
      }
      e.match({
        Right(val) {
          res.push(val);
        },
        Left(val) {
          seenLeft = new Pair(true, val);
        },
      });
    }
    return Right(res);
  }
}
class Right_<R, L> extends Either<L, R> {
  swap(): Either<R, L> {
    return Left(this.val);
  }
  isLeft(): boolean {
    return false;
  }
  isRight(): boolean {
    return true;
  }
  flattenRight<U>(this: Either<L, Either<L, U>>): Either<L, U> {
    return this.match({
      Right: (val) => val,
      Left() {
        throw new Error('unreachable');
      },
    });
  }
  flattenLeft<U>(this: Either<Either<U, R>, R>): Either<U, R> {
    return this.match({
      Right: (val) => Right(val),
      Left() {
        throw new Error('unreachable');
      },
    });
  }

  zipRight<U>(other: Either<L, U>): Either<L, Pair<R, U>> {
    return other.mapRight((o) => new Pair(this.val, o));
  }
  zipLeft<U>(): Either<Pair<L, U>, R> {
    return Right(this.val);
  }
  constructor(private val: R) {
    super();
  }

  mapLeft<U>(): Either<U, R> {
    return Right(this.val);
  }

  mapRight<U>(fn: (val: R) => U): Either<L, U> {
    return Right(fn(this.val));
  }

  unwrapLeftOr(fn: () => L): L {
    return fn();
  }

  unwrapLeftOrDefault(def: L): L {
    return this.unwrapLeftOr(() => def);
  }

  unwrapRightOr(): R {
    return this.val;
  }

  unwrapRightOrDefault(): R {
    return this.unwrapRightOr();
  }

  unwrapLeft(): L {
    throw new Error('Tried to unwrap left on a right variant');
  }

  unwrapRight(): R {
    return this.val;
  }

  ok(): Option<L> {
    return None;
  }
}

class Left_<L, R> extends Either<L, R> {
  swap(): Either<R, L> {
    return Right(this.val);
  }
  isLeft(): boolean {
    return true;
  }
  isRight(): boolean {
    return false;
  }
  flattenRight<U>(this: Either<L, Either<L, U>>): Either<L, U> {
    return this.match({
      Right() {
        throw new Error('unreachable');
      },
      Left: (val) => Left(val),
    });
  }
  flattenLeft<U>(this: Either<Either<U, R>, R>): Either<U, R> {
    return this.match({
      Right() {
        throw new Error('unreachable');
      },
      Left: (val) => val,
    });
  }
  zipRight<U>(): Either<L, Pair<R, U>> {
    return Left(this.val);
  }
  zipLeft<U>(other: Either<U, R>): Either<Pair<L, U>, R> {
    return other.mapLeft((o) => new Pair(this.val, o));
  }
  constructor(private val: L) {
    super();
  }

  mapRight<U>(): Either<L, U> {
    return Left(this.val);
  }

  mapLeft<U>(fn: (val: L) => U): Either<U, R> {
    return Left(fn(this.val));
  }

  unwrapLeftOr(): L {
    return this.val;
  }

  unwrapLeftOrDefault(): L {
    return this.unwrapLeftOr();
  }

  unwrapRightOr(fn: () => R): R {
    return fn();
  }

  unwrapRightOrDefault(def: R): R {
    return this.unwrapRightOr(() => def);
  }

  unwrapLeft(): L {
    return this.val;
  }

  unwrapRight(): R {
    throw new Error('Tried to unwrap left on a right variant');
  }

  ok(): Option<L> {
    return Some(this.val);
  }
}

export { Either, Option };

export function Left<L, R = never>(val: L): Either<L, R> {
  return new Left_<L, R>(val);
}

export function Right<R, L = never>(val: R): Either<L, R> {
  return new Right_<R, L>(val);
}
