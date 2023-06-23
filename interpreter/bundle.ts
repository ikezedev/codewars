import { bundle } from 'https://deno.land/x/emit@0.24.0/mod.ts';

const from = Deno.args[0] ?? './';
const to = Deno.args[1] ?? '../interpreter_node_8_1_3';
const dirs = Deno.readDir(from);

for await (const dir of dirs) {
  if (
    dir.isFile &&
    dir.name.endsWith('.ts') &&
    !dir.name.includes('.test.ts')
  ) {
    const { code } = await bundle(
      new URL(`${from}${dir.name}`, import.meta.url)
    );
    await Deno.writeTextFile(`${to}/${dir.name.slice(0, -2)}js`, code);
  }
}
// const result = await bundle(new URL(`./${dir}`, import.meta.url));

// const { code } = result;
console.log('Success');
