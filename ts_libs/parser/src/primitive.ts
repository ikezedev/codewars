import { Either } from '@ikezedev/ds';
import {
  inOrder,
  oneOf,
  oneOrMore,
  opt,
  surrounded,
  zeroOrMore,
} from './combinators';
import { AllParser, Parser, Result, makeParser } from './mod';

export function regex(expr: RegExp) {
  return makeParser((input) => {
    const expected = input.src.slice(input.current).match(expr)?.[0];
    if (
      !expected ||
      expected !==
        input.src.slice(input.current, input.current + expected.length)
    ) {
      return input.toFailure(`expect to match ${expr} but found ${expected}`);
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
export function int() {
  return inOrder(lit`-`.chain(opt), unsignedInt).map(
    (pair) => pair.first.unwrapOrDefault('') + pair.second
  );
}

export function double() {
  return inOrder(int, lit`.`, unsignedInt).map(
    ({ first, third }) => `${first}.${third}`
  );
}

export function number() {
  return oneOf(double, int).map(parseFloat);
}

export function lit(literal: string | TemplateStringsArray): Parser<string> {
  const literal_ = Array.isArray(literal) ? literal.join('') : literal;
  return makeParser((input) => {
    const expected = input.src.slice(
      input.current,
      input.current + literal_.length
    );
    if (expected === literal_) {
      return input.toSuccess(expected, literal_.length);
    } else {
      return input.toFailure(
        `expected literal "${literal}" but found "${expected}"`
      );
    }
  });
}
export function any(): Parser<string> {
  return makeParser((input) => {
    const expected = input.src.slice(input.current, input.current + 1);
    if (expected === '') {
      return input.toFailure('Unexpected end of input');
    }
    return input.toSuccess(expected, 1);
  });
}

export function not(p: Parser<unknown>): Parser<null> {
  return makeParser((input) => {
    const res = p.parse(input);
    return res.value.match({
      Right: () =>
        input.toSuccess(null, 0) as Result<Either<null, SyntaxError>>,
      Left: () => input.toFailure('Expected not to match variant'),
    });
  });
}

export function ws() {
  return oneOrMore(oneOf(lit` `, lit`\n`, lit`\t`, lit`\r`)).map((res) =>
    res.join('')
  );
}

export function os() {
  return zeroOrMore(oneOf(lit` `, lit`\n`, lit`\t`, lit`\r`)).map((val) =>
    val.join('')
  );
}

export const eatWs = <T>(p: AllParser<T>) => surrounded(os, p, os);

export const trimStart = <T>(p: AllParser<T>) =>
  inOrder(os, p).map((r) => r.second);

export const trimStartWith = <T>(p: AllParser<T>, more: AllParser<unknown>) =>
  inOrder(zeroOrMore(oneOf(more, ws)), p).map((r) => r.second);

export function letter() {
  return regex(/[a-zA-Z]/);
}
export function letters() {
  return regex(/[a-zA-Z]+/);
}
