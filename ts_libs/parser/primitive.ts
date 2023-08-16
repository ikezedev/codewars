import {
  inOrder,
  oneOf,
  oneOrMore,
  opt,
  surrounded,
  zeroOrMore,
} from './combinators.ts';
import { second } from './helpers.ts';
import { AllParser, Parser, ParserError, Source, makeParser } from './mod.ts';

export function regex(expr: RegExp) {
  return makeParser((input) => {
    const expected = input.src.slice(input.start).match(expr)?.[0];
    if (
      !expected ||
      expected !== input.src.slice(input.start, input.start + expected.length)
    ) {
      return input.toFailure(
        ParserError(`expect to match ${expr} but found ${expected}`)
      );
    }
    return input.toSuccess(expected, expected.length);
  });
}
export function digit() {
  return regex(/\d/);
}
export function unsignedInt() {
  return regex(/\d+/);
}
export const int = inOrder(lit`-`.chain(opt), unsignedInt).map(
  (pair) => pair.first.unwrapOrDefault('') + pair.second
);

export const double = inOrder(int, lit`.`, unsignedInt).map(
  ({ first, third }) => `${first}.${third}`
);

export const number = oneOf(double, int).map(parseFloat);

export function lit(literal: string | TemplateStringsArray): Parser<string> {
  const literal_ = Array.isArray(literal) ? literal.join('') : literal;
  return makeParser((input: Source) => {
    const expected = input.src.slice(
      input.start,
      input.start + literal_.length
    );
    if (expected === literal_) {
      return input.toSuccess(expected, literal_.length);
    } else {
      return input.toFailure(
        ParserError(`expect literal ${literal} but found ${expected}`)
      );
    }
  });
}

export const ws = oneOrMore(lit` `).map(() => ` `);

export const os = zeroOrMore(lit` `).map((val) => val.join(''));

export const eatWs = <T>(p: AllParser<T>) => surrounded(os, p, os).map(second);
export const letter = regex(/[a-zA-Z]/);
export const letters = regex(/[a-zA-Z]+/);
