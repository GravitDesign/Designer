import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeDom, type FakeDom } from "./dom.testing.ts";
import {
  DROPPED_LOCAL_STORAGE_KEYS,
  LocalStorageKeys,
  getProperty,
  getPropertyKeyByIndex,
  getStorageLength,
  isDroppedLocalStorageKey,
  removeProperty,
  setProperty,
} from "./local-storage.ts";

let dom: FakeDom;

beforeEach(() => {
  dom = installFakeDom();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("localStorage properties (UI-STORAGE-001)", () => {
  it("stores JSON and reads it back parsed", async () => {
    setProperty("designer.settings", { theme: "dark" });
    setProperty(LocalStorageKeys.PreserveRatio, false);
    expect(dom.window.localStorage.getItem("designer.settings")).toBe('{"theme":"dark"}');
    expect(dom.window.localStorage.getItem("designer.settings.dimension.preserveratio")).toBe(
      "false",
    );
    expect(await getProperty("designer.settings")).toEqual({ theme: "dark" });
    expect(await getProperty(LocalStorageKeys.PreserveRatio)).toBe(false);
  });

  it("keeps the double-encoded PWA list as the old app wrote it", async () => {
    setProperty("pwa.show-install-dialog-3-times-a-week", JSON.stringify([1, 2]));
    expect(dom.window.localStorage.getItem("pwa.show-install-dialog-3-times-a-week")).toBe(
      '"[1,2]"',
    );
    expect(await getProperty("pwa.show-install-dialog-3-times-a-week")).toBe("[1,2]");
  });

  it("gives null for a missing or empty key and rejects invalid JSON", async () => {
    expect(await getProperty("swatches")).toBeNull();
    dom.window.localStorage.setItem("swatches", "");
    expect(await getProperty("swatches")).toBeNull();
    dom.window.localStorage.setItem("swatches", "{nope");
    await expect(getProperty("swatches")).rejects.toThrow(SyntaxError);
  });

  it("removes keys and lists them by index", () => {
    setProperty("swatches", []);
    setProperty("one-off-key", 1);
    expect(getStorageLength()).toBe(2);
    expect(getPropertyKeyByIndex(0)).toBe("swatches");
    removeProperty("swatches");
    expect(getStorageLength()).toBe(1);
    expect(getPropertyKeyByIndex(0)).toBe("one-off-key");
  });

  it("knows the keys only dropped code wrote", () => {
    expect(isDroppedLocalStorageKey("offline_cache")).toBe(true);
    expect(isDroppedLocalStorageKey("recent_external_42")).toBe(true);
    expect(isDroppedLocalStorageKey("adal.idtoken")).toBe(true);
    expect(isDroppedLocalStorageKey("designer.settings")).toBe(false);
    expect(isDroppedLocalStorageKey("swatches")).toBe(false);
    for (const key of Object.values(LocalStorageKeys)) {
      expect(DROPPED_LOCAL_STORAGE_KEYS).not.toContain(key);
    }
  });
});
