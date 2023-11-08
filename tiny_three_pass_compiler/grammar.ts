import { eatWs, letters, lit, number, ws } from 'lib/parser/primitive.ts';
import {
  leftAssociative,
  oneOf,
  opt,
  separated,
  surrounded,
} from 'lib/parser/combinators.ts';
import {
  Divide,
  Expr,
  FnExpr,
  Id,
  Minus,
  Mult,
  NumberExpr,
  Plus,
} from './ast.ts';
import { Parser } from 'lib/parser/mod.ts';
import { second } from 'lib/parser/helpers.ts';

const id = letters().map((a) => new Id(a));
const argList = separated(id, ws)
  .map(({ first, second }) =>
    [first, ...second.map((p) => p.second)].map((e, i) => e.toArg(i))
  )
  .chain(opt)
  .map((op) => op.unwrapOrDefault([]));

function factor() {
  return oneOf<Expr>(
    number().map((n) => new NumberExpr(n)),
    id,
    surrounded(eatWs(lit`(`), expression, eatWs(lit`)`)).map(second)
  );
}

function expression(): Parser<Expr> {
  return leftAssociative(
    term,
    oneOf(lit`+`, lit`-`).chain(eatWs),
    ({ first, second: op, third }) => {
      if (op === '+') return new Plus(first, third);
      return new Minus(first, third);
    }
  ).chain(eatWs);
}

function fnExpr() {
  return surrounded(eatWs(lit`[`), argList, eatWs(lit`]`))
    .and(expression)
    .map((p) => new FnExpr(p.first.second, p.second));
}

function term(): Parser<Expr> {
  return leftAssociative(
    factor,
    oneOf(lit`*`, lit`/`).chain(eatWs),
    ({ first, second: op, third }) => {
      if (op === '*') return new Mult(first, third);
      return new Divide(first, third);
    }
  );
}

export const grammar = fnExpr();
