import {
  assertEquals,
  assert,
  assertInstanceOf,
} from 'https://deno.land/std@0.206.0/assert/mod.ts';
import { docComment, tinyGrammar } from './grammar.ts';
import { Source, Span } from 'lib/parser/mod.ts';
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
  Fn,
  UseStatement,
  TextInDocComment,
  CodeInDocComment,
} from './ast.ts';

Deno.test('Grammar test -> use statmements', () => {
  const input = `
    use utils::sub;
    use utils::{mult, div};`;
  const parsed = tinyGrammar.parse(Source.fromString(input)).value.unwrapLeft();
  assertEquals(parsed, [
    new UseStatement(
      new Id('utils', Span.new(9, 14)),
      [new Id('sub', Span.new(16, 19))],
      Span.new(5, 19)
    ),
    new UseStatement(
      new Id('utils', Span.new(29, 34)),
      [new Id('mult', Span.new(37, 41)), new Id('div', Span.new(43, 46))],
      Span.new(25, 47)
    ),
  ]);
});

Deno.test('Grammar test -> global assignments ', () => {
  const input = `
    let Global = 100;
    let another = 30`;
  const parsed = tinyGrammar.parse(Source.fromString(input)).value.unwrapLeft();
  assertEquals(parsed, [
    new Assignment(
      new Id('Global', Span.new(9, 15)),
      new NumberExpr(100, Span.new(18, 21)),
      Span.new(5, 21),
      true
    ),
    new Assignment(
      new Id('another', Span.new(31, 38)),
      new NumberExpr(30, Span.new(41, 43)),
      Span.new(27, 43),
      true
    ),
  ]);
});

Deno.test('Grammar test -> simple fns', () => {
  const input = 'fn add first second => first + second;';
  const parsed = tinyGrammar
    .parse(Source.fromString(input))
    .value.unwrapLeft()[0] as Fn;
  assertEquals(parsed.name, new Id('add', Span.new(3, 6)));
  assertEquals(parsed.args, [
    new Arg('first', 0, Span.new(7, 12)),
    new Arg('second', 1, Span.new(13, 19)),
  ]);
  assertEquals(parsed.body, [
    new ExprStatement(
      new Plus(
        new Id('first', Span.new(23, 28)),
        new Id('second', Span.new(31, 37)),
        Span.new(23, 37)
      ),
      Span.new(22, 37)
    ),
  ]);
  assert(!parsed.isPublic);
});

Deno.test('Grammar test -> fn curly braces', () => {
  const input = `
    pub fn test a b => {
      let var = 2 + 3;
      return add(var * 3, 4);
    }`;
  const parsed = tinyGrammar
    .parse(Source.fromString(input))
    .value.unwrapLeft()[0] as Fn;

  assertEquals(parsed.name, new Id('test', Span.new(12, 16)));
  assertEquals(parsed.args, [
    new Arg('a', 0, Span.new(17, 18)),
    new Arg('b', 1, Span.new(19, 20)),
  ]);
  assertEquals(parsed.body, [
    new Assignment(
      new Id('var', Span.new(36, 39)),
      new Plus(
        new NumberExpr(2, Span.new(42, 43)),
        new NumberExpr(3, Span.new(46, 47)),
        Span.new(42, 47)
      ),
      Span.new(32, 47)
    ),
    new Return(
      new FnCall(
        new Id('add', Span.new(62, 65)),
        [
          new Mult(
            new Id('var', Span.new(66, 69)),
            new NumberExpr(3, Span.new(72, 73)),
            Span.new(66, 73)
          ),
          new NumberExpr(4, Span.new(75, 76)),
        ],
        Span.new(62, 77)
      ),
      Span.new(55, 78)
    ),
  ]);
  assert(parsed.isPublic);
});

