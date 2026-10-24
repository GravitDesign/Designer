// Old: designer.browser.dev.js module 1373 (the entry point).
/**
 * Starts the app once the page has loaded: the browser container reads
 * the language setting, then runs the boot with itself. The install
 * prompt of the PWA (beforeinstallprompt) is handed to the designer once
 * it exists; an installed app reloads.
 */
import type { Container } from "./container.ts";
import type { Designer } from "./designer.ts";

interface PwaDesigner {
  setPwaEvent?(event: globalThis.Event): void;
}

/** Waits for load, then container.initLanguage and container.init(boot). */
export function startApp(
  makeContainer: () => Container,
  boot: (container: Container) => Promise<Designer>,
): Promise<Designer> {
  let started: Promise<Designer> | null = null;
  let pendingPrompt: globalThis.Event | null = null;
  const handOver = (designer: Designer, event: globalThis.Event): void => {
    const target = designer as unknown as PwaDesigner;
    if (target.setPwaEvent) target.setPwaEvent(event);
  };
  const result = new Promise<Designer>((resolve, reject) => {
    const start = (): void => {
      const container = makeContainer();
      void container.initLanguage(() => {
        started = container.init(boot);
        started.then((designer) => {
          if (pendingPrompt) handOver(designer, pendingPrompt);
          resolve(designer);
        }, reject);
      });
    };
    if ("complete" === document.readyState) start();
    else window.addEventListener("load", start);
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!event || "beforeinstallprompt" !== event.type) return;
    if (!started) {
      pendingPrompt = event;
      return;
    }
    void started.then((designer) => handOver(designer, event));
  });
  window.addEventListener("appinstalled", (event) => {
    if (event && "appinstalled" === event.type) location.reload();
  });
  return result;
}
