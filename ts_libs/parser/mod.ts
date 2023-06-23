import { Map } from './helpers.ts';
import { inOrder, oneOf } from './combinators.ts';

export class Source {
  constructor(public src: string, public start: number) {}

  toResult<T>(value: T, increment: number): Result<T> {
    return new Result(value, this.src, this.start + increment);
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
}

export const ParserError = (msg: string) =>
  new SyntaxError(`[ParserError]: ${msg}`);

export class Parser<T> implements Map<T> {
  constructor(public parse: (input: Source) => Result<T>) {}

  map<V>(fn: (value: T) => V): Parser<V> {
    return makeParser((input) => this.parse(input).map(fn));
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

export function makeParser<T>(parse: (input: Source) => Result<T>) {
  return new Parser(parse);
}
