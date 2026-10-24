// Old: public/ps.worker.js (webpack module 1367 of its own build), the
// init/run half; the message handling is in ps.worker.ts.
//
// Builds the interpreter in the old order (parser, classes, core, CTM,
// color) and runs it. The old worker loaded the five ps*.js scripts with
// importScripts at this point; here they are modules.
import { PSColor } from "./color.ts";
import { PSCore } from "./core.ts";
import { PSCTM } from "./ctm.ts";
import type { PSHost } from "./host.ts";
import { PSClasses } from "./objects.ts";
import { PSParser } from "./parser.ts";

/** The options the page passes to init (FMT-IMPORT-012). */
export interface PSInitOptions {
  /** Unused: the old worker only switched its debug logging with it. */
  gDevelopment?: boolean;
  /** Unused: the old worker loaded its scripts from this origin. */
  origin?: string;
  maxWaitTime?: number;
  outlineFonts?: boolean;
}

export class PSInterpreter {
  parser: PSParser | null = null;
  classes: PSClasses | null = null;
  core: PSCore | null = null;
  ctm: PSCTM | null = null;
  color: PSColor | null = null;
  private readonly host: PSHost;

  constructor(host: PSHost) {
    this.host = host;
  }

  init(input: Uint8Array, options: PSInitOptions): void {
    this.parser = new PSParser(input, options.maxWaitTime);
    this.classes = new PSClasses(this.parser);
    this.core = new PSCore(this.parser, options.outlineFonts as boolean, this.host);
    this.ctm = new PSCTM(this.core);
    this.color = new PSColor(this.core);
  }

  run(): void {
    if (this.parser) this.parser.read();
  }
}
