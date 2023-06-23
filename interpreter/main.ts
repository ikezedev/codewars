import { ParserError, Source } from 'lib/parser/mod.ts';
import { expression } from './grammar.ts';
import { Ctx } from './asts.ts';

export class Interpreter {
  ctx: Ctx = { variables: {}, functions: {} };
  constructor() {}

  input(expr: string): string | number {
    if (!expr) return '';
    return this.#evaluate(expr)
      .mapOr<string | number>((x) => x, '')
      .getOrThrow();
  }

  #evaluate(expr: string) {
    const parsed = expression.parse(Source.fromString(expr));
    if (parsed.start !== expr.length) {
      throw ParserError(
        `invalid syntax at ${parsed.start} with slice ${expr.slice(
          parsed.start,
          parsed.start + 5
        )}`
      );
    }
    return parsed.map((exp) => {
      return exp.evaluate(this.ctx);
    }).value;
  }
}
