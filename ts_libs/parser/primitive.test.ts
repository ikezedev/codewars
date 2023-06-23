import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { lit, number, os, eatWs, letter } from './primitive.ts';
import { Source } from './mod.ts';

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
