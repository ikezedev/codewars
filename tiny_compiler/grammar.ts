import {
  any,
  eatWs,
  lit,
  not,
  number,
  os,
  regex,
  trimStart,
  ws,
} from 'lib/parser/primitive.ts';
import {
  inOrder,
  leftAssociative,
  oneOf,
  oneOrMore,
  opt,
  recoverable,
  separated,
  surrounded,
  takeUntil,
  zeroOrMore,
} from 'lib/parser/combinators.ts';
import {
  Assignment,
  Divide,
  CodeInDocComment,
  Expr,
  ExprStatement,
  Fn,
  FnCall,
  Id,
  Minus,
  Mult,
  NumberExpr,
  Plus,
  Return,
  Statement,
  UseStatement,
  TextInDocComment,
  InlineComment,
  DocComment,
  RecAssignment,
  Keyword,
} from './ast.ts';
import { Parser } from 'lib/parser/mod.ts';

const id = regex(/^[a-zA-Z_]\w*/).map((a, sp) => new Id(a, sp));
const argList = separated(id, oneOrMore(lit` `))
  .map(({ first, second }) =>
    [first, ...second.map((p) => p.second)].map((e, i) => e.toArg(i, e.span))
  )
  .chain(opt)
  .map((op) => op.unwrapOrDefault([]));

function factor() {
  return oneOf<Expr>(
    number().map((n, sp) => new NumberExpr(n, sp)),
    fnCall,
    id,
    surrounded(eatWs(lit`(`), expression, trimStart(lit`)`))
  );
}

function expression(): Parser<Expr> {
  return leftAssociative(
    term,
    oneOf(lit`+`, lit`-`).chain(eatWs),
    ({ first, second: op, third }, span) => {
      if (op === '+') return new Plus(first, third, span);
      return new Minus(first, third, span);
    }
  ).chain(trimStart);
}

function assign() {
  return inOrder(lit`let`, ws, id)
    .and(inOrder(os, lit`=`, expression))
    .map(
      ({ first, second }, span) =>
        new Assignment(first.third, second.third, span)
    )
    .discardOpt(lit`;`)
    .chain(trimStart);
}

export function assignRec() {
  const continueat = lit`\n`.or(lit`;`);
  return lit`let`
    .trimStart()
    .map((l, span) => new Keyword(l, span))
    .and(
      id
        .trimStart()
        .recover()
        .and(lit`=`.trimStart().recover())
        .and(expression().recoverAt(continueat))
        .recoverAt(continueat)
    )

    .discardOpt(lit`;`)
    .map(
      ({ first: key, second }, span) =>
        new RecAssignment(
          key,
          second
            .ok()
            .map((v) => v.first.first.ok())
            .flatten(),
          second
            .ok()
            .map((v) => v.second.ok())
            .flatten(),
          span
        )
    );
}

function ret() {
  return inOrder(lit`return`, ws, expression)
    .discardOpt(lit`;`)
    .map(({ third }, span) => new Return(third, span))
    .chain(trimStart);
}

function functionBody() {
  return oneOrMore<Statement>(oneOf(assign, ret).discardOpt(inlineComment));
}

export function testTerm() {
  return surrounded(eatWs(lit`{`), functionBody(), eatWs(lit`}`));
}

export function fn(): Parser<Fn> {
  return opt(docComment())
    .and(inOrder(opt(lit`pub`.and(ws)), lit`fn`.and(ws), id).chain(trimStart))
    .and(inOrder(argList.chain(eatWs), lit`=>`))
    .and(
      oneOf<Statement[]>(
        exprStatement.map((r) => [r]),
        surrounded(eatWs(lit`{`), functionBody(), trimStart(lit`}`))
      )
    )
    .map(
      (
        {
          first: {
            first: {
              first: doc,
              second: { first: vis, third: name },
            },
            second: { first: args },
          },
          second: statements,
        },
        sp
      ) => new Fn(name, args, statements, vis.isSome(), sp, doc)
    );
}

function useStatement() {
  const manyImports = surrounded(
    lit`{`,
    separated(id, lit`,`.chain(eatWs)),
    lit`}`
  ).map(({ first, second }) => {
    return [first, ...second.map((e) => e.second)];
  });
  return inOrder(
    lit`use`.and(ws),
    id.and(lit`::`),
    id.map((e) => [e]).or(manyImports)
  )
    .map(
      ({ second, third }, span) => new UseStatement(second.first, third, span)
    )
    .discardOpt(lit`;`)
    .chain(trimStart);
}

function fnCall() {
  return inOrder(
    id,
    surrounded(
      eatWs(lit`(`),
      separated(expression, eatWs(lit`,`)),
      trimStart(lit`)`)
    )
  ).map(
    ({ first, second }, span) =>
      new FnCall(
        first,
        [second.first, ...second.second.map((s) => s.second)],
        span
      )
  );
}

function term(): Parser<Expr> {
  return leftAssociative(
    factor,
    oneOf(lit`*`, lit`/`).chain(eatWs),
    ({ first, second: op, third }, span) => {
      if (op === '*') return new Mult(first, third, span);
      return new Divide(first, third, span);
    }
  );
}

function inlineComment() {
  return inOrder(lit`//`.and(not(lit`/`)), os, takeUntil(any, lit`\n`))
    .map(({ third }, sp) => new InlineComment(third.join(''), sp))
    .chain(trimStart);
}

const exprStatement = expression()
  .map((x, span) => new ExprStatement(x, span))
  .discardOpt(lit`;`);
export const statement = oneOf<Statement>(
  useStatement,
  fn,
  assign().map((a) => {
    a.isGlobal = true;
    return a;
  }),
  exprStatement
)
  .chain(trimStart)
  .discardOpt(inlineComment);
export const tinyGrammar = oneOrMore(statement);

export function docComment() {
  const originSlashes = lit`///`
    .and(os)
    .and(not(lit('```')))
    .chain(trimStart);
  const slashes = inOrder(lit`\n`, os, lit`///`.and(os));

  const texts = takeUntil(
    inOrder(originSlashes, takeUntil(any, lit`\n`)).map((res) =>
      res.second.join('')
    ),
    oneOf(
      slashes.and(lit('```')).map((_) => ''),
      lit`\n`.and(not(slashes)).map((_) => '')
    )
  )
    .map((res, span) => new TextInDocComment(res, span))
    .chain(trimStart);

  return oneOrMore(
    oneOf<CodeInDocComment | TextInDocComment>(codeInDocComments, texts)
  ).map((comments, span) => new DocComment(comments, span));
}

function codeInDocComments() {
  const originSlashes = lit`///`.and(os).chain(trimStart);
  const osButLine = opt(takeUntil(ws, lit`\n`));
  const slashes = osButLine.and(inOrder(lit`\n`, os, lit`///`.and(os)));
  const start = inOrder(originSlashes, lit('```').and(opt(id)), osButLine);

  return start
    .and(oneOrMore(inOrder(slashes, statement, osButLine)))
    .and(slashes.and(lit('```')))
    .map(
      (
        {
          first: {
            first: { second },
            second: sts,
          },
        },
        span
      ) =>
        new CodeInDocComment(
          second.second,
          sts.map((s) => s.second),
          span
        )
    );
}

// Todo: ensure inline comments can be used where applicable - 70% done
// Todo: support  recovery
// Todo: support error & warning reporting