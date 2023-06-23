import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { factor, expression, fnExpr, fnCall } from './parsers.ts';
import { Plus, NumberExpr, Mult } from './asts.ts';
import { Source } from 'lib/parser/mod.ts';

Deno.test('factor', () => {
  const res = factor().parse(Source.fromString('2'));
  assertEquals(res.value, new NumberExpr(2));
  assertEquals(res.start, 1);
});

Deno.test('expression', () => {
  const res = expression.parse(Source.fromString('2+3'));
  assertEquals(res.value, new Plus(new NumberExpr(2), new NumberExpr(3)));
  assertEquals(res.start, 3);

  const res1 = expression.parse(Source.fromString('4+2*3'));
  assertEquals(
    res1.value,
    new Plus(new NumberExpr(4), new Mult(new NumberExpr(2), new NumberExpr(3)))
  );
  assertEquals(
    res1.value.evaluate({ variables: {}, functions: {} }).getOrThrow(),
    10
  );
  assertEquals(res1.start, 5);

  const res2 = expression.parse(Source.fromString('4*2+3'));
  assertEquals(
    res2.value,
    new Plus(new Mult(new NumberExpr(4), new NumberExpr(2)), new NumberExpr(3))
  );
  assertEquals(
    res2.value.evaluate({ variables: {}, functions: {} }).getOrThrow(),
    11
  );
  assertEquals(res2.start, 5);
});

Deno.test({
  name: 'functions expr',
  fn() {
    fnExpr().parse(Source.fromString('fn avg x y => (x + y) / 2'));
  },
});

Deno.test({
  name: 'function call',
  fn() {
    fnCall().parse(Source.fromString('avg 4 2'));
  },
});
