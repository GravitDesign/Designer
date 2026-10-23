// Old: chunk.vendor.js module 509 (carota's "per" sequence library).
//
// A Per wraps a push source: forEach(emit) calls emit for every value and
// stops early when the source honours a truthy return. Arrays stop that
// way (Array.prototype.some); a function source bound to a context drops
// the return value, so such a source always runs to its end. The layout
// relies on both behaviours, so the wrapping rules stay exactly as they
// were.

/** Receives one value; a truthy return asks the source to stop. */
export type Emit<T> = (value: T, ...rest: unknown[]) => unknown;

/** Pushes values into emit. The second argument is passed through from submit. */
export type Source<T> = (emit: Emit<T>, extra?: unknown) => unknown;

/** A step between two sequences: gets the downstream emit and one upstream value. */
export type Step<T, R> = (emit: Emit<R>, value: T) => unknown;

/** What monitor fills in (or calls, when the keys hold functions). */
export interface MonitorTarget<T> {
  count?: number | ((count: number) => void);
  first?: T | ((value: T) => void);
  last?: T | ((value: T) => void);
  limit?: number;
}

type Mapper<T, R> = ((value: T, index: number) => R) | string;

/**
 * Turns a source into a forEach function: an array emits its items
 * (stopping on a truthy return), a function bound to a context is called
 * on it without passing its return on, any other value is emitted once.
 */
function toForEach<T>(source: unknown, context?: unknown): Source<T> {
  if ("function" != typeof source) {
    if (Array.isArray(source)) {
      return (emit) => (source as T[]).some(emit as (value: T) => unknown);
    }
    return (emit) => emit(source as T);
  }
  if (context) {
    return (emit, extra) => {
      (source as (emit: Emit<T>, extra?: unknown) => unknown).call(context, emit, extra);
    };
  }
  return source as Source<T>;
}

function emitExtra<T>(emit: Emit<T>, extra?: unknown): void {
  emit(extra as T);
}

/** A string mapper is an expression of x, as in the old library. */
function toFunction<T, R>(mapper: Mapper<T, R>): (value: T, index: number) => R {
  return "string" == typeof mapper ? (new Function("x", "return " + mapper) as never) : mapper;
}

/** A setter for a monitor key, or the function the key already holds. */
function setterOf<T>(
  target: MonitorTarget<T>,
  key: "count" | "first" | "last",
): (v: never) => void {
  const value = target[key];
  return "function" == typeof value
    ? (value as (v: never) => void)
    : (v: never) => {
        (target as Record<string, unknown>)[key] = v;
      };
}

function noop(): void {}

export class Per<T = unknown> {
  forEach: Source<T>;

  constructor(source: unknown, context?: unknown) {
    this.forEach = toForEach<T>(source, context);
  }

  /** A Per over a source; with no arguments one that emits what submit passes; a Per stays itself. */
  static create<T = unknown>(...args: unknown[]): Per<T> {
    if (0 === args.length) return new Per<T>(emitExtra);
    const [source, context] = args;
    return source && source instanceof Per ? (source as Per<T>) : new Per<T>(source, context);
  }

  /** Chains a step (a function, or a Per's forEach) bound to `context`. */
  per<R>(step: Step<T, R> | Per<R>, context?: unknown): Per<R> {
    const upstream = this.forEach;
    const stepFn = toForEach<unknown>(
      (step && (step as Per<unknown>).forEach) || step,
      context,
    ) as unknown as (emit: Emit<R>, value: T) => unknown;
    return Per.create<R>((emit: Emit<R>, extra?: unknown) =>
      upstream((value: T) => stepFn(emit, value), extra),
    );
  }

  map<R>(mapper: Mapper<T, R>): Per<R> {
    let index = 0;
    const fn = toFunction(mapper);
    return this.per<R>((emit, value) => emit(fn(value, index++)));
  }

  filter(predicate: Mapper<T, unknown>): Per<T> {
    const fn = toFunction(predicate) as (value: T) => unknown;
    return this.per<T>((emit, value) => {
      if (fn(value)) return emit(value);
      return undefined;
    });
  }

