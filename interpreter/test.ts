import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { Interpreter } from './main.ts';

Deno.test({
  name: 'Basic arithmetic',
  ignore: false,
  fn() {
    const interpreter = new Interpreter();
    assertEquals(interpreter.input('1 + 1'), 2);
    assertEquals(interpreter.input('2 - 1'), 1);
    assertEquals(interpreter.input('2 * 3'), 6);
    assertEquals(interpreter.input('8 / 4'), 2);
    assertEquals(interpreter.input('7 % 4'), 3);
  },
});

Deno.test({
  name: 'Variables',
  ignore: false,
  fn() {
    const interpreter = new Interpreter();

    assertEquals(interpreter.input('x = 1'), 1);
    assertEquals(interpreter.input('x'), 1);
    assertEquals(interpreter.input('x + 3'), 4);
    assertThrows(function () {
      interpreter.input('y');
    });
  },
});

Deno.test({
  name: 'complex arithmetics',
  ignore: false,
  fn() {
    const interpreter = new Interpreter();

    assertEquals(interpreter.input('4 / 2 * 3'), 6);
    assertEquals(interpreter.input('(7 + 3) / (2 * 2 + 1)'), 2);
  },
});

Deno.test({
  name: '1kyu',
  fn() {
    const interpreter = new Interpreter();
    //Variables
    assertEquals(interpreter.input('x = 1'), 1);
    assertEquals(interpreter.input('x'), 1);
    assertEquals(interpreter.input('x + 3'), 4);
    assertThrows(function () {
      interpreter.input('y');
    });
    // functions
    interpreter.input('fn avg x y => (x + y) / 2');
    assertEquals(interpreter.input('avg 4 2'), 3);
    assertThrows(function () {
      interpreter.input('avg 7');
    });
    assertThrows(function () {
      interpreter.input('avg 7 2 4');
    });
    // conflicts
    assertThrows(function () {
      interpreter.input('fn x => 0');
    });
    assertThrows(function () {
      interpreter.input('avg = 5');
    });
    interpreter.input('fn avg => 0');
  },
});

Deno.test({
  name: 'chained assignment',
  fn() {
    const interpreter = new Interpreter();
    interpreter.input('x = y = 713');
    assertEquals(interpreter.input('x'), 713);
    assertEquals(interpreter.input('y'), 713);
  },
});

Deno.test({
  name: 'chained function call',
  fn() {
    const interpreter = new Interpreter();
    interpreter.input('fn avg x y => (x + y) / 2');
    interpreter.input('fn echo x => x');
    assertEquals(interpreter.input('avg echo 4 echo 2'), 3);
  },
});

Deno.test({
  name: 'nested function',
  fn() {
    const interpreter = new Interpreter();
    interpreter.input('fn f a b => a * b');
    interpreter.input('fn g a b c => a * b * c');
    interpreter.input('g g 1 2 3 f 4 5 f 6 7');
    assertEquals(
      interpreter.input('g g 1 2 3 f 4 5 f 6 7'),
      2 * 3 * 4 * 5 * 6 * 7
    );
  },
});

Deno.test({
  name: 'invalid functions',
  fn() {
    const interpreter = new Interpreter();
    assertThrows(() => interpreter.input('fn add x y => x + z'));
    assertThrows(() => interpreter.input('fn add x x => x + x'));
    assertThrows(() => interpreter.input('(fn f => 1)'));
  },
});

Deno.test({
  name: 'invalid expression',
  fn() {
    const interpreter = new Interpreter();
    assertThrows(() => interpreter.input('1two'));
    assertThrows(() => interpreter.input('1 2'));
  },
});
