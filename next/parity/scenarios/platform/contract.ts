/**
 * Hooks the platform scenarios need from both apps, at
 * window.__parity.app.platform. The old app's version is old-hooks.js in
 * this folder; the new app must implement the same functions with the
 * same results.
 */
export interface PlatformHooks {
  /**
   * Looks a font up through the workspace font manager (the same path a
   * text element takes) and waits until it is resolved or failed:
   * "resolved" when a font provider delivered it (for an imported font:
   * from IndexedDB "gravitFontsDB"), "failed" when every provider refused
   * it, "pending" when neither happened within `timeoutMs` (default
   * 10 000), "unknown" when the manager returned no font object at all.
   * `style` is "N" (normal) or "I" (italic), `weight` a number such as 400.
   */
  resolveFont(
    family: string,
    style: "N" | "I",
    weight: number,
    timeoutMs?: number,
  ): Promise<"resolved" | "failed" | "pending" | "unknown">;
}
