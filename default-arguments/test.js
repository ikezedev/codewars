import {
  assertEquals,
  assert,
} from 'https://deno.land/std@0.136.0/testing/asserts.ts';
import { defaultArguments } from './index.js';

Deno.test('basic', () => {
  function add(a, b) {
    return a + b;
  }
  const add_ = defaultArguments(add, { b: 9 });
  assertEquals(add_(10), 19);
  assertEquals(add_(10, 7), 17);
  assert(Number.isNaN(add_()));
});

Deno.test('args with comments', () => {
  function add(
    /** *
     */ a,
    b
    /* hdh
     */
  ) {
    return a + b;
  }
  const add_ = defaultArguments(add, { b: 9 });
  assertEquals(add_(10), 19);
  assertEquals(add_(10, 7), 17);
  assert(Number.isNaN(add_()));
});

Deno.test('recursed', () => {
  function add(a, b) {
    return a + b;
  }
  let add_ = defaultArguments(add, { b: 9 });
  assertEquals(add_(10), 19);
  assertEquals(add_(10, 7), 17);
  assert(Number.isNaN(add_()));

  add_ = defaultArguments(add_, { b: 3, a: 2 });
  assertEquals(add_(10), 13);
  assertEquals(add_(), 5);

  add_ = defaultArguments(add_, { c: 3 });
  assert(Number.isNaN(add_(10)));
  assertEquals(add_(10, 10), 20);
});

Deno.test('undefined args', () => {
  function more(a) {
    return a + 1;
  }

  const more_ = defaultArguments(more, { a: 2 });
  assertEquals(more_(4), 5);
  assertEquals(more_(), 3);
  assert(Number.isNaN(more_(undefined)));
});

Deno.test('boss level', true, () => {
  function add(a, b) {
    return a + b;
  }
  var add_ = defaultArguments(add, { b: 9 });
  function add2(x, y) {
    return x + y;
  }
  var add2_ = defaultArguments(add2, { y: 9 });
  function addMore(a, b, c, d, e) {
    return a + b + c + d + e;
  }
  function f1(a, b, c) {
    return a - b * c;
  }
  function f2(b, a, c) {
    return a - b * c;
  }
  var timesFive = (function () {
    var five = 5;
    return function (a) {
      return five * x;
    };
  })();
  var closure_counter = (function accumulator() {
    var counter = 0;
    return function (x) {
      return (counter += x);
    };
  })();
  var id = function (_id) {
    return _id;
  };
  var five = function () {
    return 5;
  };
  function addComments(
    a, // comments
    b /* more comments */
  ) {
    return a + b;
  }
});
