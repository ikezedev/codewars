function extractArgs(fnExpr_) {
  const fnExpr = removeComment(fnExpr_);
  const start = fnExpr.indexOf('(') + 1;
  const end = fnExpr.indexOf(')');

  return fnExpr
    .slice(start, end)
    .split(/,\s*/)
    .map((a) => a.split('=')[0].trim());
}

function removeComment(str) {
  return str.replaceAll(/\/\*.*?\*\//gs, '').replaceAll(/\/\/.*$/gm, '');
}

export function defaultArguments(fn, defaults) {
  const args = extractArgs(fn.toString());

  const _inner = (...suppliedArgs) => {
    const finalArgs = args.map((a, i) =>
      suppliedArgs.length > i ? suppliedArgs[i] : defaults[a]
    );
    return fn(...finalArgs);
  };

  _inner.toString = fn.toString.bind(fn);
  return _inner;
}
