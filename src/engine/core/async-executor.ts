// Old: chunk.vendor.js module 640.
/**
 * Runs a callback over lists of objects in slices, so long jobs don't
 * block the page: after every `executionSteps` callbacks it checks the
 * time and yields to the next animation frame (a microtask outside the
 * browser) once `executionTime` ms have passed. `execute` called from
 * inside a callback pushes a nested list that finishes first.
 *
 * The old executor also waited for the next frame after every finished
 * list, so a tree of 2,000 groups took 2,000 frames whatever the work.
 * A finished list now yields only to a task (a message to itself), which
 * still runs the promise callbacks queued so far before the next object,
 * as the frame did, and keeps the time slice going.
 */
interface Job<T> {
  idx: number;
  objects: readonly T[];
  callback: (object: T) => void;
  done: (() => void) | undefined;
}

// One channel for every executor; each message runs the oldest waiting
// continuation.
const waiting: (() => void)[] = [];
let channel: MessageChannel | null = null;

function postTask(task: () => void): void {
  if (!channel) {
    channel = new MessageChannel();
    channel.port1.onmessage = () => {
      const next = waiting.shift();
      if (next) next();
    };
    // Node's ports keep the process alive; browsers have no unref.
    (channel.port1 as { unref?: () => void }).unref?.();
  }
  waiting.push(task);
  channel.port2.postMessage(null);
}

export class AsyncExecutor {
  static EXECUTION_TIME = 15;
  static EXECUTION_STEPS = 10;

  private readonly _stack: Job<never>[] = [];
  private _abort = false;
  private _steps = 0;
  private _endTime: number;
  private readonly _executionSteps: number;
  private readonly _executionTime: number;
  private readonly _done: (() => void) | undefined;

  constructor(executionSteps?: number, executionTime?: number, done?: () => void) {
    // The old constructor read _executionTime before setting it, from the
    // prototype default null, so the first slice ends at Date.now() + null.
    this._endTime = Date.now();
    this._executionSteps =
      typeof executionSteps === "number" ? executionSteps : AsyncExecutor.EXECUTION_STEPS;
    this._executionTime =
      typeof executionTime === "number" ? executionTime : AsyncExecutor.EXECUTION_TIME;
    this._done = done;
  }

  execute<T>(objects: readonly T[], callback: (object: T) => void, done?: () => void): void {
    if (this._abort) throw new Error("AbortError");
    this._stack.push({ idx: 0, objects, callback, done } as unknown as Job<never>);
    if (this._stack.length === 1) this._continue();
  }

  abort(): void {
    this._abort = true;
  }

  private _scheduleNext(): void {
    if (typeof window !== "undefined") window.requestAnimationFrame(() => this._next());
    else void Promise.resolve(undefined).then(() => this._next());
  }

  /** After a finished list: a task while the slice has time left, else the next frame. */
  private _scheduleAfterJob(): void {
    if (typeof window === "undefined" || typeof MessageChannel === "undefined")
      this._scheduleNext();
    else if (Date.now() > this._endTime) this._scheduleNext();
    else postTask(() => this._continue());
  }

  private _next(): void {
    this._steps = 0;
    this._endTime = Date.now() + this._executionTime;
    this._continue();
  }

  private _continue(): void {
    // The old code recursed once per callback; a loop does the same steps
    // without growing the stack on long lists.
    for (;;) {
      if (this._abort) return;
      const job = this._stack[this._stack.length - 1];
      if (!job) {
        if (this._done) this._done();
        return;
      }
      if (job.idx >= job.objects.length) {
        const finished = this._stack.pop();
        if (finished && finished.done) finished.done();
        this._scheduleAfterJob();
        return;
      }
      try {
        job.callback(job.objects[job.idx++] as never);
      } catch (error) {
        console.error(error);
      }
      if (++this._steps > this._executionSteps) {
        if (Date.now() > this._endTime) {
          this._scheduleNext();
          return;
        }
        this._steps = 0;
      }
    }
  }
}
