// Old: public/pdf.worker.js (FMT-WORKER-009): the pdf.js worker build with
// Gravit's CMYK patch.
//
// A module worker that evaluates pdfjs-dist 2.1.266's worker build with
// the same patch (pdfjs-patches.ts). The build sets itself up on the
// worker scope and answers pdf.js's MessageHandler protocol
// ({sourceName, targetName, action, data, callbackId}: test, configure,
// GetDocRequest, GetPage, GetOperatorList, ...).
import workerSource from "pdfjs-dist/build/pdf.worker.js?raw";
import { applyPatches, WORKER_PATCHES } from "./pdfjs-patches.ts";

// Indirect eval runs the build at global scope, where its UMD wrapper
// and its self-initialization expect to run.
(0, eval)(applyPatches(workerSource, WORKER_PATCHES));
