import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { calc } from './eval.ts';

const tests: [string, number][] = [
  ['1+1', 2],
  ['1 - 1', 0],
  ['1* 1', 1],
  ['1 /1', 1],
  ['-123', -123],
  ['123', 123],
  ['2 /2+3 * 4.75- -6', 21.25],
  ['12* 123', 1476],
  ['2 / (2 + 3) * 4.33 - -6', 7.732],
  ['12* 123/-(-5 + 2)', 492],
];

Deno.test('calc', function () {
  tests.forEach(function (m) {
    const x = calc(m[0]);
    const y = m[1];
    assertEquals(x, y, 'Expected: "' + m[0] + '" to be ' + y + ' but got ' + x);
  });
});
