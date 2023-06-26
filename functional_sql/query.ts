// deno-lint-ignore-file no-explicit-any ban-ts-comment
export function query() {
  return new QueryBuilder();
}

type QueryConfig = {
  grouped?: boolean;
  selected?: boolean;
  from?: boolean;
  ordered?: boolean;
};

function combine<A>(a: A[][]): A[][] {
  if (a.length <= 1) return a;
  if (a.length === 2) {
    return a[0].flatMap((c) =>
      a[1].map((d) => (Array.isArray(c) ? [...c, d] : [c, d]))
    );
  }
  // @ts-ignore
  return combine([combine(a.slice(0, 2)), ...a.slice(2)]);
}

export class QueryBuilder<T, R = T> {
  selectFn?: (a: any) => any;
  orderFn: (a: T, b: T) => number = () => 0;
  whereClauses: Array<(a: T) => boolean>[] = [];
  havingClauses: Array<(a: T) => boolean>[] = [];
  groupingCluases: Array<(a: T) => PropertyKey> = [];
  constructor(private data: T[] = [], private config: QueryConfig = {}) {}

  select<U = T>(fn?: (a: T) => U) {
    if (this.config.selected) throw new Error('Duplicate SELECT');
    this.config.selected = true;
    if (fn) {
      // @ts-ignore
      this.selectFn = fn;
    }
    return this as unknown as QueryBuilder<T, U>;
  }

  from<A>(a: A[]): QueryBuilder<A>;
  from<A, B>(a: A[], b: B[]): QueryBuilder<[A, B]>;
  from<A, B, C>(a: A[], b: B[], c: C[]): QueryBuilder<[A, B, C]>;
  from<A, B, C>(
    a: A[],
    b: B[],
    c: C[],
    ...d: A[][]
  ): QueryBuilder<[A, B, C, ...A[]]>;
  from(a: unknown[], ...rest: unknown[][]) {
    if (this.config.from) throw new Error('Duplicate FROM');
    this.config.from = true;
    if (!rest.length) {
      (this.data as any) = a;
      return this;
    }
    (this.data as any) = combine([a, ...rest]);
    return this as QueryBuilder<any>;
  }

  where(...filters: Array<(a: T) => boolean>) {
    this.whereClauses.push(filters);
    return this;
  }

  orderBy(sort: (a: T, b: T) => number) {
    if (this.config.ordered) throw new Error('Duplicate ORDERBY');
    this.orderFn = sort;
    return this;
  }

  groupBy<K extends PropertyKey>(fn: (a: T) => K): QueryBuilder<[K, T[]]>;
  groupBy<K extends PropertyKey, K2 extends PropertyKey>(
    fn: (a: T) => K,
    fn2: (a: T) => K2
  ): QueryBuilder<[K, [K2, T[]][]]>;
  groupBy<K extends PropertyKey>(
    ...fns: Array<(a: T) => K>
  ): QueryBuilder<Grouped<T>>;
  groupBy<K extends PropertyKey>(...groupingFns: Array<(a: T) => K>) {
    if (this.config.grouped) throw new Error('Duplicate GROUPBY');
    this.config.grouped = true;
    this.groupingCluases.push(...groupingFns);
    return this as unknown as QueryBuilder<any>;
  }

  having(...filters: Array<(a: T) => boolean>) {
    if (!this.config.grouped) throw new Error('Having only works on grouped');
    this.havingClauses.push(filters);
    return this;
  }

  execute(): R[] {
    const wheres = (a: T) =>
      this.whereClauses.every((fns) => fns.some((fn) => fn(a)));
    const havings = (a: any) =>
      this.havingClauses.every((fns) => fns.some((fn) => fn(a)));

    const data = group(this.data.filter(wheres), this.groupingCluases)
      .filter(havings)
      .map(this.selectFn ?? ((d) => d));

    data.sort(this.orderFn);
    return data;
  }
}

function groupOne<T>(data: T[], groupingFn: (a: T) => PropertyKey) {
  const grouped = data.reduce((acc, next) => {
    const key = groupingFn(next);
    const gp = acc.find((a) => a[0] === key);
    if (gp !== undefined) {
      gp[1].push(next);
    } else {
      acc.push([key, [next]]);
    }
    return acc;
  }, [] as unknown as [PropertyKey, T[]][]);
  return grouped;
}

function group<T>(
  data: T[],
  groupingFns: Array<(a: T) => PropertyKey>
): Grouped<T> {
  if (groupingFns.length === 0) return data;
  if (groupingFns.length === 1) return groupOne(data, groupingFns[0]);
  const first = groupOne(data, groupingFns[0]);
  return first.map(([key, grouped]) => [
    key,
    group(grouped, groupingFns.slice(1)),
  ]);
}

type Grouped<T, K extends PropertyKey = PropertyKey> = Array<
  T | [K, T[]] | [K, Grouped<T, K>]
>;
