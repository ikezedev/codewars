import { Span } from 'lib/parser/mod.ts';
import { None, Option } from 'lib/adt';

export abstract class Expr {
  abstract evaluate(): unknown;
  abstract prepare(argsMap: Record<string, number>): Expr;
  abstract toJSON(): Record<string, unknown>;

  abstract pass2(): Expr;
  abstract pass3(): string[];
}

export class Id extends Expr {
  constructor(public name: string, public span: Span) {
    super();
  }

  toArg(pos: number, span: Span) {
    return new Arg(this.name, pos, span);
  }

  pass2(): Expr {
    throw new Error(`pass2 not meant to be called on Id`);
  }

  pass3(): string[] {
    throw new Error(`pass3 not meant to be called on Id`);
  }

  toJSON(): Record<string, unknown> {
    throw new Error(`toJSON not meant to be called on Id`);
  }

  prepare(argsMap: Record<string, number>): Arg {
    return this.toArgFromMap(argsMap);
  }

  toArgFromMap(map: Record<string, number>) {
    return this.toArg(map[this.name], this.span);
  }

  evaluate() {}
}

export class Arg extends Id {
  constructor(public name: string, public pos: number, public span: Span) {
    super(name, span);
  }
  evaluate() {}

  prepare() {
    return this;
  }

  toJSON() {
    return {
      op: 'arg',
      n: this.pos,
    };
  }

  pass2(): Expr {
    return this;
  }

  pass3() {
    return [`AR ${this.pos}`];
  }

  static makeMap(args: Arg[]): Record<string, number> {
    return Object.fromEntries(args.map((arg) => [arg.name, arg.pos]));
  }
}

export class NumberExpr extends Expr {
  evaluate() {}

  prepare() {
    return this;
  }

  pass2(): Expr {
    return this;
  }

  pass3() {
    return [`IM ${this.value}`];
  }

  toJSON() {
    return {
      op: 'imm',
      n: this.value,
    };
  }
  constructor(public value: number, public span: Span) {
    super();
  }
}

export abstract class BinaryOp extends Expr {
  abstract sign: string;
  constructor(public left: Expr, public right: Expr, public span: Span) {
    super();
  }
  abstract prepare(ctx: Record<string, number>): BinaryOp;
  abstract evalFn(a: number, b: number): number;

  toJSON(): Record<string, unknown> {
    return {
      op: this.sign,
      a: this.left.toJSON(),
      b: this.right.toJSON(),
    };
  }

  pass3(): string[] {
    const op =
      this.sign === '+'
        ? 'AD'
        : this.sign === '-'
        ? 'SU'
        : this.sign === '/'
        ? 'DI'
        : 'MU';

    const isRPrimitive = isArgOrId(this.right);
    const association = op === 'DI' || op === 'SU' ? ['SW'] : [];

    if (isRPrimitive) {
      return [
        ...this.left.pass3(),
        'SW',
        ...this.right.pass3(),
        ...association,
        op,
      ];
    } else {
      return [
        ...this.left.pass3(),
        'PU',
        ...this.right.pass3(),
        'SW',
        'PO',
        op,
      ];
    }
  }

  evaluate() {}
}

export class Plus extends BinaryOp {
  sign = '+';
  prepare(ctx: Record<string, number>): Plus {
    return new Plus(this.left.prepare(ctx), this.right.prepare(ctx), this.span);
  }
  evalFn(a: number, b: number): number {
    return a + b;
  }

  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value), this.span);
    }
    return new Plus(leftP, rightP, this.span);
  }
}

export class Minus extends BinaryOp {
  sign = '-';
  prepare(ctx: Record<string, number>): Minus {
    return new Minus(
      this.left.prepare(ctx),
      this.right.prepare(ctx),
      this.span
    );
  }
  evalFn(a: number, b: number): number {
    return a - b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value), this.span);
    }
    return new Minus(leftP, rightP, this.span);
  }
}

export class Mult extends BinaryOp {
  sign = '*';
  prepare(ctx: Record<string, number>): Mult {
    return new Mult(this.left.prepare(ctx), this.right.prepare(ctx), this.span);
  }
  evalFn(a: number, b: number): number {
    return a * b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value), this.span);
    }
    return new Mult(leftP, rightP, this.span);
  }
}

