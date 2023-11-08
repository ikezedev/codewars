import {
  Divide,
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
  NumberExpr,
} from './asts.ts';
import { Triple, second } from 'lib/parser/helpers.ts';
import {
  inOrder,
  oneOf,
  oneOrMore,
  leftAssociative,
  zeroOrMore,
} from 'lib/parser/combinators.ts';

import { Parser } from 'lib/parser/mod.ts';

import {
  digit,
  eatWs,
  letter,
  lit,
  number,
  os,
  ws,
} from 'lib/parser/primitive.ts';

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
    number().map((val) => new NumberExpr(val)),
    assignment,
    fnCall,
    identifier,
    inOrder(lit`-`, factor).map(({ second }) => new Negated(second)),
    inOrder(eatWs(lit`(`), additive, eatWs(lit`)`)).map(second)
  ).chain(eatWs);
}
