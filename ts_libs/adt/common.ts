abstract class Option<T> {
  abstract map<U>(fn: (val: T) => U): Option<U>;

  abstract unwrapOr(fn: () => T): T;

  abstract unwrapOrDefault(def: T): T;

  match<U>(patterns: { Some(val: T): U; None(): U }): U {
    return this.map(patterns.Some).unwrapOr(patterns.None);
  }
}

class Some_<T> extends Option<T> {
  constructor(public val: T) {
    super();
  }

  map<U>(fn: (val: T) => U): Option<U> {
    return new Some_(fn(this.val));
  }

  unwrapOr(): T {
    return this.val;
  }

  unwrapOrDefault() {
    return this.unwrapOr();
  }
}

class None_<T> extends Option<T> {
  map<U>(): Option<U> {
    return new None_<U>();
  }

  unwrapOr(fn: () => T): T {
    return fn();
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

  match<U>(patterns: { Left(val: L): U; Right(val: R): U }): U {
    if (this instanceof Left) {
      return this.mapLeft(patterns.Left).unwrapLeft();
    }
    return this.mapRight(patterns.Right).unwrapRight();
  }
}
class Right_<R, L> extends Either<L, R> {
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
}

class Left_<L, R> extends Either<L, R> {
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
}

export type { Either, Option };

export function Left<L, R = never>(val: L): Either<L, R> {
  return new Left_<L, R>(val);
}

export function Right<R, L = never>(val: R): Either<L, R> {
  return new Right_<R, L>(val);
}
