function* range(start: number, end: number, by?: number) {
  if (start < end) {
    for (let i = start; i <= end; i += by ?? 1) {
      yield i;
    }
  } else {
    for (let i = start; i >= end; i -= by ?? 1) {
      yield i;
    }
  }
}

function* chunk<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

function inOrder<T, U>(p1: AllParser<T>, p2: AllParser<U>): Parser<Pair<T, U>>;
function inOrder<T, U, V>(
  p1: AllParser<T>,
  p2: AllParser<U>,
  p3: AllParser<V>
): Parser<Triple<T, U, V>>;
function inOrder<T, U, V>(
  p1: AllParser<T>,
  p2: AllParser<U>,
  p3?: AllParser<V>
): Parser<Pair<T, U>> | Parser<Triple<T, U, V>> {
  if (!p3) {
    return makeParser((input) => {
      const res1 = getParser(p1).parse(input);
      return getParser(p2)
        .parse(res1)
        .map((val) => new Pair(res1.value, val));
    });
  }
  return makeParser((input) => {
    const res1 = getParser(p1).parse(input);
    const res2 = getParser(p2).parse(res1);
    return getParser(p3)
      .parse(res2)
      .map((val) => new Triple(res1.value, res2.value, val));
  });
}

function oneOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return makeParser((input) => {
    const res: Result<T>[] = [];
    try {
      let next = getParser(p).parse(input);
      res.push(next);
      while (input.src.length > next.start) {
        next = getParser(p).parse(next);
        res.push(next);
      }
    } catch (error) {
      if (res.length > 0) {
        return res.at(-1)!.map((_) => res.map((r) => r.value));
      }
      throw error;
    }
    return res.at(-1)!.map((_) => res.map((r) => r.value));
  });
}

function zeroOrMore<T>(p: AllParser<T>): Parser<T[]> {
  return makeParser((input) => {
    try {
      return oneOrMore(p).parse(input);
    } catch (_) {
      return input.toResult([], 0);
    }
  });
}

function oneOf<T>(...ps: Array<AllParser<T>>): Parser<T> {
  const parse =
    (ps: Array<AllParser<T>>) =>
    (input: Source): Result<T> => {
      if (!ps.length) {
        throw ParserError(`did not match any variant at ${input.start}`);
      }
      try {
        return getParser(ps[0]).parse(input);
      } catch (_) {
        return parse(ps.slice(1))(input);
      }
    };
  return makeParser(parse(ps));
}

function separated<T, S>(
  parser: AllParser<T>,
  separator: AllParser<S>,
  transform: (entry: Triple<T, S, T>) => T
): Parser<T> {
  return inOrder(parser, zeroOrMore(inOrder(separator, parser))).map(
    ({ first, second: rest }) =>
      rest.reduce(
        (acc, next) => transform(new Triple(acc, next.first, next.second)),
        first
      )
  );
}
function surrounded<T, S>(
  opening: AllParser<S>,
  parser: AllParser<T>,
  closing: AllParser<S>
): Parser<Triple<S, T, S>> {
  return inOrder(opening, parser, closing);
}

interface Map<T> {
  map<V>(fn: (value: T) => V): Map<V>;
}

class Pair<T, U> {
  constructor(public first: T, public second: U) {}
}

class Triple<T, U, V> {
  constructor(public first: T, public second: U, public third: V) {}
}
type ADT<F = unknown, S = unknown, T = unknown> = Pair<F, S> | Triple<F, S, T>;
const second = <S>(ds: ADT<unknown, S>) => ds.second;
type Ctx = Record<string, number>;
const join = (strArr: string[]) => strArr.join('');

class Source {
  constructor(public src: string, public start: number) {}

  toResult<T>(value: T, increment: number): Result<T> {
    return new Result(value, this.src, this.start + increment);
  }

  static fromString(src: string) {
    return new Source(src, 0);
  }
}

class Result<T> extends Source implements Map<T> {
  constructor(public value: T, public src: string, public start: number) {
    super(src, start);
  }
  map<V>(fn: (value: T) => V): Result<V> {
    return new Result(fn(this.value), this.src, this.start);
  }
}

const ParserError = (msg: string) => new SyntaxError(`[ParserError]: ${msg}`);

class Parser<T> implements Map<T> {
  constructor(public parse: (input: Source) => Result<T>) {}

  map<V>(fn: (value: T) => V): Parser<V> {
    return makeParser((input) => this.parse(input).map(fn));
  }

  chain<V>(parserFn: (parser: AllParser<T>) => Parser<V>): Parser<V> {
    return parserFn(this);
  }
}

type AllParser<T> = Parser<T> | (() => Parser<T>);

function getParser<T>(parser: AllParser<T>): Parser<T> {
  if (typeof parser === 'function') return parser();
  return parser;
}

function makeParser<T>(parse: (input: Source) => Result<T>) {
  return new Parser(parse);
}

abstract class Expr {
  abstract evaluate(ctx: Ctx): number;
}

class Assign extends Expr {
  constructor(public id: string, public expr: Expr) {
    super();
  }

