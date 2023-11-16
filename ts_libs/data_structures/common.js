"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Right = exports.Left = exports.Option = exports.Either = exports.Some = exports.None = void 0;
const helpers_1 = require("./helpers");
class Option {
    match(patterns) {
        return this.map(patterns.Some).unwrapOr(patterns.None);
    }
    collect(opts) {
        const res = [];
        let seenNone = false;
        for (const opt of opts) {
            if (seenNone)
                return exports.None;
            opt.match({
                Some(val) {
                    res.push(val);
                },
                None() {
                    seenNone = true;
                },
            });
        }
        return Some(res);
    }
}
exports.Option = Option;
class Some_ extends Option {
    val;
    isSome() {
        return true;
    }
    isNone() {
        return false;
    }
    flatten() {
        return this.match({
            Some(val) {
                return val;
            },
            None() {
                return exports.None;
            },
        });
    }
    zip(other) {
        return other.map((o) => new helpers_1.Pair(this.val, o));
    }
    constructor(val) {
        super();
        this.val = val;
    }
    map(fn) {
        return new Some_(fn(this.val));
    }
    unwrap() {
        return this.val;
    }
    unwrapOr() {
        return this.val;
    }
    unwrapOrDefault() {
        return this.unwrapOr();
    }
}
class None_ extends Option {
    isSome() {
        return false;
    }
    isNone() {
        return true;
    }
    flatten() {
        return exports.None;
    }
    zip() {
        return exports.None;
    }
    map() {
        return new None_();
    }
    unwrapOr(fn) {
        return fn();
    }
    unwrap() {
        throw new Error('Tried to unwrap a None variant');
    }
    unwrapOrDefault(def) {
        return def;
    }
}
exports.None = new None_();
function Some(val) {
    return new Some_(val);
}
exports.Some = Some;
class Either {
    match(patterns) {
        if (this.isLeft()) {
            return this.mapLeft(patterns.Left).unwrapLeft();
        }
        return this.mapRight(patterns.Right).unwrapRight();
    }
    static collectLeft(eithers) {
        const res = [];
        let seenRight = new helpers_1.Pair(false, null);
        for (const e of eithers) {
            if (seenRight.first) {
                return Right(seenRight.second);
            }
            e.match({
                Left(val) {
                    res.push(val);
                },
                Right(val) {
                    seenRight = new helpers_1.Pair(true, val);
                },
            });
        }
        return Left(res);
    }
    static collectRight(eithers) {
        const res = [];
        let seenLeft = new helpers_1.Pair(false, null);
        for (const e of eithers) {
            if (seenLeft.first) {
                return Left(seenLeft.second);
            }
            e.match({
                Right(val) {
                    res.push(val);
                },
                Left(val) {
                    seenLeft = new helpers_1.Pair(true, val);
                },
            });
        }
        return Right(res);
    }
}
exports.Either = Either;
class Right_ extends Either {
    val;
    swap() {
        return Left(this.val);
    }
    isLeft() {
        return false;
    }
    isRight() {
        return true;
    }
    flattenRight() {
        return this.match({
            Right: (val) => val,
            Left() {
                throw new Error('unreachable');
            },
        });
    }
    flattenLeft() {
        return this.match({
            Right: (val) => Right(val),
            Left() {
                throw new Error('unreachable');
            },
        });
    }
    zipRight(other) {
        return other.mapRight((o) => new helpers_1.Pair(this.val, o));
    }
    zipLeft() {
        return Right(this.val);
    }
    constructor(val) {
        super();
        this.val = val;
    }
    mapLeft() {
        return Right(this.val);
    }
    mapRight(fn) {
        return Right(fn(this.val));
    }
    unwrapLeftOr(fn) {
        return fn();
    }
    unwrapLeftOrDefault(def) {
        return this.unwrapLeftOr(() => def);
    }
    unwrapRightOr() {
        return this.val;
    }
    unwrapRightOrDefault() {
        return this.unwrapRightOr();
    }
    unwrapLeft() {
        throw new Error('Tried to unwrap left on a right variant');
    }
    unwrapRight() {
        return this.val;
    }
    ok() {
        return exports.None;
    }
}
class Left_ extends Either {
    val;
    swap() {
        return Right(this.val);
    }
    isLeft() {
        return true;
    }
    isRight() {
        return false;
    }
    flattenRight() {
        return this.match({
            Right() {
                throw new Error('unreachable');
            },
            Left: (val) => Left(val),
        });
    }
    flattenLeft() {
        return this.match({
            Right() {
                throw new Error('unreachable');
            },
            Left: (val) => val,
        });
    }
    zipRight() {
        return Left(this.val);
    }
    zipLeft(other) {
        return other.mapLeft((o) => new helpers_1.Pair(this.val, o));
    }
    constructor(val) {
        super();
        this.val = val;
    }
    mapRight() {
        return Left(this.val);
    }
    mapLeft(fn) {
        return Left(fn(this.val));
    }
    unwrapLeftOr() {
        return this.val;
    }
    unwrapLeftOrDefault() {
        return this.unwrapLeftOr();
    }
    unwrapRightOr(fn) {
        return fn();
    }
    unwrapRightOrDefault(def) {
        return this.unwrapRightOr(() => def);
    }
    unwrapLeft() {
        return this.val;
    }
    unwrapRight() {
        throw new Error('Tried to unwrap left on a right variant');
    }
    ok() {
        return Some(this.val);
    }
}
function Left(val) {
    return new Left_(val);
}
exports.Left = Left;
function Right(val) {
    return new Right_(val);
}
exports.Right = Right;
//# sourceMappingURL=common.js.map