export function* range(start: number, end: number, by?: number) {
  if (start < end) {
    for (let i = start; i <= end; i += by ?? 1) {
      yield i;
    }
  } else {
    for (let i = start; i >= end; i -= by ?? 1) {
      yield i;
    }
  }
}

export function* chunk<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}
