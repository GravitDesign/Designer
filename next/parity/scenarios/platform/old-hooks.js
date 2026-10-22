/* global window */
// Platform hooks for the old app (window.__parity.app.platform). The
// TypeScript contract is in contract.ts; the new app must provide the same
// functions with the same results. Plain JavaScript on purpose: it is
// evaluated in the page as is.
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.platform) return;
  const designer = parity.app.designer;

  parity.app.platform = {
    // Asks the workspace font manager for a font and waits until it is
    // resolved (some provider had it, e.g. an imported font from IndexedDB)
    // or failed. Gives up after `timeoutMs` and reports "pending".
    resolveFont(family, style, weight, timeoutMs) {
      const fm = designer.getWorkspace().getFontManager();
      const limit = Date.now() + (timeoutMs || 10000);
      return new Promise((resolve) => {
        const check = () => {
          const font = fm.getFont(family, style, weight);
          if (font && font.isResolved()) return resolve("resolved");
          if (font && font.isFailed()) return resolve("failed");
          if (!font) return resolve("unknown");
          if (Date.now() > limit) return resolve("pending");
          window.setTimeout(check, 50);
        };
        check();
      });
    },
  };
})();
