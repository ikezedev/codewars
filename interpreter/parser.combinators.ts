import { Pair, Triple } from './helpers.ts';
import {
  Parser,
  makeParser,
  Result,
  ParserError,
  Source,
  AllParser,
  getParser,
} from './parser.ts';

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
      const res1 = getParser(p1).parse(input);
      return getParser(p2)
        .parse(res1)
        .map((val) => new Pair(res1.value, val));
    });
  }
  return makeParser((input) => {
    const res1 = getParser(p1).parse(input);
    const res2 = getParser(p2).parse(res1);
    return getParser(p3)
      .parse(res2)
      .map((val) => new Triple(res1.value, res2.value, val));
  });
}

export function oneOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return makeParser((input) => {
    const res: Result<T>[] = [];
    try {
      let next = getParser(p).parse(input);
      res.push(next);
      while (input.src.length > next.start) {
        next = getParser(p).parse(next);
        res.push(next);
      }
    } catch (error) {
      if (res.length > 0) {
        return res.at(-1)!.map((_) => res.map((r) => r.value));
      }
      throw error;
    }
    return res.at(-1)!.map((_) => res.map((r) => r.value));
  });
}

export function zeroOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return makeParser((input) => {
    try {
      return oneOrMore(p).parse(input);
    } catch (_) {
      return input.toResult([], 0);
    }
  });
}

export function oneOf<T>(...ps: Array<AllParser<T>>): Parser<T> {
  const parse =
    (ps: Array<AllParser<T>>) =>
    (input: Source): Result<T> => {
      if (!ps.length) {
        throw ParserError(`did not match any variant at ${input.start}`);
      }
      try {
        return getParser(ps[0]).parse(input);
      } catch (_) {
        return parse(ps.slice(1))(input);
      }
    };
  return makeParser(parse(ps));
}

export function separated<T, S>(parser: AllParser<T>, separator: AllParser<S>) {
  return inOrder(parser, zeroOrMore(inOrder(separator, parser)));
}

export function leftAssociative<T, S>(
  parser: AllParser<T>,
  separator: AllParser<S>,
  transform: (entry: Triple<T, S, T>) => T
) {
  return separated(parser, separator).map(({ first, second: rest }) =>
    rest.reduce(
      (acc, next) => transform(new Triple(acc, next.first, next.second)),
      first
    )
  );
}

export function rightAssociative<T, S>(
  parser: AllParser<T>,
  separator: AllParser<S>,
  transform: (entry: Triple<T, S, T>) => T
) {
  return inOrder(zeroOrMore(inOrder(parser, separator)), parser).map(
    ({ first: rest, second: last }) =>
      rest.reduceRight(
        (acc, next) => transform(new Triple(acc, next.second, next.first)),
        last
      )
  );
}

export function surrounded<T, S>(
  opening: AllParser<S>,
  parser: AllParser<T>,
  closing: AllParser<S>
): Parser<Triple<S, T, S>> {
  return inOrder(opening, parser, closing);
}
