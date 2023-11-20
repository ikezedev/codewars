import { Span } from '@ikezedev/parser';
import { None, Option } from '@ikezedev/ds';

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

// Todo: rename to Params
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

export class Statement {
  constructor(public span: Span) {}
}

export class Fn extends Statement {
  constructor(
    public name: Option<Id>,
    public args: Arg[],
    public body: Statement[],
    public isPublic: boolean,
    public span: Span,
    public documentation: Option<DocComment> = None
  ) {
    super(span);
  }

  evaluate() {}
}

export class Keyword extends Id {
  constructor(public name: string, span: Span) {
    super(name, span);
  }
}

export class Assignment extends Statement {
  constructor(
    public keyword: Keyword,
    public name: Option<Id>,
    public value: Option<Expr>,
    public span: Span,
    public isGlobal = false
  ) {
    super(span);
  }
}

export class ExprStatement extends Statement {
  constructor(public expr: Expr, public span: Span) {
    super(span);
  }
}

export class Return extends Statement {
  constructor(
    public keyword: Keyword,
    public value: Option<Expr>,
    public span: Span
  ) {
    super(span);
  }
}

export class UseStatement extends Statement {
  constructor(public module: Id, public imports: Id[], public span: Span) {
    super(span);
  }
}

export class Comment extends Statement {
  constructor(public span: Span) {
    super(span);
  }
}

export class InlineComment extends Comment {
  constructor(public text: string, public span: Span) {
    super(span);
  }
}

interface IDocComment {
  getMarkdown(src: string): string;
}

export class DocComment extends Comment implements IDocComment {
  constructor(
    public comments: Array<TextInDocComment | CodeInDocComment>,
    public span: Span
  ) {
    super(span);
  }
  getMarkdown(src: string): string {
    return this.comments.map((c) => c.getMarkdown(src)).join('\n');
  }
}

export class TextInDocComment extends Comment implements IDocComment {
  constructor(public texts: string[], public span: Span) {
    super(span);
  }
  getMarkdown(): string {
    return this.texts.join('\n');
  }
}

export class CodeInDocComment extends Comment implements IDocComment {
  constructor(
    public lang: Option<Id>,
    public statements: Statement[],
    public span: Span
  ) {
    super(span);
  }
  getMarkdown(src: string): string {
    return this.span.extractSrc(src).replaceAll(/\/\/\/\s/g, '');
  }
}

export namespace Keywords {
  export const LET = (span: Span) => new Keyword('let', span);
  export const FN = (span: Span) => new Keyword('fn', span);
  export const PUB = (span: Span) => new Keyword('pub', span);
  export const RETURN = (span: Span) => new Keyword('return', span);
}

export type Visit = {
  Id(id: Id): Option<Id>;
  Arg(arg: Arg): Option<Arg>;
  NumberExpr(num: NumberExpr): Option<NumberExpr>;
  Plus(plus: Plus): Option<Plus>;
  Minus(min: Minus): Option<Minus>;
  Mult(mul: Mult): Option<Mult>;
  Divide(div: Divide): Option<Divide>;
  FnCall(call: FnCall): Option<FnCall>;
  Fn(fn: Fn): Option<Fn>;
  Expr(expr: Expr): Option<Expr>;
  Statement(stat: Statement): Option<Statement>;
  Keyword(key: Keyword): Option<Keyword>;
  Assignment(ass: Assignment): Option<Assignment>;
  ExprStatement(expr: ExprStatement): Option<ExprStatement>;
  Return(ret: Return): Option<Return>;
  UseStatement(use: UseStatement): Option<UseStatement>;
  InlineComment(comment: InlineComment): Option<InlineComment>;
  DocComment(comment: DocComment): Option<DocComment>;
  TextInDocComment(comment: TextInDocComment): Option<TextInDocComment>;
  CodeInDocComment(comment: CodeInDocComment): Option<CodeInDocComment>;
};

type Visitors = { [Key in keyof Visit]?: Visit[Key] };

function visitId(v: Visitors, id: Id) {
  v.Id?.(id);
}

