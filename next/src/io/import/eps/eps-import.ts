// Old: chunk.vendor.js module 1403 (GEPSImport).
//
// Runs an EPS/PS file through the PostScript worker (FMT-IMPORT-012) and
// builds the nodes from its calls with EPSParser. The worker gets 300
// seconds; then it is terminated and the import reports a timeout.
//
// The old importer loaded public/ps.worker.js (with a cache-busting query
// and a blob importScripts wrapper for other origins); the rewrite starts
// the bundled module worker (workers/ps).
//
// Kept: the error-code check compares the arguments array with "04" by
// `==`, which matches a one-element array; progress must be given (the
// worker's progress calls it unchecked); an exception in the worker never
// reaches the callbacks, so such an import only ends at the timeout.
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { createPostScriptWorker } from "../../../workers/ps/index.ts";
import { EPSParser, type EPSDrawCallback, type EPSErrorCallback } from "./eps-parser.ts";

export type EPSProgressCallback = (percent: number) => void;

/** Receives the function that cancels the import. */
export type EPSCancelHandler = (cancel: () => void) => void;

const TIMEOUT = 3e5;

export const EPSImport = {
  import(
    data: Blob | ArrayBuffer | Uint8Array,
    outlineFonts: boolean,
    fontManager: FontManager,
    drawCallback: EPSDrawCallback,
    errorCallback?: EPSErrorCallback | null,
    progress?: EPSProgressCallback,
    cancelHandler?: EPSCancelHandler | null,
  ): void {
    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        EPSImport.import(
          reader.result as ArrayBuffer,
          outlineFonts,
          fontManager,
          drawCallback,
          errorCallback,
          progress,
          cancelHandler,
        );
      };
      reader.readAsArrayBuffer(data);
      return;
    }
    if (!(data instanceof ArrayBuffer || data instanceof Uint8Array)) return;
    const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const parser = new EPSParser(input, drawCallback, fontManager, errorCallback);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let worker: Worker;
    try {
      worker = createPostScriptWorker();
      parser.worker = worker;
      worker.onmessage = (event: MessageEvent) => {
        const message = event.data as {
          func?: string;
          data?: unknown[];
          result?: SharedArrayBuffer | null;
        };
        if ("error" in message) return;
        if (!("func" in message)) {
          worker.postMessage({ error: -1, errorStr: "no `func` field found in call" });
          return;
        }
        const func = message.func as string;
        if (func == "progress" && message.data && message.data.length) {
          (progress as EPSProgressCallback)(message.data[0] as number);
          return;
        }
        const handler = parser.workerAPI[func];
        if (typeof handler != "function") {
          worker.postMessage({ error: -2, errorStr: "no func found in worker" });
          return;
        }
        if (func == "done") (progress as EPSProgressCallback)(100);
        if (!("data" in message)) {
          worker.postMessage({ error: -3, errorStr: "no `data` field found in worker" });
          return;
        }
        const args: unknown[] = [];
        const data = message.data as unknown[];
        for (let i = 0; i < data.length; i++) args[i] = data[i];
        const result = message.result;
        if ("result" in message && result && result.byteLength && result.byteLength > 4) {
          args[args.length] = new Int32Array(result, 0, 1);
          args[args.length] = new Uint8Array(result, 4, result.byteLength - 4);
        }
        (handler as (...a: unknown[]) => unknown).apply(parser, args);
        if (func == "error" && (args as unknown) == EPSParser.ErrorCodes.General) {
          if (timer !== null) clearTimeout(timer);
          worker.terminate();
          if (!parser.ready()) parser.doneCall();
        } else if (parser.ready() && timer !== null) {
          clearTimeout(timer);
        }
      };
      if (cancelHandler)
        cancelHandler(() => {
          if (timer !== null) clearTimeout(timer);
          worker.terminate();
          if (errorCallback)
            errorCallback(
              Locale.get(new LocaleKey("GEPSParser", EPSParser.ErrorCodes.Canceled)) as string,
            );
        });
      worker.postMessage({
        func: "init",
        data: [input, { gDevelopment: false, maxWaitTime: TIMEOUT, outlineFonts: !!outlineFonts }],
      });
      worker.postMessage({ func: "run", data: [] });
      timer = setTimeout(() => {
        worker.terminate();
        if (!parser.ready()) {
          parser.doneCall();
          parser.error(EPSParser.ErrorCodes.Timeout);
        }
      }, TIMEOUT);
    } catch {
      console.log("error loading worker");
    }
  },
};
