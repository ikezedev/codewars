import { Either, None, Some } from '../adt/common.ts';
import { Pair, Triple } from './helpers.ts';
import {
  Parser,
  makeParser,
  Result,
  ParserError,
  Source,
  AllParser,
  getParser,
} from './mod.ts';

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
    let next = input;
    while (input.src.length > next.start) {
      const result = getParser(p).parse(next);
      if (result.value.isRight()) {
        break;
      }
      res.push(result);
      next = result;
    }
    if (res.length > 0) {
      return res.at(-1)!.map(() => Either.collectLeft(res.map((r) => r.value)));
    } else {
      const err = ParserError(
        'expected to match one or more variant but got none'
      );
      return input.toFailure(err);
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
    (ps: Array<AllParser<T>>) =>
    (input: Source): Result<Either<T, SyntaxError>> => {
      if (!ps.length) {
        const err = ParserError(`did not match any variant at ${input.start}`);
        return input.toFailure(err);
      }
      const result = getParser(ps[0]).parse(input);
      if (result.value.isLeft()) {
        return result;
      }
      return parse(ps.slice(1))(input);
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

// export function takeUntil<T>(parser: AllParser<T>, stopAt: AllParser<unknown>) {
//   return makeParser((input): Result<T[]> => {
//     const res: Result<T>[] = [];
//     try {
//       let trial = getParser(stopAt).parse(input);
//       let next = getParser(p).parse(input);
//       res.push(next);
//       while (input.src.length > next.start) {
//         next = getParser(p).parse(next);
//         res.push(next);
//       }
//     } catch (error) {
//       if (res.length > 0) {
//         return res.at(-1)!.map((_) => res.map((r) => r.value));
//       }
//       throw error;
//     }
//     return res.at(-1)!.map((_) => res.map((r) => r.value));
//   });
// }

// export function recoverable<T>(main: AllParser<T>, continueAfter: AllParser<string>): Parser<Either<T, string>> {
//   return makeParser((input): Result<Either<T, string>> => {
//     try {
//       return getParser(main).parse(input).map(Left);
//     } catch (_) {
//       return getParser(right).parse(input).map(Right);
//     }
//   });
// }
