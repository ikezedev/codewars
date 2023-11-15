import { Compiler } from './compiler';

describe('', () => {
  test('Compiler test -> pass3 - 1', () => {
    const input = '[ x ] x + 2*5';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    // assertEquals(simulate(pass3, [5]), 15);
  });

  test('Compiler test -> pass3 - 2', () => {
    const input = '[ x y z ] ( 2*3*x + 5*y - 3*z ) / (1 + 3 + 2*2)';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    // assertEquals(simulate(pass3, [1, 2, 3]), 7 / 8);
    // assertEquals(simulate(pass3, [4, 0, 0]), 3);
    // assertEquals(simulate(pass3, [4, 8, 0]), 8);
    // assertEquals(simulate(pass3, [4, 8, 16]), 2);
  });

  test('Compiler test -> pass3 - 3', () => {
    const input = '[ x y ] 2*3*x + y';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    // assertEquals(simulate(pass3, [1, 2]), 8);
  });
  test('Compiler test -> pass3 - 4', () => {
    const input = '[ a b ] 7*b + a/8';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    const expected = [
      'IM 7',
      'SW',
      'AR 1',
      'MU',
      'PU',
      'AR 0',
      'SW',
      'IM 8',
      'SW',
      'DI',
      'SW',
      'PO',
      'AD',
    ];

    const expected2 = [
      'IM 8',
      'SW',
      'AR 0',
      'DI',
      'PU',
      'AR 1',
      'SW',
      'IM 7',
      'MU',
      'SW',
      'PO',
      'AD',
    ];
    // assertEquals(simulate(expected, [16, 2]), 16);
    // assertEquals(simulate(expected2, [16, 2]), 16);
    // assertEquals(simulate(pass3, [16, 2]), 16);
  });

  test('Compiler test -> pass3 - 5', () => {
    const input = '[ a b ] 7*b + a';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    const expected = ['IM 7', 'SW', 'AR 1', 'MU', 'SW', 'AR 0', 'AD'];

    // assertEquals(pass3, expected);
    // assertEquals(simulate(expected, [3, 2]), 17);
    // assertEquals(simulate(pass3, [3, 2]), 17);
  });

  test('Compiler test -> pass3 - 6', () => {
    const input = '[ a b ] a + 7 * b';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);
    const expected = [
      'AR 0',
      'PU',
      'IM 7',
      'SW',
      'AR 1',
      'MU',
      'SW',
      'PO',
      'AD',
    ];

    // assertEquals(pass3, expected);
    // assertEquals(simulate(expected, [2, 3]), 23);
    // assertEquals(simulate(pass3, [2, 3]), 23);
  });
  test('Compiler test -> pass3 - Benkay', () => {
    const input = '[ a b ] 6/b + a/8';
    const compiler = new Compiler();
    // const pass1 = compiler.pass1(input);
    // const pass2 = compiler.pass2(pass1);
    // const pass3 = compiler.pass3(pass2);

    // assertEquals(simulate(pass3, [16, 2]), 5);
    // assertEquals(simulate(pass3, [2, 2]), 3.25);
    // assertEquals(simulate(pass3, [2, 3]), 2.25);
  });
});

function simulate(asm: string[], args: number[]) {
  let r0: number | undefined;
  let r1: number | undefined;
  const stack: number[] = [];
  asm.forEach((instruct) => {
    const match = instruct.match(/(IM|AR)\s+(\d+)/) || [0, instruct, 0];
    const ins = match[1];
    const n = parseInt((match[2] as string) ?? '0') || 0;

    if (ins === 'IM') {
      r0 = n;
    } else if (ins === 'AR') {
      r0 = args[n];
    } else if (ins === 'SW') {
      const tmp = r0;
      r0 = r1;
      r1 = tmp;
    } else if (ins === 'PU') {
      stack.push(r0!);
    } else if (ins === 'PO') {
      r0 = stack.pop();
    } else if (ins === 'AD') {
      r0! += r1!;
    } else if (ins === 'SU') {
      r0! -= r1!;
    } else if (ins === 'MU') {
      r0! *= r1!;
    } else if (ins === 'DI') {
      r0! /= r1!;
    }
  });

  return r0;
}
