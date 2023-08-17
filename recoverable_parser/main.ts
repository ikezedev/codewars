import { inOrder, oneOf, recoverable } from '../ts_libs/parser/combinators.ts';
import { any, letters, lit, regex } from '../ts_libs/parser/primitive.ts';

class Expr {}

class Paren extends Expr {
  constructor(public val: Expr) {
    super();
  }
}

class Ident extends Expr {
  constructor(public id: string) {
    super();
  }
}

class ExprError extends Expr {
  constructor(public error: string) {
    super();
  }
}

function ident() {
  return letters().map((s) => new Ident(s));
}

function paren() {
  return inOrder(
    lit`(`,
    recoverable(ident, regex(/\D/)).map((e) =>
      e.mapRight(() => 'expected expression after `(`')
    ),
    recoverable(lit`)`, any).map((e) => e.mapRight(() => 'missing `)`'))
  ).map(({ second, third }) => {
    return second.match({
      Right: (err) =>
        third.match({
          Right: (err1) => ({
            expr: new Paren(new ExprError(err)),
            err: [err, err1],
          }),
          Left: () => ({ expr: new Paren(new ExprError(err)), err: [err] }),
        }),
      Left: (id) =>
        third.match({
          Right: (err) => ({ expr: new Paren(id), err: [err] }),
          Left: () => ({ expr: new Paren(id), err: [] }),
        }),
    });
  });
}

export function expr() {
  return oneOf<{ expr: Expr; err: string[] }>(
    ident().map((id) => ({ expr: id, err: [] })),
    paren
  );
}
