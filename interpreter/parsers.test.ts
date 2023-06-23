import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import {
  lit,
  number,
  factor,
  os,
  eatWs,
  expression,
  fnExpr,
  fnCall,
  letter,
} from './parsers.ts';
import { Source } from './parser.ts';
import { Plus, NumberExpr, Mult } from './asts.ts';
import { oneOrMore } from './parser.combinators.ts';

Deno.test('lit', () => {
  assertEquals(lit``.parse(Source.fromString('123')).value, '');
  assertEquals(lit`123`.parse(Source.fromString('123')).value, '123');
  assertEquals(lit(`123`).parse(Source.fromString('123')).value, '123');
  assertEquals(lit('123').parse(Source.fromString('123')).value, '123');
  assertEquals(lit`123`.parse(new Source('03123', 2)).value, '123');
});

Deno.test('whitespace', () => {
  assertEquals(os.parse(Source.fromString('123')).value, '');
  assertEquals(eatWs(lit`123`).parse(Source.fromString('123')).value, '123');
  assertEquals(eatWs(lit`123`).parse(Source.fromString(' 123 ')).value, '123');
});

Deno.test('letter', () => {
  const res = letter.parse(Source.fromString('az'));
  assertEquals(res.value, 'a');
  assertEquals(res.start, 1);
  assertThrows(() => letter.parse(Source.fromString('0')));
  assertThrows(() => letter.parse(Source.fromString('')));
  const res1 = oneOrMore(letter).parse(Source.fromString('az'));
  assertEquals(res1.value, ['a', 'z']);
  assertEquals(res1.start, 2);
});

Deno.test('number', () => {
  const res = number.parse(Source.fromString('123'));
  assertEquals(res.value, 123);
  assertEquals(res.start, 3);
  const res1 = number.parse(Source.fromString('123.34'));
  assertEquals(res1.value, 123.34);
  assertEquals(res1.start, 6);
  assertThrows(() => {
    number.parse(Source.fromString('invalid'));
  });
});

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
