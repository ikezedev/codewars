import { assignRec, fnRec, retRec } from './grammar';
import { PError, Source, Span } from '@ikezedev/parser';
import { oneOrMore } from '@ikezedev/parser';

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
  const { context, value, span } = oneOrMore(fnRec()).parse(
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
