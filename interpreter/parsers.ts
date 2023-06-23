import {
  Divide,
  NumberExpr,
  Assign,
  Id,
  Expr,
  Mult,
  Plus,
  Minus,
  Negated,
  Modulo,
  ICreate,
  FnCall,
  Fn,
} from './asts.ts';
import { Triple, join, second } from './helpers.ts';
import {
  inOrder,
  oneOf,
  oneOrMore,
  leftAssociative,
  surrounded,
  zeroOrMore,
} from './parser.combinators.ts';
import {
  Parser,
  makeParser,
  Source,
  ParserError,
  AllParser,
} from './parser.ts';

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

const digit = regex(/\d/);

const ws = oneOrMore(lit` `).map(() => ` `);

export const os = oneOf(
  oneOrMore(lit` `).map((_) => ``),
  lit``
);

export const eatWs = <T>(p: AllParser<T>) => surrounded(os, p, os).map(second);
export const letter = regex(/[a-zA-Z]/);

const identifierChar = oneOf(lit`_`, digit, letter);
export const identifier = oneOf(lit`_`, letter)
  .and(zeroOrMore(identifierChar))
  .map(({ first, second }) => new Id(`${first}${second.join('')}`));

const operators = {
  '/': Divide,
  '*': Mult,
  '-': Minus,
  '+': Plus,
  '%': Modulo,
} as Record<string, ICreate<Expr>>;

const int = oneOrMore(digit).map(join);

const double = inOrder(int, lit`.`, int).map(
  ({ first, third }) => `${first}.${third}`
);

export const number = oneOf(double, int).map(parseFloat);

const signedNumber = oneOf(
  inOrder(lit`-`, number).map(({ second }) => -second),
  number
).map((val) => new NumberExpr(val));

export function assignment() {
  return inOrder(identifier, eatWs(lit`=`), additive).map(
    ({ first, third }) => new Assign(first, third)
  );
}

const makeOps = (opList: string) =>
  oneOf(...opList.split('').map(lit))
    .map((op) => operators[op])
    .chain(eatWs);

const mapCreate = (t: Triple<Expr, ICreate<Expr>, Expr>) =>
  t.second.create(t.first, t.third);

function multiplicative() {
  return leftAssociative(factor, makeOps('*/%'), mapCreate).chain(eatWs);
}

function additive() {
  return leftAssociative(multiplicative, makeOps('+-'), mapCreate).chain(eatWs);
}

export function fnExpr(): Parser<Fn> {
  return inOrder(lit`fn`, ws, identifier)
    .and(inOrder(ws, zeroOrMore(identifier.chain(eatWs))))
    .and(inOrder(lit`=>`.chain(eatWs), additive))
    .map(
      ({ first, second }) =>
        new Fn(first.first.third, second.second, first.second.second)
    );
}

export function fnCall(): Parser<FnCall> {
  return inOrder(
    identifier,
    inOrder(os, oneOf(identifier, additive)).chain(oneOrMore)
  ).map(
    ({ first, second }) => new FnCall([first, ...second.map((p) => p.second)])
  );
}

export const expression = oneOf(fnExpr, additive);

export function factor(): Parser<Expr> {
  return oneOf<Expr>(
    signedNumber,
    assignment,
    fnCall,
    identifier,
    inOrder(lit`-`, factor).map(({ second }) => new Negated(second)),
    inOrder(eatWs(lit`(`), additive, eatWs(lit`)`)).map(second)
  ).chain(eatWs);
}
