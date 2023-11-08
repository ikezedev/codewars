import { Source } from '../ts_libs/parser/mod.ts';
import { Expr, FnExpr } from './ast.ts';
import { grammar } from './grammar.ts';

export class Compiler {
  program?: FnExpr;
  optimised?: FnExpr;

  pass1(prog: string) {
    return grammar.parse(Source.fromString(prog)).value.unwrapLeft().idsToArgs()
      .body;
  }

  pass2(given: Expr) {
    return given.pass2();
  }

  pass3(pass2: Expr) {
    return pass2.pass3();
  }
}
