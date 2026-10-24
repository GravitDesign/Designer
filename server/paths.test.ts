import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("CLIENT_ROOT", () => {
  it("is dist/ under the app folder by default", async () => {
    vi.stubEnv("GD_CLIENT_ROOT", "");
    const { APP_ROOT, CLIENT_ROOT } = await import("./paths.ts");
    expect(CLIENT_ROOT).toBe(path.join(APP_ROOT, "dist"));
  });

  it("follows GD_CLIENT_ROOT", async () => {
    vi.stubEnv("GD_CLIENT_ROOT", "dist-run-test");
    const { CLIENT_ROOT } = await import("./paths.ts");
    expect(CLIENT_ROOT).toBe(path.resolve("dist-run-test"));
  });
});
