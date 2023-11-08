import { eatWs, letters, lit, number, os, ws } from 'lib/parser/primitive.ts';
import {
  inOrder,
  leftAssociative,
  oneOf,
  oneOrMore,
  opt,
  separated,
  surrounded,
} from 'lib/parser/combinators.ts';
import {
  Assignment,
  Divide,
  Expr,
  ExprStatement,
  Fn,
  FnCall,
  FnExpr,
  Id,
  Minus,
  Mult,
  NumberExpr,
  Plus,
  Return,
  Statement,
} from './ast.ts';
import { Parser } from 'lib/parser/mod.ts';

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
    fnCall,
    id,
    surrounded(eatWs(lit`(`), expression, eatWs(lit`)`))
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
    .map((p) => new FnExpr(p.first, p.second));
}

function assign() {
  return inOrder(lit`let`, ws, id)
    .and(inOrder(os, lit`=`, expression))
    .and(opt(lit`;`))
    .map(
      ({ first: { first, second } }) =>
        new Assignment(first.third, second.third)
    )
    .chain(eatWs);
}

function ret() {
  return inOrder(lit`return`, ws, expression)
    .and(opt(lit`;`))
    .map(({ first: { third } }) => new Return(third))
    .chain(eatWs);
}

function functionBody() {
  return oneOrMore<Statement>(oneOf(assign, ret));
}

export function testTerm() {
  return surrounded(eatWs(lit`{`), functionBody(), eatWs(lit`}`));
}

function fn() {
  return inOrder(opt(lit`pub`.and(ws)), lit`fn`.and(ws), id)
    .and(inOrder(argList.chain(eatWs), lit`=>`))
    .and(
      oneOf<Statement[]>(
        expression().map((x) => [new ExprStatement(x)]),
        surrounded(eatWs(lit`{`), functionBody(), eatWs(lit`}`))
      )
    )
    .map(
      ({ first: { first, second }, second: third }) =>
        new Fn(first.third, second.first, third, first.first.isSome())
    )
    .chain(eatWs);
}

function fnCall() {
  return inOrder(
    id,
    surrounded(
      eatWs(lit`(`),
      separated(expression, eatWs(lit`,`)),
      eatWs(lit`)`)
    )
  ).map(
    ({ first, second }) =>
      new FnCall(first, [second.first, ...second.second.map((s) => s.second)])
  );
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
export const tinyGrammar = fn();
