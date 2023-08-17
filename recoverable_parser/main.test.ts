import { Source } from '../ts_libs/parser/mod.ts';
import { expr } from './main.ts';

const s = (src: string) => Source.fromString(src);

const cases = ['foo', '(foo)', '(foo))', '(foo', '(%', '(', '%', '()', ''];
Deno.test('blog post', () => {
  for (const entry of cases) {
    const res = expr()
      .parse(s(entry))
      .value.mapRight(() => `Unexpected ${entry}`);
    console.debug(res, entry);
  }
});
