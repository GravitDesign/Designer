// Old: designer.browser.dev.js module 536 (a promise cache).
/**
 * Caches the promise a factory returns. With a timeout the cache is
 * dropped on the first get() at least `timeout` ms after the last drop
 * (the clock starts at the first get()).
 */
export class AsyncCache<T, A extends unknown[] = []> {
  private _promise: Promise<T> | null = null;
  private _lastCheckTime = 0;

  constructor(
    private readonly _factory: (...args: A) => Promise<T>,
    private readonly _timeout = 0,
  ) {}

  get(...args: A): Promise<T> {
    if (this._timeout) {
      const now = Date.now();
      if (!this._lastCheckTime) this._lastCheckTime = now;
      if (now - this._lastCheckTime >= this._timeout) {
        this.reset();
        this._lastCheckTime = now;
      }
    }
    if (!this._promise) this._promise = this._factory.apply(this._factory, args);
    return this._promise;
  }

  reset(): void {
    this._promise = null;
  }

  setCacheValue(value: T): void {
    this.reset();
    this._lastCheckTime = Date.now();
    this._promise = Promise.resolve(value);
  }
}
