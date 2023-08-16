import { Map, Pair } from './helpers.ts';
import { inOrder, oneOf } from './combinators.ts';
import { Either, Left, Right } from '../adt/common.ts';

export class Source {
  constructor(public src: string, public start: number) {}

  toResult<T>(value: T, increment: number): Result<T> {
    return new Result(value, this.src, this.start + increment);
  }

  toSuccess<T>(value: T, increment: number): Result<Either<T, never>> {
    return new Result(Left(value), this.src, this.start + increment);
  }

  toFailure<T extends SyntaxError>(value: T): Result<Either<never, T>> {
    return new Result(Right(value), this.src, this.start);
  }

  static fromString(src: string) {
    return new Source(src, 0);
  }
}

export class Result<T> extends Source implements Map<T> {
  constructor(public value: T, public src: string, public start: number) {
    super(src, start);
  }
  map<V>(fn: (value: T) => V): Result<V> {
    return new Result(fn(this.value), this.src, this.start);
  }
  mapLeft<V, L, R>(
    this: Result<Either<L, R>>,
    fn: (value: L) => V
  ): Result<Either<V, R>> {
    return new Result(this.value.mapLeft(fn), this.src, this.start);
  }
  transpose<L, R>(this: Result<Either<L, R>>): Either<Result<L>, R> {
    const { src, start } = this;
    return this.value.match({
      Left(val) {
        return Left(new Result(val, src, start));
      },
      Right(val) {
        return Right(val);
      },
    });
  }
  chain<L1, L2, R>(
    this: Result<Either<L1, R>>,
    fn: (source: Result<Either<L1, R>>) => Result<Either<L2, R>>
  ): Result<Either<Pair<L1, L2>, R>> {
    const { src, start } = this;
    return this.mapLeft((l1) =>
      fn(this)
        .mapLeft((l2) => new Pair(l1, l2))
        .transpose()
    )
      .value.flattenLeft()
      .match({
        Right: (val) => new Result(Right<R, Pair<L1, L2>>(val), src, start),
        Left(res) {
          return res.map((val) => Left(val));
        },
      });
  }
}

export const ParserError = (msg: string) =>
  new SyntaxError(`[ParserError]: ${msg}`);

export class Parser<T> implements Map<T> {
  constructor(
    public parse: (input: Source) => Result<Either<T, SyntaxError>>
  ) {}

  map<V>(fn: (value: T) => V): Parser<V> {
    return makeParser((input) =>
      this.parse(input).map((res) => res.mapLeft(fn))
    );
  }

  chain<V>(parserFn: (parser: AllParser<T>) => Parser<V>): Parser<V> {
    return parserFn(this);
  }

  and<V>(other: AllParser<V>) {
    return inOrder(this, other);
  }

  or(other: AllParser<T>) {
    return oneOf(this, other);
  }
}

export type AllParser<T> = Parser<T> | (() => Parser<T>);

export function getParser<T>(parser: AllParser<T>): Parser<T> {
  if (typeof parser === 'function') return parser();
  return parser;
}

export function makeParser<T>(
  parse: (input: Source) => Result<Either<T, SyntaxError>>
) {
  return new Parser(parse);
}
