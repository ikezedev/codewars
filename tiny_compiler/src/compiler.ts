import { ParsingContext, Source, Span } from '@ikezedev/parser';
import { Fn, Id, TinyAst, UseStatement } from './ast';
import { tinyGrammar } from './grammar';
export { tinyGrammar } from './grammar';
export * from './ast';
export class TinyDocument {
  public ast: TinyAst;
  public ctx: ParsingContext;
  public imports: Id[];
  public exports: Fn[];
  constructor(public src: string, public uri: string) {
    const { value: ast, context } = tinyGrammar
      .parse(Source.fromString(src))
      .map((val, sp) => new TinyAst(val.ok(), sp));
    this.ast = ast;
    this.ctx = context;
    const extra = this.#getExtra(ast);
    this.imports = extra.imports;
    this.exports = extra.exports;
  }

  #getExtra(ast: TinyAst) {
    return {
      imports: ast.statements
        .unwrapOrDefault([])
        .filter((s): s is UseStatement => s instanceof UseStatement)
        .flatMap((u) => u.imports),
      exports: ast.statements
        .unwrapOrDefault([])
        .filter((s): s is Fn => s instanceof Fn)
        .filter((fn) => fn.isPublic),
    };
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
