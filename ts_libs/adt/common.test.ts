import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

import { Left, None, Option, Right, Some } from './common.ts';

Deno.test('Option<T> Some', () => {
  const num = Some(1).unwrapOrDefault(0);
  assertEquals(num, 1);
  const hey = Some('hey')
    .map((a) => a + ' world')
    .unwrapOrDefault('');
  assertEquals(hey, 'hey world');
});

Deno.test('Option<T> None', () => {
  const none: Option<number> = None;
  const num = none.unwrapOr(() => 0);
  assertEquals(num, 0);
  const none1: Option<string> = None;
  const str = none1.map((a) => a + ' world').unwrapOrDefault('');
  assertEquals(str, '');
});

Deno.test('Either<L, R> Left', () => {
  const num = Left(1).unwrapLeftOrDefault(0);
  assertEquals(num, 1);
  const hey = Left('hey')
    .mapLeft((a) => a + ' world')
    .unwrapLeftOrDefault('');
  assertEquals(hey, 'hey world');
});

Deno.test('Either<L, R> Right', () => {
  const num = Right(1).unwrapRightOrDefault(0);
  assertEquals(num, 1);
  const hey = Right('hey')
    .mapRight((a) => a + ' world')
    .unwrapRightOrDefault('');
  assertEquals(hey, 'hey world');
});
