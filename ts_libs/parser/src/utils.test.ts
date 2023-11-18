import { range, chunk } from './utils';

function assertEquals<T>(a: T, b: T) {
  return expect(a).toEqual(b);
}

test('range', () => {
  assertEquals([...range(1, 5)], [1, 2, 3, 4, 5]);
  assertEquals([...range(1, -5)], [1, 0, -1, -2, -3, -4, -5]);
  assertEquals([...range(1, 5, 2)], [1, 3, 5]);
  assertEquals([...range(1, -5, 2)], [1, -1, -3, -5]);
  assertEquals([...range(1, 5, 6)], [1]);
});

test('chunk', () => {
  assertEquals(
    [...chunk([1, 2, 3, 4, 5], 3)],
    [
      [1, 2, 3],
      [4, 5],
    ]
  );
});