export class Divide extends BinaryOp {
  sign = '/';
  prepare(ctx: Record<string, number>): Divide {
    return new Divide(
      this.left.prepare(ctx),
      this.right.prepare(ctx),
      this.span
    );
  }
  evalFn(a: number, b: number): number {
    return a / b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value), this.span);
    }
    return new Divide(leftP, rightP, this.span);
  }
}

export class InvalidExpr extends Expr {
  constructor(public span: Span) {
    super();
  }

  line(source: string): [start: number, end: number] {
    const start = [...source.slice(0, this.span.start)].filter(
      (c) => c === '\n'
    ).length;
    const end = [...source.slice(0, this.span.end)].filter(
      (c) => c === '\n'
    ).length;
    return [start, end];
  }

  extract(source: string): string {
    return source.slice(this.span.start, this.span.end + 1);
  }

  evaluate(): unknown {
    throw new Error('Cannot evalute Invalid expr');
  }
  prepare(): Expr {
    throw new Error('Cannot prepare Invalid expr');
  }
  toJSON(): Record<string, unknown> {
    throw new Error('Cannot toJSON Invalid expr');
  }
  pass2(): Expr {
    throw new Error('Cannot pass2 Invalid expr');
  }
  pass3(): string[] {
    throw new Error('Cannot pass3 Invalid expr');
  }
}

function isArgOrId(expr: Expr): expr is Id | Arg | NumberExpr {
  return (
    expr instanceof Id || expr instanceof Arg || expr instanceof NumberExpr
  );
}

export class FnExpr {
  constructor(public args: Arg[], public body: Expr) {}

  idsToArgs() {
    this.body = this.body.prepare(Arg.makeMap(this.args));
    return this;
  }

  toJSON() {
    return this.body.toJSON();
  }

  evaluate() {}
}

export class FnCall extends Expr {
  evaluate(): unknown {
    throw new Error('Method not implemented.');
  }
  prepare(argsMap: Record<string, number>): Expr {
    throw new Error('Method not implemented.');
  }
  toJSON(): Record<string, unknown> {
    throw new Error('Method not implemented.');
  }
  pass2(): Expr {
    throw new Error('Method not implemented.');
  }
  pass3(): string[] {
    throw new Error('Method not implemented.');
  }
  constructor(public name: Id, public args: Expr[], public span: Span) {
    super();
  }
}

export class Statement {}

export class Fn extends Statement {
  constructor(
    public name: Id,
    public args: Arg[],
    public body: Statement[],
    public isPublic: boolean,
    public span: Span,
    public documentation: Option<DocComment> = None
  ) {
    super();
  }

  evaluate() {}
}

export class FnRec extends Statement {
  constructor(
    public name: Option<Id>,
    public args: Arg[],
    public body: Statement[],
    public isPublic: boolean,
    public span: Span,
    public documentation: Option<DocComment> = None
  ) {
    super();
  }

  evaluate() {}
}

export class Assignment extends Statement {
  constructor(
    public name: Id,
    public value: Expr,
    public span: Span,
    public isGlobal = false
  ) {
    super();
  }
}

export class Keyword extends Id {
  constructor(public name: string, span: Span) {
    super(name, span);
  }
}

export class RecAssignment extends Statement {
  constructor(
    public keyword: Keyword,
    public name: Option<Id>,
    public value: Option<Expr>,
    public span: Span,
    public isGlobal = false
  ) {
    super();
  }
}

export class ExprStatement extends Statement {
  constructor(public expr: Expr, public span: Span) {
    super();
  }
}

export class Return extends Statement {
  constructor(public value: Expr, public span: Span) {
    super();
  }
}

export class ReturnRec extends Statement {
  constructor(
    public keyword: Keyword,
    public value: Option<Expr>,
    public span: Span
  ) {
    super();
  }
}

export class UseStatement extends Statement {
  constructor(public module: Id, public imports: Id[], public span: Span) {
    super();
  }
}

export class Comment extends Statement {
  constructor(public span: Span) {
    super();
  }
}

export class InlineComment extends Comment {
  constructor(public text: string, public span: Span) {
    super(span);
  }
}

export class DocComment extends Comment {
  constructor(
    public comments: Array<TextInDocComment | CodeInDocComment>,
    public span: Span
  ) {
    super(span);
  }
}

export class TextInDocComment extends Comment {
  constructor(public texts: string[], public span: Span) {
    super(span);
  }
}

export class CodeInDocComment extends Comment {
  constructor(
    public lang: Option<Id>,
    public statements: Statement[],
    public span: Span
  ) {
    super(span);
  }
}
