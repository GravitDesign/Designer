// What the interpreter needs from its surroundings. In the worker these
// are the worker scope's postMessage, close and setTimeout (the old code
// called the globals); tests pass their own.

/** A call the interpreter posts to the page: `{func, data}`, plus `result` for waitForResponse. */
export interface PSHostMessage {
  func: string;
  data: unknown[];
  result?: unknown;
}

export interface PSHost {
  postMessage(message: PSHostMessage): void;
  /** Ends the worker (the old parser called `close()` after "done"). */
  close(): void;
  setTimeout(callback: () => void, delay: number): unknown;
  /** Time slicing: the parser yields when this returns true (old: Math.random() < 1e-4). */
  shouldYield(): boolean;
}
