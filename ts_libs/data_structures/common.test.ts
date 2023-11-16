import { Left, None, Option, Right, Some } from './common';

function assertEquals<T>(a: T, b: T) {
  return expect(a).toEqual(b);
}

test('Option<T> Some', () => {
  const num = Some(1).unwrapOrDefault(0);
  assertEquals(num, 1);
  const hey = Some('hey')
    .map((a) => a + ' world')
    .unwrapOrDefault('');
  assertEquals(hey, 'hey world');
});

test('Option<T> None', () => {
  const none: Option<number> = None;
  const num = none.unwrapOr(() => 0);
  assertEquals(num, 0);
  const none1: Option<string> = None;
  const str = none1.map((a) => a + ' world').unwrapOrDefault('');
  assertEquals(str, '');
});

test('Either<L, R> Left', () => {
  const num = Left(1).unwrapLeftOrDefault(0);
  assertEquals(num, 1);
  const hey = Left('hey')
    .mapLeft((a) => a + ' world')
    .unwrapLeftOrDefault('');
  assertEquals(hey, 'hey world');
});

test('Either<L, R> Right', () => {
  const num = Right(1).unwrapRightOrDefault(0);
  assertEquals(num, 1);
  const hey = Right('hey')
    .mapRight((a) => a + ' world')
    .unwrapRightOrDefault('');
  assertEquals(hey, 'hey world');
});
