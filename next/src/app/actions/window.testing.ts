/**
 * A bare window for modules that read it at load (app/config.ts reads
 * window.location). Import it before anything else in a node test.
 */
const globals = globalThis as unknown as { window?: unknown };
if (typeof globals.window === "undefined") {
  globals.window = {
    location: { host: "localhost", origin: "http://localhost", protocol: "http:" },
  };
}
export {};
