import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { lit, number } from './primitive.ts';
import { Source } from './mod.ts';
import {
  inOrder,
  leftAssociative,
  oneOf,
  oneOrMore,
  opt,
  rightAssociative,
  separated,
  surrounded,
  zeroOrMore,
} from './combinators.ts';

Deno.test('inOrder', () => {
  const value1 = inOrder(lit`123`, lit`456`)
    .parse(Source.fromString('123456'))
    .value.unwrapLeft();
  assertEquals(value1.first, '123');
  assertEquals(value1.second, '456');

  const value2 = inOrder(lit`123`, lit`456`, lit`7`)
    .parse(Source.fromString('1234567'))
    .value.unwrapLeft();
  assertEquals(value2.first, '123');
  assertEquals(value2.second, '456');
  assertEquals(value2.third, '7');
});

Deno.test('oneOf', () => {
  const parsed = oneOf(lit`123`, lit`456`).parse(Source.fromString('456'));
  const value = parsed.value.unwrapLeft();
  assertEquals(value, '456');
  assertEquals(parsed.start, 3);
  const parsed1 = oneOf(lit`456`, lit`123`).parse(Source.fromString('456'));
  const value1 = parsed1.value.unwrapLeft();
  assertEquals(value1, '456');
  assertEquals(parsed1.start, 3);
  assert(
    oneOf(lit`456`, lit`123`)
      .parse(Source.fromString('457'))
      .value.isRight()
  );
});

Deno.test('oneOrMore', () => {
  const value = oneOrMore(lit`123`)
    .parse(Source.fromString('123123456'))
    .value.unwrapLeft();
  assertEquals(value, ['123', '123']);
  assert(
    oneOrMore(lit`123`)
      .parse(Source.fromString('456'))
      .value.isRight()
  );

  const parsed = oneOrMore(oneOf(lit`,`, lit`;`)).parse(
    Source.fromString(',;')
  );
  assertEquals(parsed.start, parsed.src.length);
  assertEquals(parsed.value.unwrapLeft(), [',', ';']);
});

Deno.test('zeroOrMore', () => {
  const value = zeroOrMore(lit`123`)
    .parse(Source.fromString('123123456'))
    .value.unwrapLeft();
  assertEquals(value, ['123', '123']);
  assertEquals(
    zeroOrMore(lit`123`)
      .parse(Source.fromString('456'))
      .value.unwrapLeft(),
    []
  );
});

Deno.test('separated', () => {
  const res = separated(number, oneOf(lit`,`, lit`;`))
    .parse(Source.fromString('123,123;456'))
    .value.unwrapLeft();
  assertEquals(res.first, 123);
  assertEquals(
    res.second.map((d) => d.second),
    [123, 456]
  );
});

Deno.test('surrounded', () => {
  const res = surrounded(lit`(`, number, lit`)`)
    .parse(Source.fromString('(123)'))
    .value.unwrapLeft();
  assertEquals(res.second, 123);
});

Deno.test('opt', () => {
  const res = opt(number).parse(Source.fromString('(123)')).value.unwrapLeft();
  assert(res.isNone());
});

Deno.test('leftAssociative', () => {
  const left = leftAssociative(
    number,
    oneOf(lit`-`, lit`+`),
    ({ first, second, third }) => {
      if (second === '-') {
        return first - third;
      }
      return first + third;
    }
  );
  const parsed = left.parse(Source.fromString('123-100+23'));
  assertEquals(parsed.start, parsed.src.length);
  const res = parsed.value.unwrapLeft();
  assertEquals(res, 46);
});

Deno.test('rightAssociative', () => {
  const right = rightAssociative(
    number,
    oneOf(lit`-`, lit`+`),
    ({ first, second, third }) => {
      if (second === '-') {
        return first - third;
      }
      return first + third;
    }
  );
  const res = right.parse(Source.fromString('123-100+23')).value.unwrapLeft();
  assertEquals(res, 0);
});
