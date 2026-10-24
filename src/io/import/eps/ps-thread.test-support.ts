// Runs the PostScript interpreter in a Node worker thread for the EPS
// import tests, the way ps.worker.ts runs it in a browser worker: the
// page's {func, data} calls come in as messages and the interpreter's
// calls go out the same way, SharedArrayBuffers included. A real thread
// matters for the JPEG handshake, where the interpreter blocks in
// Atomics.wait until the page notifies it. Not used by the app.
import { parentPort } from "node:worker_threads";
import type { PSHost } from "../../../workers/ps/host.ts";
import { PSInterpreter, type PSInitOptions } from "../../../workers/ps/interpreter.ts";
import type { PSWorkerCall } from "../../../workers/ps/protocol.ts";

const port = parentPort;
if (!port) throw new Error("ps-thread.test-support.ts runs as a worker thread");

const host: PSHost = {
  postMessage: (message) => port.postMessage(message),
  close: () => port.close(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  shouldYield: () => false,
};

const interpreter = new PSInterpreter(host);

port.on("message", (call: PSWorkerCall) => {
  const data = call.data ?? [];
  if (call.func === "init") interpreter.init(data[0] as Uint8Array, data[1] as PSInitOptions);
  else if (call.func === "run") interpreter.run();
});
