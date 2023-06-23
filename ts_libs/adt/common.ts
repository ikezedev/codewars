class Option<T> {
  constructor(private __val?: T) {}
  map<U>(fn: (val: T) => U): Option<U> {
    if (this.__val === undefined) return None;
    return new Option(fn(this.__val));
  }

  unwrapOr(fn: () => T): T {
    if (this.__val === undefined) return fn();
    return this.__val;
  }

  unwrapOrDefault(def: T): T {
    return this.unwrapOr(() => def);
  }

  match<U>(patterns: { Some(val: T): U; None(): U }): U {
    return this.map(patterns.Some).unwrapOr(patterns.None);
  }
}

export const None = new Option<never>();

export function Some<T>(val: T) {
  return new Option(val);
}

class Either<L, R> {
  private isLeft: boolean;
  private left?: L;
  private right?: R;

  constructor(val: { left: L });
  constructor(val: { right: R });
  constructor(val: { left: L } | { right: R }) {
    if ('left' in val) {
      this.left = val.left;
      this.isLeft = true;
    } else {
      this.right = val.right;
      this.isLeft = false;
    }
  }
  mapLeft<U>(fn: (val: L) => U): Either<U, R> {
    if (this.isLeft) return Left(fn(this.left!));
    return Right(this.right!);
  }

  mapRight<U>(fn: (val: R) => U): Either<L, U> {
    if (!this.isLeft) return Right(fn(this.right!));
    return Left(this.left!);
  }

  unwrapLeftOr(fn: () => L): L {
    if (this.isLeft) return this.left!;
    return fn();
  }

  unwrapLeftOrDefault(def: L): L {
    return this.unwrapLeftOr(() => def);
  }

  unwrapRightOr(fn: () => R): R {
    if (!this.isLeft) return this.right!;
    return fn();
  }

  unwrapRightOrDefault(def: R): R {
    return this.unwrapRightOr(() => def);
  }

  match<U>(patterns: { Left(val: L): U; Right(val: R): U }): U {
    if (this.isLeft) {
      return patterns.Left(this.left!);
    }
    return patterns.Right(this.right!);
  }
}

export type { Either, Option };

export function Left<T>(val: T) {
  return new Either<T, never>({ left: val });
}

export function Right<T>(val: T) {
  return new Either<never, T>({ right: val });
}
