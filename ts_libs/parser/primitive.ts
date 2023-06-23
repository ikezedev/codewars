import { inOrder, oneOf, oneOrMore, opt, surrounded } from './combinators.ts';
import { second } from './helpers.ts';
import { AllParser, Parser, ParserError, Source, makeParser } from './mod.ts';

export const digit = regex(/\d/);
export const int = inOrder(opt(lit`-`), oneOrMore(digit)).map((pair) =>
  pair.first.match({
    Some: (sign) => sign + pair.second.join(''),
    None: () => pair.second.join(''),
  })
);

export const double = inOrder(int, lit`.`, oneOrMore(digit)).map(
  ({ first, third }) => `${first}.${third.join('')}`
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
      return input.toResult(expected, literal_.length);
    } else {
      throw ParserError(`expect literal ${literal} but found ${expected}`);
    }
  });
}

export function regex(expr: RegExp) {
  return makeParser((input) => {
    const expected = input.src.slice(input.start).match(expr)?.[0];
    if (
      !expected ||
      expected !== input.src.slice(input.start, input.start + expected.length)
    ) {
      throw ParserError(`expect to match ${expr} but found ${expected}`);
    }
    return input.toResult(expected, expected.length);
  });
}

export const ws = oneOrMore(lit` `).map(() => ` `);

export const os = oneOf(
  oneOrMore(lit` `).map((_) => ``),
  lit``
);

export const eatWs = <T>(p: AllParser<T>) => surrounded(os, p, os).map(second);
export const letter = regex(/[a-zA-Z]/);
