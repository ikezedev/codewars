import { zip } from 'lib/parser/helpers.ts';

export type Ctx = {
  variables: Record<string, Evaluation>;
  functions: Record<string, Fn>;
};
export class Evaluation<T = number> {
  constructor(public val?: T) {}

  static new<T>(val?: T) {
    new Evaluation(val);
  }

  mapOrThrow<V>(fn: (val: T) => V) {
    if (this.val === undefined)
      throw new Error('tried unwrapping an empty variant');
    return new Evaluation(fn(this.val));
  }

  mapOr<V>(fn: (val: T) => V, def: V) {
    return this.val !== undefined
      ? new Evaluation(fn(this.val!))
      : new Evaluation(def);
  }

  getOrThrow() {
    return this.mapOrThrow((x) => x).val!;
  }
}
export abstract class Expr {
  abstract evaluate(ctx: Ctx): Evaluation;
}

export class Assign extends Expr {
  constructor(public id: Id, public expr: Expr) {
    super();
  }

  evaluate(ctx: Ctx) {
    if (this.id.name in ctx.functions) {
      throw new Error(
        `[Conflicting identifier] ${this.id.name} is already used in this scope`
      );
    }
    const value = this.expr.evaluate(ctx);
    ctx.variables[this.id.name] = value;
    return value;
  }
}

export class Id extends Expr {
  constructor(public name: string) {
    super();
  }
  evaluate(ctx: Ctx) {
    if (this.name in ctx.variables) {
      return ctx.variables[this.name];
    } else if (this.name in ctx.functions) {
      return ctx.functions[this.name].body.evaluate(ctx);
    } else {
      throw `Runtime error: undefined variable ${this.name}`;
    }
  }
}

export class Negated extends Expr {
  constructor(public expr: Expr) {
    super();
  }
  evaluate(ctx: Ctx) {
    return this.expr.evaluate(ctx).mapOrThrow((x) => -x);
  }
}

export class NumberExpr extends Expr {
  evaluate() {
    return new Evaluation(this.value);
  }
  constructor(public value: number) {
    super();
  }
}

export function makeCreate<T>(instance: new (left: Expr, right: Expr) => T) {
  return (left: Expr, right: Expr) => new instance(left, right);
}

export interface ICreate<T extends Expr> {
  create: ReturnType<typeof makeCreate<T>>;
}

export abstract class BinaryOp extends Expr {
  constructor(public left: Expr, public right: Expr) {
    super();
  }
  evaluate(ctx: Ctx) {
    return new Evaluation(
      this.evalFn(
        this.left.evaluate(ctx).getOrThrow(),
        this.right.evaluate(ctx).getOrThrow()
      )
    );
  }
  abstract evalFn(a: number, b: number): number;
}

export class Plus extends BinaryOp {
  static create = makeCreate(Plus);
  evalFn(a: number, b: number): number {
    return a + b;
  }
}

export class Minus extends BinaryOp {
  static create = makeCreate(Minus);
  evalFn(a: number, b: number): number {
    return a - b;
  }
}

export class Mult extends BinaryOp {
  static create = makeCreate(Mult);
  evalFn(a: number, b: number): number {
    return a * b;
  }
}

export class Divide extends BinaryOp {
  static create = makeCreate(Divide);
  evalFn(a: number, b: number): number {
    return a / b;
  }
}

export class Modulo extends BinaryOp {
  static create = makeCreate(Modulo);
  evalFn(a: number, b: number): number {
    return a % b;
  }
}

export class Fn extends Expr {
  constructor(public name: Id, public body: Expr, public params: Id[] = []) {
    super();
  }
  evaluate(ctx: Ctx) {
    if (this.name.name in ctx.variables) {
      throw new Error(
        `[Conflicting identifier] ${this.name.name} is already used in this scope`
      );
    }
    // check params
    const params = this.params.map((p) => p.name);
    if (params.length !== new Set(params).size) {
      throw new Error(`[Conflicting param names] ${params.join(', ')}`);
    }
    // check body
    const fakeCtx: Ctx = {
      functions: {},
      variables: Object.fromEntries(
        zip(
          params,
          params.map((_) => new Evaluation(1))
        )
      ),
    };
    this.body.evaluate(fakeCtx);
    ctx.functions[this.name.name] = this;
    return new Evaluation();
  }
}

export class FnCall extends Expr {
  constructor(public chains: Expr[] = []) {
    super();
  }
  evaluate(ctx: Ctx) {
    const stack: Evaluation[] = [];
    for (const entry of this.chains.toReversed()) {
      if (entry instanceof Id && entry.name in ctx.functions) {
        const fn = ctx.functions[entry.name];
        const fnArgs = stack.splice(-fn.params.length, fn.params.length);
        if (fnArgs.length != fn.params.length) {
          throw new SyntaxError(
            `[Invalid Args] ${fn.name.name} takes ${fn.params.length} arguments but got ${fnArgs.length}`
          );
        }
        const fnCtx: Ctx = {
          variables: Object.fromEntries(
            zip(
              fn.params.map((id) => id.name),
              fnArgs
            )
          ),
          functions: {},
        };
        stack.push(fn.body.evaluate(fnCtx));
      } else {
        stack.push(entry.evaluate(ctx));
      }
    }

    if (stack.length !== 1) {
      throw new Error('[Runtime error]: error while calling function');
    }
    return stack[0];
  }
}
