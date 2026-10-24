// Old: public/ps.worker.js (webpack module 1367 of its own build).
//
// The PostScript worker: answers the page's `{func, data}` calls (see
// protocol.ts). The old worker looked the function up on its global scope
// (`self[func]`); only init and run were ever called, and those are the
// only functions here.
import type { PSHost, PSHostMessage } from "./host.ts";
import { PSInterpreter, type PSInitOptions } from "./interpreter.ts";
import type { PSWorkerCall, PSWorkerReply } from "./protocol.ts";

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: PSHostMessage | PSWorkerReply): void;
  close(): void;
}

const scope = self as unknown as WorkerScope;

const host: PSHost = {
  postMessage: (message) => scope.postMessage(message),
  close: () => scope.close(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  // The old parser yielded at random, about once every 10,000 tokens.
  shouldYield: () => Math.random() < 1e-4,
};

const interpreter = new PSInterpreter(host);

const functions: Record<string, (...args: unknown[]) => unknown> = {
  init: (input, options) => interpreter.init(input as Uint8Array, options as PSInitOptions),
  run: () => interpreter.run(),
};

scope.onmessage = (event: MessageEvent) => {
  const call = event.data as PSWorkerCall;
  if (!("func" in call)) {
    scope.postMessage({ error: -1, errorStr: "no `func` field found in call" });
    return;
  }
  const fn = functions[call.func as string];
  if (typeof fn != "function") {
    scope.postMessage({ error: -2, errorStr: "no func found in worker" });
    return;
  }
  if (!("data" in call)) {
    scope.postMessage({ error: -3, errorStr: "no `data` field found in worker" });
    return;
  }
  const result = fn(...(call.data as unknown[]));
  scope.postMessage({ error: 0, result, call });
};
