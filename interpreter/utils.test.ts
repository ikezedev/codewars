import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { range, chunk } from './utils.ts';

Deno.test('range', () => {
  assertEquals([...range(1, 5)], [1, 2, 3, 4, 5]);
  assertEquals([...range(1, -5)], [1, 0, -1, -2, -3, -4, -5]);
  assertEquals([...range(1, 5, 2)], [1, 3, 5]);
  assertEquals([...range(1, -5, 2)], [1, -1, -3, -5]);
  assertEquals([...range(1, 5, 6)], [1]);
});

Deno.test('chunk', () => {
  assertEquals(
    [...chunk([1, 2, 3, 4, 5], 3)],
    [
      [1, 2, 3],
      [4, 5],
    ]
  );
});
