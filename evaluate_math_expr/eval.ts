import { number, eatWs, lit } from 'lib/parser/primitive.ts';
import {
  inOrder,
  leftAssociative,
  oneOf,
  surrounded,
} from 'lib/parser/combinators.ts';
import { Parser, Source } from 'lib/parser/mod.ts';

function factor(): Parser<number> {
  return oneOf(
    number,
    inOrder(lit`-`, expr).map((p) => -p.second),
    surrounded(eatWs(lit`(`), expr, eatWs(lit`)`)).map((p) => p.second)
  );
}

function mult() {
  return leftAssociative(
    factor,
    eatWs(oneOf(lit`/`, lit`*`)),
    ({ first, second: op, third }) =>
      op === '*' ? first * third : first / third
  );
}

function expr() {
  return leftAssociative(
    mult,
    eatWs(oneOf(lit`+`, lit`-`)),
    ({ first, second: op, third }) =>
      op === '+' ? first + third : first - third
  );
}

export function calc(expression: string): number {
  return expr().parse(Source.fromString(expression)).value.unwrapLeft();
}