Deno.test('Grammar test -> fn curly braces - opt semi-colon', () => {
  const input = `
    pub fn test a b => {
      let var = 2 + 3
      return add(var * 3, 4)
    }`;
  const parsed = tinyGrammar
    .parse(Source.fromString(input))
    .value.unwrapLeft()[0] as Fn;
  assertEquals(parsed.name, new Id('test', Span.new(12, 16)));
  assertEquals(parsed.args, [
    new Arg('a', 0, Span.new(17, 18)),
    new Arg('b', 1, Span.new(19, 20)),
  ]);
  assertEquals(parsed.body, [
    new Assignment(
      new Id('var', Span.new(36, 39)),
      new Plus(
        new NumberExpr(2, Span.new(42, 43)),
        new NumberExpr(3, Span.new(46, 47)),
        Span.new(42, 47)
      ),
      Span.new(32, 47)
    ),
    new Return(
      new FnCall(
        new Id('add', Span.new(61, 64)),
        [
          new Mult(
            new Id('var', Span.new(65, 68)),
            new NumberExpr(3, Span.new(71, 72)),
            Span.new(65, 72)
          ),
          new NumberExpr(4, Span.new(74, 75)),
        ],
        Span.new(61, 76)
      ),
      Span.new(54, 76)
    ),
  ]);
  assert(parsed.isPublic);
});

Deno.test('Doc comments', () => {
  const input = `
  /// Test function
  /// Takes a and b
  /// Returns 15 + 4
  /// \`\`\`ty
  /// let test = sub(2, 1); // simple comment
  /// assert_eq(test, 1);
  /// \`\`\`
  fun
  `;

  const { value, span } = docComment().parse(Source.fromString(input));

  assertEquals(span, Span.new(0, 155));
  const comments = value.unwrapLeft().comments;

  assertEquals(
    comments[0],
    new TextInDocComment(['Test function'], Span.new(3, 20))
  );
  assertEquals(
    comments[1],
    new TextInDocComment(['Takes a and b'], Span.new(23, 40))
  );
  assertEquals(
    comments[2],
    new TextInDocComment(['Returns 15 + 4'], Span.new(43, 61))
  );

  const code = comments[3] as CodeInDocComment;
  assertEquals(code.span, Span.new(61, 155));
  assertEquals(code.lang.unwrap(), new Id('ty', Span.new(71, 73)));
  const statements = code.statements;

  assertEquals(
    statements[0],
    new Assignment(
      new Id('test', new Span(84, 88)),
      new FnCall(
        new Id('sub', new Span(91, 94)),
        [
          new NumberExpr(2, new Span(95, 96)),
          new NumberExpr(1, new Span(98, 99)),
        ],
        new Span(91, 100)
      ),
      new Span(80, 100),
      true
    )
  );

  assertEquals(
    statements[1],
    new ExprStatement(
      new FnCall(
        new Id('assert_eq', new Span(126, 135)),
        [
          new Id('test', Span.new(136, 140)),
          new NumberExpr(1, Span.new(142, 143)),
        ],
        new Span(126, 144)
      ),
      new Span(126, 144)
    )
  );
});

Deno.test('Function with doc comment', () => {
  const input = `
  /// Test function
  /// Takes a and b
  /// Returns 15 + 4
  /// \`\`\`ty
  /// let test = sub(2, 1); // simple comment
  /// assert_eq(test, 1);
  /// \`\`\`
  pub fn test a b => {
    let var = a + b;
    return add(var * 3, 4); // line comment
  }
  `;

  const { value, span } = tinyGrammar.parse(Source.fromString(input));
  const fn = value.unwrapLeft()[0] as Fn;
  assertEquals(fn.name.name, 'test');
  assertEquals(
    fn.args.map((a) => a.name),
    ['a', 'b']
  );
  assertInstanceOf(fn.body[0], Assignment);
  assertInstanceOf(fn.body[1], Return);
  assert(fn.documentation.isSome());
  assertEquals(span, Span.new(0, 247));
});
