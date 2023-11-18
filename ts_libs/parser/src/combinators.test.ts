import { any, lit, number } from './primitive';
import { Source, Span } from './mod';
import {
  inOrder,
  leftAssociative,
  oneOf,
  oneOrMore,
  opt,
  recoverable,
  rightAssociative,
  separated,
  surrounded,
  takeUntil,
  zeroOrMore,
} from './combinators';
import { Some } from '@ikezedev/ds';

function assertEquals<T>(a: T, b: T) {
  return expect(a).toEqual(b);
}

test('inOrder', () => {
  const { value, span } = inOrder(lit`123`, lit`456`).parse(
    Source.fromString('123456')
  );
  const value1 = value.unwrapLeft();
  assertEquals(span.start, 0);
  assertEquals(span.end, 6);
  assertEquals(value1.first, '123');
  assertEquals(value1.second, '456');

  const { value: vl, span: sp } = inOrder(lit`123`, lit`456`, lit`7`).parse(
    Source.fromString('1234567')
  );

  const value2 = vl.unwrapLeft();
  assertEquals(sp.start, 0);
  assertEquals(sp.end, 7);
  assertEquals(value2.first, '123');
  assertEquals(value2.second, '456');
  assertEquals(value2.third, '7');

  const { value: _, span: spError } = inOrder(lit`123`, lit`456`, lit`7`).parse(
    Source.fromString('4567')
  );

  assertEquals(spError.start, 0);
  assertEquals(spError.end, 0);
});

test('oneOf', () => {
  const parsed = oneOf(lit`123`, lit`456`).parse(Source.fromString('456'));
  const value = parsed.value.unwrapLeft();
  assertEquals(value, '456');
  assertEquals(parsed.span, Span.new(0, 3));
  const parsed1 = oneOf(lit`456`, lit`123`).parse(Source.fromString('456'));
  const value1 = parsed1.value.unwrapLeft();
  assertEquals(value1, '456');
  assertEquals(parsed1.span, Span.new(0, 3));
  assert(
    oneOf(lit`456`, lit`123`)
      .parse(Source.fromString('457'))
      .value.isRight()
  );
});

test('oneOrMore', () => {
  const { value, span } = oneOrMore(lit`123`).parse(
    Source.fromString('123123456')
  );

  assertEquals(value.unwrapLeft(), ['123', '123']);
  assertEquals(span, Span.new(0, 6));
  assert(
    oneOrMore(lit`123`)
      .parse(Source.fromString('456'))
      .value.isRight()
  );

  const { span: sp1, value: vl1 } = oneOrMore(oneOf(lit`,`, lit`;`)).parse(
    Source.fromString(',;')
  );
  assertEquals(sp1, Span.new(0, 2));
  assertEquals(vl1.unwrapLeft(), [',', ';']);
});

test('zeroOrMore', () => {
  const { value, span } = zeroOrMore(lit`123`).parse(
    Source.fromString('123123456')
  );
  assertEquals(value.unwrapLeft(), ['123', '123']);
  assertEquals(span, Span.new(0, 6));
  assertEquals(
    zeroOrMore(lit`123`)
      .parse(Source.fromString('456'))
      .value.unwrapLeft(),
    []
  );
});

test('separated', () => {
  const { value: v, span } = separated(number, oneOf(lit`,`, lit`;`)).parse(
    Source.fromString('123,123;456')
  );
  const value = v.unwrapLeft();
  assertEquals(value.first, 123);
  assertEquals(span, Span.new(0, 11));
  assertEquals(
    value.second.map((d) => d.second),
    [123, 456]
  );
});

test('surrounded', () => {
  const { value, span } = surrounded(lit`(`, number, lit`)`).parse(
    Source.fromString('(123)')
  );
  assertEquals(value.unwrapLeft(), 123);
  assertEquals(span, Span.new(0, 5));
});

test('opt', () => {
  const { value, span } = opt(number).parse(Source.fromString('(123)'));
  assert(value.unwrapLeft().isNone());
  assertEquals(span, Span.new(0, 0));

  const { value: value1, span: span1 } = opt(number).parse(
    Source.fromString('123)')
  );
  assert(value1.unwrapLeft().isSome());
  assertEquals(value1.unwrapLeft(), Some(123));
  assertEquals(span1, Span.new(0, 3));
});

test('leftAssociative', () => {
  const left = leftAssociative(
    number,
    oneOf(lit`-`, lit`+`),
    ({ first, second, third }) => {
      if (second === '-') {
        return first - third;
      }
      return first + third;
    }
  );
  const { value, span, current, src } = left.parse(
    Source.fromString('123-100+23')
  );
  assertEquals(current, src.length);
  const res = value.unwrapLeft();
  assertEquals(res, 46);
  assertEquals(span, Span.new(0, 10));
});

test('rightAssociative', () => {
  const right = rightAssociative(
    number,
    oneOf(lit`-`, lit`+`),
    ({ first, second, third }) => {
      if (second === '-') {
        return first - third;
      }
      return first + third;
    }
  );
  const { current, src, value, span } = right.parse(
    Source.fromString('123-100+23')
  );
  assertEquals(current, src.length);
  const res = value.unwrapLeft();
  assertEquals(span, Span.new(0, 10));
  assertEquals(res, 0);
});

test('takeUntil', () => {
  const { current, value, span } = takeUntil(any, lit`{`).parse(
    Source.fromString('123{}')
  );
  assertEquals(current, 3);
  assertEquals(value.unwrapLeft().join(''), '123');
  assertEquals(span, Span.new(0, 3));
});

type Op = { invalid: string } | { valid: string };
type Expr = { a: Expr; b: Expr; op: Op } | number;
const makeExpr = (a: Expr, b: Expr, op: Op) => ({
  a,
  b,
  op,
});

test('recoverable leftAssociative', () => {
  const main = leftAssociative<Expr, Op>(
    number,
    recoverable(oneOf(lit`-`, lit`+`), number, '').map((eith) =>
      eith.match({
        Right: (val) => ({ invalid: val } as Op),
        Left: (val) => ({ valid: val }),
      })
    ),
    ({ first, second, third }) => {
      return makeExpr(first, third, second);
    }
  );
  assert(main.parse(Source.fromString('123/100*23+48/34')).value.isLeft());
});

test('recoverable rightAssociative', () => {
  const main = rightAssociative<Expr, Op>(
    number,
    recoverable(oneOf(lit`-`, lit`+`), number, '').map((eith) =>
      eith.match({
        Right: (val) => ({ invalid: val } as Op),
        Left: (val) => ({ valid: val }),
      })
    ),
    ({ first, second, third }) => {
      return makeExpr(first, third, second);
    }
  );
  assert(main.parse(Source.fromString('123-100*23+48/34')).value.isLeft());
});
