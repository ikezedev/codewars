import { chunk } from '../ts_libs/parser/utils.ts';

export function elderAge1(m: number, n: number, l: number, t: number): number {
  const all = m - l;
  const age = (all / 2) * (all - 1) * n;
  return age % t;
}

function* gen(m: number, n: number, l: number) {
  for (let i = 0; i < m * n; i++) {
    yield Math.max((Math.floor(i / m) ^ i % m) - l, 0);
  }
}

export function elderAge(m: number, n: number, l: number, t: number): number {
  const produce = [...gen(m, n, l)];
  console.debug([...chunk(produce, m)]);
  return produce.reduce((a, b) => a + b, 0) % t;
}
