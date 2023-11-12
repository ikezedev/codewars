import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { lit, number, os, eatWs, letter, any } from './primitive.ts';
import { Source } from './mod.ts';

Deno.test('lit', () => {
  assertEquals(lit``.parse(Source.fromString('123')).value.unwrapLeft(), '');
  const parsed = lit`123`.parse(Source.fromString('123'));
  assertEquals(parsed.value.unwrapLeft(), '123');
  assertEquals(parsed.current, 3);
  assertEquals(
    lit(`123`).parse(Source.fromString('123')).value.unwrapLeft(),
    '123'
  );
  assertEquals(
    lit('123').parse(Source.fromString('123')).value.unwrapLeft(),
    '123'
  );
  assertEquals(
    lit`123`.parse(new Source('03123', 2)).value.unwrapLeft(),
    '123'
  );
});

Deno.test('whitespace', () => {
  assertEquals(os().parse(Source.fromString('123')).value.unwrapLeft(), '');
  assertEquals(
    eatWs(lit`123`)
      .parse(Source.fromString('123'))
      .value.unwrapLeft(),
    '123'
  );
  assertEquals(
    eatWs(lit`123`)
      .parse(Source.fromString(' 123 '))
      .value.unwrapLeft(),
    '123'
  );
});

Deno.test('letter', () => {
  const res = letter().parse(Source.fromString('az'));
  assertEquals(res.value.unwrapLeft(), 'a');
  assertEquals(res.current, 1);
  assert(letter().parse(Source.fromString('0')).value.isRight());
  assert(letter().parse(Source.fromString('')).value.isRight());
});

Deno.test('number', () => {
  const res = number().parse(Source.fromString('123'));
  assertEquals(res.value.unwrapLeft(), 123);
  assertEquals(res.current, 3);
  const res1 = number().parse(Source.fromString('123.34'));
  assertEquals(res1.value.unwrapLeft(), 123.34);
  assertEquals(res1.current, 6);
  assert(number().parse(Source.fromString('invalid')).value.isRight());
});

Deno.test('any', () => {
  assert(any().parse(Source.fromString('')).value.isRight());
});
