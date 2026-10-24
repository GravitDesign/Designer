import { expect, test } from "@playwright/test";
import { isolateNetwork, openApp, type AppKind } from "../support/apps.ts";

// The harness can open both apps and reach window.__parity in each.
for (const kind of ["old", "new"] as const satisfies readonly AppKind[]) {
  test(`opens the ${kind} app and finds the parity bridge`, async ({ page, context }) => {
    await isolateNetwork(context);
    await openApp(page, kind);
    const handle = await page.evaluate(() => {
      const p = (window as unknown as { __parity?: { app: { kind: string }; G: object } }).__parity;
      return p ? { kind: p.app.kind, hasG: typeof p.G === "object" } : null;
    });
    expect(handle).toEqual({ kind, hasG: true });
  });
}
