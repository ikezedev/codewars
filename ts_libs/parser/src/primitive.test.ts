import {
  lit,
  number,
  os,
  eatWs,
  letter,
  any,
  trimStartWith,
} from './primitive';
import { Source } from './mod';

function assertEquals<T>(a: T, b: T) {
  return expect(a).toEqual(b);
}

test('lit', () => {
  assertEquals(lit``.parse(Source.fromString('123')).value.unwrapLeft(), '');
  const parsed = lit`123`.parse(Source.fromString('123'));
  assertEquals(parsed.value.unwrapLeft(), '123');
  assertEquals(parsed.span.end, 3);
  assertEquals(
    lit(`123`).parse(Source.fromString('123')).value.unwrapLeft(),
    '123'
  );
  assertEquals(
    lit('123').parse(Source.fromString('123')).value.unwrapLeft(),
    '123'
  );
  assertEquals(
    lit`123`.parse(new Source('03123', 2)).value.unwrapLeft(),
    '123'
  );
});

test('whitespace', () => {
  assertEquals(os().parse(Source.fromString('123')).value.unwrapLeft(), '');
  assertEquals(
    eatWs(lit`123`)
      .parse(Source.fromString('123'))
      .value.unwrapLeft(),
    '123'
  );
  assertEquals(
    eatWs(lit`123`)
      .parse(Source.fromString(' 123 '))
      .value.unwrapLeft(),
    '123'
  );
});

test('letter', () => {
  const res = letter().parse(Source.fromString('az'));
  assertEquals(res.value.unwrapLeft(), 'a');
  assertEquals(res.span.end, 1);
  assert(letter().parse(Source.fromString('0')).value.isRight());
  assert(letter().parse(Source.fromString('')).value.isRight());
});

test('number', () => {
  const res = number().parse(Source.fromString('123'));
  assertEquals(res.value.unwrapLeft(), 123);
  assertEquals(res.span.end, 3);
  const res1 = number().parse(Source.fromString('123.34'));
  assertEquals(res1.value.unwrapLeft(), 123.34);
  assertEquals(res1.span.end, 6);
  assert(number().parse(Source.fromString('invalid')).value.isRight());
});

test('any', () => {
  assert(any().parse(Source.fromString('')).value.isRight());
});

test('trimStartWith', () => {
  const inputs = [
    `
    a
    123
    `,
    `a
    123`,
    ` a123`,
    `a123`,
    `123`,
  ];
  const parser = trimStartWith(number, letter);

  for (const input of inputs) {
    const { value } = parser.parse(Source.fromString(input));
    expect(value.unwrapLeft()).toBe(123);
  }
});
