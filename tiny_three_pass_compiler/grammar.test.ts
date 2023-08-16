import {
  assertEquals,
  assert,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { grammar } from './grammar.ts';
import { Source } from 'lib/parser/mod.ts';
import { Divide, Minus, Plus } from './ast.ts';

Deno.test('Grammar test -> parsing', () => {
  const input = '[ x y z ] ( 2*3*x + 5*y - 3*z ) / (1 + 3 + 2*2)';
  const parsed = grammar.parse(Source.fromString(input)).value.unwrapLeft();
  assertEquals(parsed.args.length, 3);
  const body = parsed.body;
  assert(body instanceof Divide);
  assert(body.left instanceof Minus);
  assert(body.right instanceof Plus);
});

Deno.test('Grammar test -> prepare', () => {
  const input = '[ x y z ] ( 2*3*x + 5*y - 3*z ) / (1 + 3 + 2*2)';
  const parsed = grammar.parse(Source.fromString(input)).value.unwrapLeft();
  const prepared = parsed.idsToArgs();
  assert(prepared.body instanceof Divide);
});
