"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrThrow = exports.zipWithNext = exports.zip = exports.join = exports.third = exports.second = exports.first = exports.Triple = exports.Pair = void 0;
class Pair {
    first;
    second;
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }
}
exports.Pair = Pair;
class Triple {
    first;
    second;
    third;
    constructor(first, second, third) {
        this.first = first;
        this.second = second;
        this.third = third;
    }
}
exports.Triple = Triple;
const first = (ds) => ds.first;
exports.first = first;
const second = (ds) => ds.second;
exports.second = second;
const third = (ds) => ds.third;
exports.third = third;
const join = (strArr) => strArr.join('');
exports.join = join;
function zip(xs, ys) {
    const minLength = Math.min(xs.length, ys.length);
    return xs.slice(0, minLength).map((v, i) => [v, ys.slice(0, minLength)[i]]);
}
exports.zip = zip;
function zipWithNext(xs) {
    return zip(xs, xs.slice(1));
}
exports.zipWithNext = zipWithNext;
function getOrThrow(map, key) {
    const value = map[key];
    if (!value) {
        throw `[Undefined] use of an undefined reference ${String(key)}`;
    }
    return value;
}
exports.getOrThrow = getOrThrow;
//# sourceMappingURL=helpers.js.map