import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Hardware,
  OperatingSystem,
  System,
  detectHardware,
  detectLanguage,
  detectOperatingSystem,
} from "./system.ts";

/**
 * Recorded from the old bundle: GSystem (vendor module 176) with its own
 * ua-parser-js 0.7.33 (app module 610), loaded in Node with a fake navigator.
 */
const oldHardware = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "__fixtures__/old-hardware.json"),
    "utf8",
  ),
) as { userAgent: string; maxTouchPoints: number; hardware: Hardware }[];

const WIN_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

describe("System", () => {
  it("detects the operating system from platform first, then the user agent", () => {
    expect(detectOperatingSystem({ platform: "Win32", userAgent: WIN_CHROME })).toBe(
      OperatingSystem.Windows,
    );
    expect(detectOperatingSystem({ platform: "MacIntel", userAgent: "" })).toBe(
      OperatingSystem.OSX_IOS,
    );
    expect(detectOperatingSystem({ platform: "", userAgent: "(iPad; CPU OS 17)" })).toBe(
      OperatingSystem.OSX_IOS,
    );
    expect(detectOperatingSystem({ platform: "Linux armv8l", userAgent: "Android 14" })).toBe(
      OperatingSystem.Unix,
    );
    expect(detectOperatingSystem({ platform: "Linux x86_64", userAgent: "X11" })).toBe(
      OperatingSystem.Unix,
    );
    // Unknown platforms count as Windows; no navigator as Unix.
    expect(detectOperatingSystem({ platform: "FreeBSD", userAgent: "" })).toBe(
      OperatingSystem.Windows,
    );
    expect(detectOperatingSystem(undefined)).toBe(OperatingSystem.Unix);
  });

  it("detects tablets and phones", () => {
    expect(detectHardware({ userAgent: WIN_CHROME })).toBe(Hardware.Desktop);
    expect(detectHardware({ userAgent: "Mozilla/5.0 (iPad; CPU OS 12_0)" })).toBe(Hardware.Tablet);
    expect(detectHardware({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" })).toBe(
      Hardware.Phone,
    );
    expect(detectHardware({ userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 5 })).toBe(
      Hardware.Tablet,
    );
    expect(detectHardware({ userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 0 })).toBe(
      Hardware.Desktop,
    );
    expect(detectHardware({ userAgent: "Linux; Android 11; SM-P610 Build" })).toBe(Hardware.Tablet);
    expect(detectHardware(undefined)).toBe(Hardware.Desktop);
  });

  it.each(oldHardware)(
    "classifies $userAgent ($maxTouchPoints touch points) like the old app",
    ({ userAgent, maxTouchPoints, hardware }) => {
      expect(detectHardware({ userAgent, maxTouchPoints })).toBe(hardware);
    },
  );

  it("takes the language before the region", () => {
    expect(detectLanguage({ language: "de-DE" })).toBe("de");
    expect(detectLanguage({ language: "PT" })).toBe("pt");
    expect(detectLanguage({ userLanguage: "fr-CA" })).toBe("fr");
    expect(detectLanguage({})).toBe("");
    expect(detectLanguage(undefined)).toBeNull();
  });

  it("always reports little endian, like the old check", () => {
    expect(System.littleEndian).toBe(true);
    expect(System.OperatingSystem).toBe(OperatingSystem);
    expect(System.Hardware).toBe(Hardware);
  });
});
