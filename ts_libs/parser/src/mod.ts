import { Map, Pair } from '@ikezedev/ds';
import { inOrder, oneOf, opt, recoverable } from './combinators';
import { Either, Left, Right } from '@ikezedev/ds';
import { not, trimStart, trimStartWith } from './primitive';

export class PError {
  constructor(public span: Span, public message?: string) {}
  static new(span: Span, message?: string) {
    return new PError(span, message);
  }
}
export class ParsingContext {
  constructor(private errors: PError[] = []) {}
  addError(err: PError) {
    this.errors.push(err);
  }

  getErrors(): PError[] {
    const group = this.errors.reduce((acc, a) => {
      const key = `${a.span.start}-${a.span.end}`;
      if (!acc[key]) {
        acc[key] = [a];
      } else {
        acc[key].push(a);
      }
      return acc;
    }, {} as Record<string, PError[]>);
    return Object.values(group).map((e) => e[0]);
  }
}

export class Source {
  constructor(
    public src: string,
    public current: number,
    public context: ParsingContext = new ParsingContext()
  ) {}

  toResult<T>(value: T, increment: number): Result<T>;
  toResult<T>(value: T, start: number, end: number): Result<T>;
  toResult<T>(value: T, startOrIncrement: number, end?: number): Result<T> {
    const hasEnd = end !== undefined;
    return new Result(
      value,
      this.src,
      Span.new(
        hasEnd ? startOrIncrement : this.current,
        hasEnd ? end : this.current + startOrIncrement
      ),
      this.context
    );
  }

  addError(err: PError) {
    this.context.addError(err);
  }

  toSuccess<T>(value: T, increment: number): Result<Either<T, never>> {
    return new Result(
      Left(value),
      this.src,
      Span.new(this.current, this.current + increment),
      this.context
    );
  }

  toFailure(value: string): Result<Either<never, SyntaxError>> {
    return new Result(
      Right(ParserError(value, Span.new(this.current, this.current))),
      this.src,
      Span.new(this.current, this.current),
      this.context
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

  getStartLine(src: string) {
    return src.slice(0, this.start).split('\n').length - 1;
  }

  getEndLine(src: string) {
    return src.slice(0, this.end).split('\n').length - 1;
  }

  extractSrc(src: String) {
    return src.slice(this.start, this.end);
  }
}

export class Result<T> extends Source implements Map<T> {
  constructor(
    public value: T,
    public src: string,
    public span: Span,
    public context: ParsingContext
  ) {
    super(src, span.end, context);
  }
  map<V>(fn: (value: T, span: Span) => V): Result<V> {
    return new Result(
      fn(this.value, this.span),
      this.src,
      this.span,
      this.context
    );
  }
  mapLeft<V, L, R>(
    this: Result<Either<L, R>>,
    fn: (value: L, span: Span) => V
  ): Result<Either<V, R>> {
    return new Result(
      this.value.mapLeft((l) => fn(l, this.span)),
      this.src,
      this.span,
      this.context
    );
  }
  transpose<L, R>(this: Result<Either<L, R>>): Either<Result<L>, R> {
    const { src, span, context } = this;
    return this.value.match({
      Left(val) {
        return Left(new Result(val, src, span, context));
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
      Right: (val) =>
        new Result(
          Right<R, Pair<L1, L2>>(val),
          src,
          result.span,
          result.context
        ),
      Left(res) {
        return new Result(
          Left<Pair<L1, L2>, R>(res.value),
          src,
          Span.new(result.span.start, res.span.end),
          res.context
        );
      },
    });
  }
}

export const ParserError = (msg: string, span: Span) =>
  new SyntaxError(
    `[ParserError]: ${msg}. Span {start: ${span.start}, end: ${span.end}}`
  );

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

  recoverAt<V>(continueAt: AllParser<V>, message: string) {
    return recoverable(this, continueAt, message);
  }

  recover(message: string) {
    return recoverable(this, not(this), message);
  }

  trimStart() {
    return this.chain(trimStart);
  }

  trimStartWith(more: AllParser<unknown>) {
    return trimStartWith(this, more);
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
      console.debug({ value: val.value, span: val.span });
      return val;
    });
  }

  discard(p: Parser<unknown>): Parser<T> {
    return this.and(p).map((r) => r.first);
  }

  discardOpt(p: AllParser<unknown>): Parser<T> {
    return this.and(opt(p)).map((r) => r.first);
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
