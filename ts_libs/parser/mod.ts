import { Map, Pair } from './helpers.ts';
import { inOrder, oneOf } from './combinators.ts';
import { Either, Left, Right } from '../adt/common.ts';

export class Source {
  constructor(public src: string, public current: number) {}

  toResult<T>(value: T, increment: number): Result<T> {
    return new Result(
      value,
      this.src,
      Span.new(this.current, this.current + increment)
    );
  }

  toSuccess<T>(value: T, increment: number): Result<Either<T, never>> {
    return new Result(
      Left(value),
      this.src,
      Span.new(this.current, this.current + increment)
    );
  }

  toFailure(value: string): Result<Either<never, SyntaxError>> {
    return new Result(
      Right(ParserError(value)),
      this.src,
      Span.new(this.current, this.current)
    );
  }

  static fromString(src: string) {
    return new Source(src, 0);
  }
}

export class Span {
  constructor(public start: number, public end: number) {}

  static new(start: number, end: number) {
    return new Span(start, end);
  }
}

export class Result<T> extends Source implements Map<T> {
  constructor(public value: T, public src: string, public span: Span) {
    super(src, span.end);
  }
  map<V>(fn: (value: T, span: Span) => V): Result<V> {
    return new Result(fn(this.value, this.span), this.src, this.span);
  }
  mapLeft<V, L, R>(
    this: Result<Either<L, R>>,
    fn: (value: L, span: Span) => V
  ): Result<Either<V, R>> {
    return new Result(
      this.value.mapLeft((l) => fn(l, this.span)),
      this.src,
      this.span
    );
  }
  transpose<L, R>(this: Result<Either<L, R>>): Either<Result<L>, R> {
    const { src, span } = this;
    return this.value.match({
      Left(val) {
        return Left(new Result(val, src, span));
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
    const { src } = this;
    const result = this.mapLeft((l1) =>
      fn(this)
        .mapLeft((l2) => new Pair(l1, l2))
        .transpose()
    );

    return result.value.flattenLeft().match({
      Right: (val) => new Result(Right<R, Pair<L1, L2>>(val), src, result.span),
      Left(res) {
        return new Result(
          Left<Pair<L1, L2>, R>(res.value),
          src,
          Span.new(result.span.start, res.span.end)
        );
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

  map<V>(fn: (value: T, span: Span) => V): Parser<V> {
    return makeParser((input) =>
      this.parse(input).map((res, span) => res.mapLeft((l) => fn(l, span)))
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

  debug() {
    return this.map((val) => {
      console.debug(val);
      return val;
    });
  }
  mapRes<V>(
    fn: (
      result: Result<Either<T, SyntaxError>>
    ) => Result<Either<V, SyntaxError>>
  ): Parser<V> {
    return makeParser((input) => fn(this.parse(input)));
  }

  debugRes() {
    return this.mapRes((val) => {
      console.debug(val);
      return val;
    });
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