  evaluate(ctx: Ctx): number {
    const value = this.expr.evaluate(ctx);
    ctx[this.id] = value;
    return value;
  }
}

class Id extends Expr {
  constructor(public name: string) {
    super();
  }
  evaluate(ctx: Ctx): number {
    if (this.name in ctx) {
      return ctx[this.name];
    } else {
      throw `Runtime error: undefined variable ${this.name}`;
    }
  }
}

class Negated extends Expr {
  constructor(public expr: Expr) {
    super();
  }
  evaluate(ctx: Ctx): number {
    return -this.evaluate(ctx);
  }
}

class NumberExpr extends Expr {
  evaluate(): number {
    return this.value;
  }
  constructor(public value: number) {
    super();
  }
}

function makeCreate<T>(instance: new (left: Expr, right: Expr) => T) {
  return (left: Expr, right: Expr) => new instance(left, right);
}

interface ICreate<T extends Expr> {
  create: ReturnType<typeof makeCreate<T>>;
}

abstract class BinaryOp extends Expr {
  constructor(public left: Expr, public right: Expr) {
    super();
  }
  evaluate(ctx: Ctx): number {
    return this.evalFn(this.left.evaluate(ctx), this.right.evaluate(ctx));
  }
  abstract evalFn(a: number, b: number): number;
}

class Plus extends BinaryOp {
  static create = makeCreate(Plus);
  evalFn(a: number, b: number): number {
    return a + b;
  }
}

class Minus extends BinaryOp {
  static create = makeCreate(Minus);
  evalFn(a: number, b: number): number {
    return a - b;
  }
}

class Mult extends BinaryOp {
  static create = makeCreate(Mult);
  evalFn(a: number, b: number): number {
    return a * b;
  }
}

class Divide extends BinaryOp {
  static create = makeCreate(Divide);
  evalFn(a: number, b: number): number {
    return a / b;
  }
}

class Modulo extends BinaryOp {
  static create = makeCreate(Modulo);
  evalFn(a: number, b: number): number {
    return a % b;
  }
}

function lit(literal: string | TemplateStringsArray): Parser<string> {
  const literal_ = Array.isArray(literal) ? literal.join('') : literal;
  return makeParser((input: Source) => {
    const expected = input.src.slice(
      input.start,
      input.start + literal_.length
    );
    if (expected === literal_) {
      return input.toResult(expected, literal_.length);
    } else {
      throw ParserError(`expect literal ${literal} but found ${expected}`);
    }
  });
}

const digit = oneOf(...'0123456789'.split('').map(lit));

const os = oneOf(
  oneOrMore(lit` `).map((_) => ``),
  lit``
);

const eatWs = <T>(p: AllParser<T>) => surrounded(os, p, os).map(second);

const letter = oneOf(
  ...[...chunk('azAZ'.split(''), 2)]
    .flatMap(([a, b]) => [...range(a.charCodeAt(0), b.charCodeAt(0))])
    .map((v) => lit(String.fromCharCode(v)))
);

const identifierChar = oneOf(lit`_`, digit, letter);
const identifier = oneOf(
  letter,
  inOrder(lit`_`, oneOrMore(identifierChar).map(join)).map(
    (p) => p.first + p.second
  )
);

const operators = {
  '/': Divide,
  '*': Mult,
  '-': Minus,
  '+': Plus,
  '%': Modulo,
} as Record<string, ICreate<Expr>>;

const int = oneOrMore(digit).map(join);

const double = inOrder(int, lit`.`, int).map(
  ({ first, third }) => `${first}.${third}`
);

const number = oneOf(double, int).map(parseFloat);

const signedNumber = oneOf(
  inOrder(lit`-`, number).map(({ second }) => -second),
  number
).map((val) => new NumberExpr(val));

function assignment() {
  return inOrder(identifier, eatWs(lit`=`), additive).map(
    ({ first, third }) => new Assign(first, third)
  );
}

const makeOps = (opList: string) =>
  oneOf(...opList.split('').map(lit))
    .map((op) => operators[op])
    .chain(eatWs);

const mapCreate = (t: Triple<Expr, ICreate<Expr>, Expr>) =>
  t.second.create(t.first, t.third);

function multiplicative() {
  return separated(factor, makeOps('*/%'), mapCreate).chain(eatWs);
}

function additive() {
  return separated(multiplicative, makeOps('+-'), mapCreate).chain(eatWs);
}

const expression = additive();

function factor(): Parser<Expr> {
  return oneOf<Expr>(
    signedNumber,
    assignment,
    identifier.map((val) => new Id(val)),
    inOrder(lit`-`, factor).map(({ second }) => new Negated(second)),
    inOrder(eatWs(lit`(`), additive, eatWs(lit`)`)).map(second)
  ).chain(eatWs);
}

class Interpreter {
  ctx: Ctx = {};
  constructor() {}

  input(expr: string): string | number {
    if (!expr) return '';
    return this.#evaluate(expr);
  }

  #evaluate(expr: string) {
    return expression
      .parse(Source.fromString(expr))
      .map((exp) => exp.evaluate(this.ctx)).value;
  }
}
