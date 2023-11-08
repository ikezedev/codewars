import {
  assertEquals,
  assert,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { tinyGrammar } from './grammar.ts';
import { Source } from 'lib/parser/mod.ts';
import {
  Plus,
  Arg,
  ExprStatement,
  Id,
  Assignment,
  NumberExpr,
  Return,
  FnCall,
  Mult,
} from './ast.ts';

// Deno.test('Grammar test -> parsing', () => {
//   const input = '[ x y z ] ( 2*3*x + 5*y - 3*z ) / (1 + 3 + 2*2)';
//   const parsed = grammar.parse(Source.fromString(input)).value.unwrapLeft();
//   assertEquals(parsed.args.length, 3);
//   const body = parsed.body;
//   assert(body instanceof Divide);
//   assert(body.left instanceof Minus);
//   assert(body.right instanceof Plus);
// });

Deno.test('Grammar test -> ids', () => {
  const input = 'fn add first second => first + second;';
  const parsed = tinyGrammar.parse(Source.fromString(input)).value.unwrapLeft();
  assertEquals(parsed.name, new Id('add'));
  assertEquals(parsed.args, [new Arg('first', 0), new Arg('second', 1)]);
  assertEquals(parsed.body, [
    new ExprStatement(new Plus(new Id('first'), new Id('second'))),
  ]);
  assert(!parsed.isPublic);
});

Deno.test('Grammar test -> curly braces', () => {
  const input = `
    pub fn test a b => {
      let var = 2 + 3;
      return add(var * 3, 4);
    }`;
  const parsed = tinyGrammar.parse(Source.fromString(input)).value.unwrapLeft();

  assertEquals(parsed.name, new Id('test'));
  assertEquals(parsed.args, [new Arg('a', 0), new Arg('b', 1)]);
  assertEquals(parsed.body, [
    new Assignment(
      new Id('var'),
      new Plus(new NumberExpr(2), new NumberExpr(3))
    ),
    new Return(
      new FnCall(new Id('add'), [
        new Mult(new Id('var'), new NumberExpr(3)),
        new NumberExpr(4),
      ])
    ),
  ]);
  assert(parsed.isPublic);
});

Deno.test('Grammar test -> curly braces - opt semi-colon', () => {
  const input = `
    pub fn test a b => {
      let var = 2 + 3
      return add(var * 3, 4)
    }`;
  const parsed = tinyGrammar.parse(Source.fromString(input)).value.unwrapLeft();
  assertEquals(parsed.name, new Id('test'));
  assertEquals(parsed.args, [new Arg('a', 0), new Arg('b', 1)]);
  assertEquals(parsed.body, [
    new Assignment(
      new Id('var'),
      new Plus(new NumberExpr(2), new NumberExpr(3))
    ),
    new Return(
      new FnCall(new Id('add'), [
        new Mult(new Id('var'), new NumberExpr(3)),
        new NumberExpr(4),
      ])
    ),
  ]);
  assert(parsed.isPublic);
});
