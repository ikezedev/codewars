import { Option, ParsingContext, Source, Span } from '@ikezedev/parser';
import { FnExpr, Statement } from './ast';
import { tinyGrammar } from './grammar';
export { tinyGrammar } from './grammar';

export class TinyAst {
  public constructor(
    public statements: Option<Statement[]>,
    public span: Span
  ) {}
}
export class TinyDocument {
  public ast: TinyAst;
  public ctx: ParsingContext;
  constructor(public src: string, public uri: string) {
    const { value: ast, context } = tinyGrammar
      .parse(Source.fromString(src))
      .map((val, sp) => new TinyAst(val.ok(), sp));
    this.ast = ast;
    this.ctx = context;
  }

  getPosition(
    span: Span
  ): [
    start: { character: number; line: number },
    end: { character: number; line: number }
  ] {
    return [
      {
        character: span.start,
        line: span.getStartLine(this.src),
      },
      {
        character: span.end,
        line: span.getEndLine(this.src),
      },
    ];
  }
}
export class Compiler {
  program?: FnExpr;
  optimised?: FnExpr;

  // pass1(prog: string) {
  //   return tinyGrammar.parse(Source.fromString(prog)).value.unwrapLeft().idsToArgs()
  //     .body;
  // }

  // pass2(given: Expr) {
  //   return given.pass3();
  // }

  // pass3(pass2: Expr) {
  //   return pass2.pass3();
  // }
}
