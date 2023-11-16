import { assignRec, fnRec, retRec, tinyGrammar } from './grammar';
import { PError, Source, Span } from '@ikezedev/parser';
import { oneOrMore } from '@ikezedev/parser';
import { FnRec } from './ast';

function assertEquals<T>(a: T, b: T) {
  return expect(a).toEqual(b);
}

test('assignment', () => {
  const input = `
    let Global = ;
    let age 45;
    let = 30
    let good = 34
    let
    `;
  const { context, value, span } = oneOrMore(assignRec()).parse(
    Source.fromString(input)
  );
  assertEquals(context.getErrors(), [
    new PError(new Span(17, 18), 'expected an expression after `=`'),
    new PError(new Span(31, 31), 'expected `=` after variable name '),
    new PError(new Span(43, 43), 'expected a variable name after `let`'),
    new PError(new Span(74, 74), 'expected a variable name after `let`'),
  ]);
  assertEquals(value.unwrapLeft().length, 5);
  assertEquals(span, Span.new(0, 74));
});

test('return', () => {
  const input = `
    return ;
    return 45;
    return 30
    return  
    return
    `;
  const { context, value, span } = oneOrMore(retRec()).parse(
    Source.fromString(input)
  );

  assertEquals(context.getErrors(), [
    new PError(new Span(12, 13), 'expected an expression after `return`'),
    new PError(new Span(55, 55), 'expected an expression after `return`'),
    new PError(new Span(66, 66), 'expected a white space after `return`'),
  ]);
  assertEquals(value.unwrapLeft().length, 5);
  assertEquals(span, Span.new(0, 66));
});

test('functions', () => {
  const input = `
  pub fn test1 a b => {
    let var = a + b;
    return add(var * 3, 4); // line comment
  }
  pub fn  => {
    let var = a + b;
    return add(var * 3, 4); // line comment
  }

  pub fn test3 a b   {
    let var = a + b;
    return add(var * 3, 4); // line comment
  }
  pub fn {
    let var = a + b;
    return add(var * 3, 4); // line comment
  }
  pub fn test5 a b => {
  }
  pub fn test6 a b => {}
  pub fn test7 a b => 
  pub fn test1 a b => {
    let var = a + b;
    return add(var * 3, 4); // line comment
  `;
  const { context, value, span } = oneOrMore(fnRec).parse(
    Source.fromString(input)
  );

  assertEquals(context.getErrors(), [
    new PError(new Span(103, 104), 'expected function name'),
    new PError(
      new Span(197, 200),
      'expected `=>` after function name and arguments'
    ),
    new PError(new Span(280, 280), 'expected function name'),
    new PError(new Span(377, 377), 'expected function body'),
    new PError(new Span(402, 402), 'expected function body'),
    new PError(
      new Span(425, 425),
      'expected an expression or an opening brace `{`'
    ),
    new PError(new Span(515, 515), 'expected a closing brace `}`'),
  ]);
  assertEquals(value.unwrapLeft().length, 8);
  assertEquals(span, Span.new(0, 515));
});

test('big', () => {
  const input = `use utils::sub;
  use utils::{mult, div};
  
  let global = 100;
  
  fn avg a b => div(sub(a, b), 2);
  
  fn add first second => first + second;
  // what happens now
  fn compute x y z => ( 2 * 3 * x + 5 * y - 3 * z ) / (1 + 3 + 2 * 2);
  // and happens now 1
  
  // and happens now 2
  /// Test function
  /// Takes a and b
  /// Returns 15 + 4
  /// \`\`\`
  /// let test = mult(2, 1);
  /// assert_eq(test, 2);
  /// \`\`\`
  /// \`\`\`ty
  /// let test = sub(2, 1); // simple comment
  /// assert_eq(test, 1);
  /// \`\`\`
  pub fn test a b => {
      let var = a + b;
      return add(var * 3, 4); // line comment
  }
  
  fn test a b => {
    // comment inside function body
      let var = 2 + 3
      add(var * 3, 4)
  }`;

  const { context, value, span } = tinyGrammar.parse(Source.fromString(input));

  // console.log(fn.documentation);
  for (const entry of value.unwrapLeft()) {
    console.log(entry);
  }
  console.debug(context.getErrors());
});

test('doc comments ultimate', () => {
  const input = ` 
  // and happens now 2
  /// Test function
  /// Takes a and b
  /// Returns 15 + 4
  /// \`\`\`
  /// let test = mult(2, 1);
  /// assert_eq(test, 2);
  /// \`\`\`
  /// \`\`\`
  /// fn test a b => {
  ///    let var = 2 + 3
  ///    add(var * 3, 4)
  /// }
  /// \`\`\`
  /// \`\`\`ty
  /// let test = sub(2, 1); // simple comment
  /// assert_eq(test, 1);
  /// \`\`\`
  pub fn test a b => {
      let var = a + b;
      return add(var * 3, 4); // line comment
  }
  `;

  const { context, value } = tinyGrammar.parse(Source.fromString(input));

  console.debug(context.getErrors());

  const fn = value.unwrapLeft()[0] as FnRec;
  // console.log(fn.documentation);
  for (const comment of fn.documentation.unwrap().comments) {
    console.log(comment);
  }
});

// todo: make doc comments group text comments
