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

//      "IM n"     // load the constant value n into R0
//     "AR n"     // load the n-th input argument into R0
//     "SW"       // swap R0 and R1
//     "PU"       // push R0 onto the stack
//     "PO"       // pop the top value off of the stack into R0
//     "AD"       // add R1 to R0 and put the result in R0
//     "SU"       // subtract R1 from R0 and put the result in R0
//     "MU"       // multiply R0 by R1 and put the result in R0
//     "DI"       // divide R0 by R1 and put the result in R0
