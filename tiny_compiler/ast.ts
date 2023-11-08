import { Source } from 'lib/parser/mod.ts';

export abstract class Expr {
  abstract evaluate(): unknown;
  abstract prepare(argsMap: Record<string, number>): Expr;
  abstract toJSON(): Record<string, unknown>;

  abstract pass2(): Expr;
  abstract pass3(): string[];
}

export class Id extends Expr {
  constructor(public name: string) {
    super();
  }

  toArg(pos: number) {
    return new Arg(this.name, pos);
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
    return this.toArg(map[this.name]);
  }

  evaluate() {}
}

export class Arg extends Id {
  constructor(public name: string, public pos: number) {
    super(name);
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
  constructor(public value: number) {
    super();
  }
}

export abstract class BinaryOp extends Expr {
  abstract sign: string;
  constructor(public left: Expr, public right: Expr) {
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
    return new Plus(this.left.prepare(ctx), this.right.prepare(ctx));
  }
  evalFn(a: number, b: number): number {
    return a + b;
  }

  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value));
    }
    return new Plus(leftP, rightP);
  }
}

export class Minus extends BinaryOp {
  sign = '-';
  prepare(ctx: Record<string, number>): Minus {
    return new Minus(this.left.prepare(ctx), this.right.prepare(ctx));
  }
  evalFn(a: number, b: number): number {
    return a - b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value));
    }
    return new Minus(leftP, rightP);
  }
}

export class Mult extends BinaryOp {
  sign = '*';
  prepare(ctx: Record<string, number>): Mult {
    return new Mult(this.left.prepare(ctx), this.right.prepare(ctx));
  }
  evalFn(a: number, b: number): number {
    return a * b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value));
    }
    return new Mult(leftP, rightP);
  }
}

export class Divide extends BinaryOp {
  sign = '/';
  prepare(ctx: Record<string, number>): Divide {
    return new Divide(this.left.prepare(ctx), this.right.prepare(ctx));
  }
  evalFn(a: number, b: number): number {
    return a / b;
  }
  pass2() {
    const leftP = this.left.pass2();
    const rightP = this.right.pass2();
    if (leftP instanceof NumberExpr && rightP instanceof NumberExpr) {
      return new NumberExpr(this.evalFn(leftP.value, rightP.value));
    }
    return new Divide(leftP, rightP);
  }
}

export class InvalidExpr extends Expr {
  constructor(public start: number, private end: number) {
    super();
  }

  line(source: string): [start: number, end: number] {
    const start = [...source.slice(0, this.start)].filter(
      (c) => c === '\n'
    ).length;
    const end = [...source.slice(0, this.end)].filter((c) => c === '\n').length;
    return [start, end];
  }

  extract(source: string): string {
    return source.slice(this.start, this.end + 1);
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
  constructor(public name: Id, public args: Expr[]) {
    super();
  }
}

export class Statement {}

export class Fn extends Statement {
  constructor(
    public name: Id,
    public args: Arg[],
    public body: Statement[],
    public isPublic: boolean
  ) {
    super();
  }

  // idsToArgs() {
  //   this.body = this.body.prepare(Arg.makeMap(this.args));
  //   return this;
  // }

  // toJSON() {
  //   return this.body.toJSON();
  // }

  evaluate() {}
}

export class Assignment extends Statement {
  constructor(public name: Id, public value: Expr) {
    super();
  }
}

export class ExprStatement extends Statement {
  constructor(public expr: Expr) {
    super();
  }
}

export class Return extends Statement {
  constructor(public value: Expr) {
    super();
  }
}
