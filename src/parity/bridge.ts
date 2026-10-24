/**
 * window.__parity for the parity harness: the engine namespace under the
 * old class names (GRectangle, GTransform, ...) and the app hooks the
 * scenarios use. The old app gets the same object from
 * parity/support/old-harness.js, so one scenario runs in both apps.
 *
 * Each port cluster adds its classes in its own file under ./g/ and its
 * app hooks under ./app/; both folders are picked up here, so parallel
 * work never edits the same file.
 */
export interface ParityApp {
  kind: "new";
  newInfiniteDocument(): void;
  /**
   * Back to the state right after boot with one empty document; returns
   * what could not be restored (see resetState in old-harness.js).
   */
  resetState(): string[];
  [hook: string]: unknown;
}

export interface ParityHandle {
  G: Record<string, unknown>;
  app: ParityApp;
}

declare global {
  interface Window {
    __parity?: ParityHandle;
  }
}

type Namespace = Record<string, unknown>;

function merge(modules: Record<string, Record<string, unknown>>, what: string): Namespace {
  const out: Namespace = {};
  for (const [file, exports] of Object.entries(modules)) {
    for (const part of Object.values(exports)) {
      if (typeof part !== "object" || part === null) continue;
      for (const [name, value] of Object.entries(part)) {
        if (name in out && out[name] !== value) {
          throw new Error(`${what} ${name} is defined twice (again in ${file})`);
        }
        out[name] = value;
      }
    }
  }
  return out;
}

export function installParityBridge(): void {
  // Tests and test helpers next to the hooks must stay out of the page.
  const G = merge(
    import.meta.glob(["./g/*.ts", "!./g/*.test.ts", "!./g/*.testing.ts"], { eager: true }),
    "G",
  );
  const hooks = merge(
    import.meta.glob(["./app/*.ts", "!./app/*.test.ts", "!./app/*.testing.ts"], { eager: true }),
    "app hook",
  );
  window.__parity = {
    G,
    app: {
      kind: "new",
      newInfiniteDocument() {
        // Documents arrive with the engine (phase 4) and the shell (phase 7).
      },
      resetState() {
        // Until the shell exists there is no state to reset; report that,
        // so the harness boots a fresh page for every scenario.
        return ["no resettable app shell yet"];
      },
      ...hooks,
    },
  };
}
