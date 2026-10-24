// Old: public/pdfexport.worker.js.
//
// The PDF export worker: a module worker that answers the export's
// "raster", "jpegencoder" and "zipencoder" messages (see handler.ts).
import { handlePDFWorkerRequest } from "./handler.ts";
import type { PDFWorkerRequest } from "./protocol.ts";

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent) => {
  handlePDFWorkerRequest(event.data as PDFWorkerRequest, (message, transfer) =>
    scope.postMessage(message, transfer),
  );
};
