import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { lit } from './primitive.ts';
import { Source } from './mod.ts';
import { inOrder, oneOf, oneOrMore } from './combinators.ts';

Deno.test('inOrder', () => {
  const value1 = inOrder(lit`123`, lit`456`).parse(
    Source.fromString('123456')
  ).value;
  assertEquals(value1.first, '123');
  assertEquals(value1.second, '456');

  const value2 = inOrder(lit`123`, lit`456`, lit`7`).parse(
    Source.fromString('1234567')
  ).value;
  assertEquals(value2.first, '123');
  assertEquals(value2.second, '456');
  assertEquals(value2.third, '7');
});

Deno.test('oneOf', () => {
  const value = oneOf(lit`123`, lit`456`).parse(Source.fromString('456')).value;
  assertEquals(value, '456');
  const value1 = oneOf(lit`456`, lit`123`).parse(
    Source.fromString('456')
  ).value;
  assertEquals(value1, '456');
  assertThrows(() => {
    oneOf(lit`456`, lit`123`).parse(Source.fromString('457'));
  });
});

Deno.test('oneOrMore', () => {
  const value = oneOrMore(lit`123`).parse(Source.fromString('123123456')).value;
  assertEquals(value, ['123', '123']);
  assertThrows(() => {
    oneOrMore(lit`123`).parse(Source.fromString('456'));
  });
});