  concat(other: unknown, context?: unknown): Per<T> {
    const second =
      other instanceof Per ? (other.forEach as Source<T>) : toForEach<T>(other, context);
    const first = this.forEach;
    return Per.create<T>((emit: Emit<T>, extra?: unknown) => {
      first(emit, extra);
      second(emit, extra);
    });
  }

  skip(count: number): Per<T> {
    return this.per<T>((emit, value) => (count > 0 ? (count--, false) : emit(value)));
  }

  take(count: number): Per<T> {
    return this.per<T>((emit, value) => count <= 0 || (count--, emit(value)));
  }

  /** Passes values on until the listener returns truthy, which stops the sequence. */
  listen(listener: (value: T) => unknown): Per<T> {
    return this.per<T>((emit, value) => !!listener(value) || emit(value));
  }

  flatten(): Per<unknown> {
    return this.per<unknown>((emit, value) =>
      Array.isArray(value) ? value.some((item) => emit(item)) : emit(value),
    );
  }

  /** Emits the running fold; without a seed the first value starts it. */
  reduce<R>(reducer: (accumulator: R, value: T) => R, ...seed: [R?]): Per<R> {
    let accumulator = seed[0] as R;
    let seeded = 1 == seed.length;
    return this.per<R>((emit, value) => {
      emit((accumulator = seeded ? reducer(accumulator, value) : (value as unknown as R)));
      seeded = true;
    });
  }

  into(target: T[], limit?: number): Per<T> {
    if (!Array.isArray(target)) throw new Error("into expects an array");
    let remaining = "number" != typeof limit ? Number.MAX_VALUE : limit;
    return this.listen((value) => {
      if (remaining <= 0) return true;
      target.push(value);
      remaining--;
      return undefined;
    });
  }

  monitor(target: MonitorTarget<T>): Per<T> {
    let count = 0;
    const setCount = setterOf(target, "count") as (count: number) => void;
    const setFirst = setterOf(target, "first") as (value: T) => void;
    const setLast = setterOf(target, "last") as (value: T) => void;
    let limit = target.limit;
    if ("number" != typeof limit) limit = Number.MAX_VALUE;
    if (limit < 1) return this;
    const max = limit;
    return this.listen((value) => {
      if (0 === count) setFirst(value);
      count++;
      setCount(count);
      setLast(value);
      if (count >= max) return true;
      return undefined;
    });
  }

  submit(extra?: unknown): unknown {
    return this.forEach(noop, extra);
  }

  some(predicate: (value: T) => unknown): boolean {
    let found = false;
    this.listen((value) => {
      if (predicate(value)) {
        found = true;
        return true;
      }
      return undefined;
    }).submit();
    return found;
  }

  all(): T[] {
    const result: T[] = [];
    this.into(result).submit();
    return result;
  }

  first(): T | undefined {
    const target: MonitorTarget<T> = { limit: 1 };
    this.monitor(target).submit();
    return (target.count as number) > 0 ? (target.first as T) : void 0;
  }

  last(): T | undefined {
    const target: MonitorTarget<T> = {};
    this.monitor(target).submit();
    return (target.count as number) > 0 ? (target.last as T) : void 0;
  }

  truthy(): Per<T> {
    return this.filter((value: T) => !!value);
  }

  min(): Per<number> {
    return (this as unknown as Per<number>).reduce((a, b) => Math.min(a, b), Number.MAX_VALUE);
  }

  max(): Per<number> {
    return (this as unknown as Per<number>).reduce((a, b) => Math.max(a, b), -Number.MAX_VALUE);
  }

  sum(): Per<number> {
    return (this as unknown as Per<number>).reduce((a, b) => a + b, 0);
  }

  and(): Per<boolean> {
    return this.reduce<boolean>((a, b) => !(!a || !b), true);
  }

  or(): Per<boolean> {
    return this.reduce<boolean>((a, b) => !(!a && !b), false);
  }

  not(): Per<boolean> {
    return this.map((value) => !value);
  }

  /** Emits 0, 1, 2, ... every `interval` ms until emit returns true. */
  static pulse(interval: number): Per<number> {
    let counter = 0;
    return Per.create<number>((emit: Emit<number>) => {
      (function next() {
        if (true !== emit(counter++)) setTimeout(next, interval);
      })();
    });
  }
}