function visitArg(v: Visitors, arg: Arg) {
  v.Arg?.(arg);
}

function visitNumberExpr(v: Visitors, num: NumberExpr) {
  v.NumberExpr?.(num);
}

function visitExpr(v: Visitors, expr: Expr) {
  v.Expr?.(expr);
  if (expr instanceof Id) {
    visitId(v, expr);
  }
  if (expr instanceof NumberExpr) {
    visitNumberExpr(v, expr);
  }
  if (expr instanceof NumberExpr) {
    visitNumberExpr(v, expr);
  }
  if (expr instanceof Plus) {
    visitPlus(v, expr);
  }
  if (expr instanceof Minus) {
    visitMinus(v, expr);
  }
  if (expr instanceof Divide) {
    visitDivide(v, expr);
  }
  if (expr instanceof Mult) {
    visitMult(v, expr);
  }
  if (expr instanceof FnCall) {
    visitFnCall(v, expr);
  }
}
function visitPlus(v: Visitors, plus: Plus) {
  v.Plus?.(plus);
  v.Expr?.(plus.left);
  v.Expr?.(plus.right);
}
function visitMinus(v: Visitors, minus: Minus) {
  v.Minus?.(minus);
  v.Expr?.(minus.left);
  v.Expr?.(minus.right);
}
function visitDivide(v: Visitors, divide: Divide) {
  v.Divide?.(divide);
  v.Expr?.(divide.left);
  v.Expr?.(divide.right);
}
function visitMult(v: Visitors, mult: Mult) {
  v.Mult?.(mult);
  v.Expr?.(mult.left);
  v.Expr?.(mult.right);
}

function visitFnCall(v: Visitors, fnCall: FnCall) {
  v.FnCall?.(fnCall);
  fnCall.args.forEach((arg) => visitExpr(v, arg));
}

function visitKeyWord(v: Visitors, key: Keyword) {
  v.Keyword?.(key);
}

function visitAssign(v: Visitors, ass: Assignment) {
  v.Assignment?.(ass);
  visitKeyWord(v, ass.keyword);
  if (ass.value.isSome()) {
    visitExpr(v, ass.value.unwrap());
  }
}

function visitExprStatement(v: Visitors, epst: ExprStatement) {
  v.ExprStatement?.(epst);
  visitExpr(v, epst.expr);
}
function visitReturn(v: Visitors, ret: Return) {
  v.Return?.(ret);
  if (ret.value.isSome()) {
    visitExpr(v, ret.value.unwrap());
  }
}

function visitUseStatement(v: Visitors, use: UseStatement) {
  v.UseStatement?.(use);
  use.imports.forEach((id) => visitId(v, id));
}

function visitDocComment(v: Visitors, docComment: DocComment) {
  v.DocComment?.(docComment);
  docComment.comments.forEach((com) => {
    if (com instanceof TextInDocComment) {
      v.TextInDocComment?.(com);
    }
    if (com instanceof CodeInDocComment) {
      v.CodeInDocComment?.(com);
    }
  });
}

function visitfn(v: Visitors, fn: Fn) {
  v.Fn?.(fn);
  fn.args.forEach((id) => visitId(v, id));
  fn.documentation.map((d) => visitDocComment(v, d));
  fn.body.forEach((s) => visitStatement(v, s));
}

//Todo: visit comment

function visitStatement(v: Visitors, st: Statement) {
  if (st instanceof Fn) {
    visitfn(v, st);
  }
  if (st instanceof Assignment) {
    visitAssign(v, st);
  }
  if (st instanceof ExprStatement) {
    visitExprStatement(v, st);
  }
  if (st instanceof Return) {
    visitReturn(v, st);
  }
  if (st instanceof UseStatement) {
    visitUseStatement(v, st);
  }
}

export class TinyAst {
  public constructor(
    public statements: Option<Statement[]>,
    public span: Span
  ) {}
}

export function visitAst(ast: TinyAst, visitors: Visitors) {
  ast.statements
    .unwrapOrDefault([])
    .forEach((st) => visitStatement(visitors, st));
}
