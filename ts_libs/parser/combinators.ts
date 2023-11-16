import { Either, Left, None, Option, Right, Some } from '@ikezedev/ds';
import { Pair, Triple } from '@ikezedev/ds';
import {
  Parser,
  makeParser,
  Result,
  Source,
  AllParser,
  getParser,
  Span,
  PError,
} from './mod';
import { any } from './primitive';

export function inOrder<T, U>(
  p1: AllParser<T>,
  p2: AllParser<U>
): Parser<Pair<T, U>>;
export function inOrder<T, U, V>(
  p1: AllParser<T>,
  p2: AllParser<U>,
  p3: AllParser<V>
): Parser<Triple<T, U, V>>;
export function inOrder<T, U, V>(
  p1: AllParser<T>,
  p2: AllParser<U>,
  p3?: AllParser<V>
): Parser<Pair<T, U>> | Parser<Triple<T, U, V>> {
  if (!p3) {
    return makeParser((input) => {
      const first = getParser(p1).parse(input);
      return first.chain(getParser(p2).parse);
    });
  }
  return makeParser((input) => {
    const first = getParser(p1).parse(input);
    const second = first.chain(getParser(p2).parse);
    return second
      .chain(getParser(p3).parse)
      .mapLeft(
        ({ first: { first, second }, second: third }) =>
          new Triple(first, second, third)
      );
  });
}

export function oneOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return makeParser((input): Result<Either<T[], SyntaxError>> => {
    const res: Result<Either<T, SyntaxError>>[] = [];
    let next = getParser(p).parse(input);
    while (input.src.length >= next.current && next.value.isLeft()) {
      res.push(next);
      next = getParser(p).parse(next);
    }
    if (res.length > 0) {
      const value = Either.collectLeft(res.map((r) => r.value));
      const [{ start }, { end }] = [res[0].span, res.at(-1)!.span];
      return input.toResult(value, start, end);
    } else {
      return input.toFailure(
        'expected to match one or more variant but got none'
      );
    }
  });
}

export function zeroOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return oneOrMore(p)
    .chain(opt)
    .map((val) => val.unwrapOrDefault([]));
}

export function oneOf<T>(...ps: Array<AllParser<T>>): Parser<T> {
  const parse =
    (
      ps: Array<AllParser<T>>,
      lastResult: Option<Result<Either<T, SyntaxError>>>
    ) =>
    (input: Source): Result<Either<T, SyntaxError>> => {
      if (!ps.length) {
        const lastError = lastResult.isSome()
          ? '\n' + lastResult.unwrap().value.unwrapRight().message
          : '';
        return input.toFailure(
          `did not match any variant at ${input.current}` + lastError
        );
      }
      const result = getParser(ps[0]).parse(input);
      if (result.value.isLeft()) {
        return result;
      }
      return parse(ps.slice(1), Some(result))(input);
    };
  return makeParser(parse(ps, None));
}

export function separated<T, S>(parser: AllParser<T>, separator: AllParser<S>) {
  return inOrder(parser, zeroOrMore(inOrder(separator, parser)));
}

export function leftAssociative<T, S>(
  parser: AllParser<T>,
  separator: AllParser<S>,
  transform: (entry: Triple<T, S, T>, span: Span) => T
) {
  return separated(parser, separator).map(({ first, second: rest }, span) =>
    rest.reduce(
      (acc, next) => transform(new Triple(acc, next.first, next.second), span),
      first
    )
  );
}

export function rightAssociative<T, S>(
  parser: AllParser<T>,
  separator: AllParser<S>,
  transform: (entry: Triple<T, S, T>, span: Span) => T
) {
  return inOrder(zeroOrMore(inOrder(parser, separator)), parser).map(
    ({ first: rest, second: last }, span) =>
      rest.reduceRight(
        (acc, next) =>
          transform(new Triple(acc, next.second, next.first), span),
        last
      )
  );
}

export function surrounded<T, S, S2 = S>(
  opening: AllParser<S>,
  parser: AllParser<T>,
  closing: AllParser<S2>
): Parser<T> {
  return inOrder(opening, parser, closing).map(({ second }) => second);
}

function noop() {
  return makeParser((input) => {
    return input.toSuccess(None, 0);
  });
}

export function opt<T>(parser: AllParser<T>) {
  return getParser(parser)
    .map((val) => Some(val))
    .or(noop);
}

export function takeUntil<T>(parser: AllParser<T>, stopAt: AllParser<unknown>) {
  return makeParser((input): Result<Either<T[], SyntaxError>> => {
    const res: Result<Either<T, SyntaxError>>[] = [];
    let stop = getParser(stopAt).parse(input);
    let next = getParser(parser).parse(input);
    while (
      input.src.length >= next.current &&
      next.value.isLeft() &&
      stop.value.isRight()
    ) {
      res.push(next);
      stop = getParser(stopAt).parse(next);
      next = getParser(parser).parse(next);
    }
    if (res.length > 0) {
      const value = Either.collectLeft(res.map((r) => r.value));
      const { start } = res[0].span;
      const { end } = res.at(-1)!.span;
      return input.toResult(value, start, end);
    }

    if (stop.value.isLeft() && next.value.isLeft()) {
      return input.toSuccess([], 0);
    }

    return input.toFailure('Unexpected end of input');
  });
}

export function recoverable<T>(
  main: AllParser<T>,
  continueAt: AllParser<unknown>,
  message: string
): Parser<Either<T, string>> {
  return makeParser((input) => {
    return oneOf(
      getParser(main).map(Left),
      takeUntil(any, continueAt).map((v) => Right(v.join('')))
    )
      .map((val, span) =>
        val.mapRight((r) => {
          input.addError(PError.new(span, message));
          return r;
        })
      )
      .parse(input);
  });
}
