import {
  assertEquals,
  assert,
  assertInstanceOf,
} from 'https://deno.land/std@0.206.0/assert/mod.ts';
import { assignRec } from './grammar.ts';
import { Source } from 'lib/parser/mod.ts';
import { oneOrMore } from 'lib/parser/combinators.ts';

Deno.test('assignment', () => {
  const input = `
    let Global = ;
    let age 45;
    let = 30
    let good = 34
    let
    `;
  const source = Source.fromString(input);
  const parsed = oneOrMore(assignRec()).parse(source).context.getErrors();
  console.debug({ parsed });
});
