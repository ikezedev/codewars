import { FnExpr } from './ast';
export { tinyGrammar } from './grammar';

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
