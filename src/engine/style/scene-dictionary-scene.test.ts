import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Platform, WebBrowser } from "../core/platform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { Group } from "../scene/group.ts";
import { Image } from "../scene/image.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { Scene } from "../scene/scene.ts";
import { Workspace } from "../scene/workspace.ts";
import { probeSceneDictionary } from "./scene-dictionary-probe.ts";
import { Stylable } from "./stylable.ts";
import { Swatch } from "./swatch.ts";
import { TexturePattern } from "./texture-pattern.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** Recorded from the old app with scene-dictionary-probe.ts (GSceneDictionary, module 658). */
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-scene-dictionary.json"), "utf8"),
) as Record<string, unknown>;

let actual: Record<string, unknown>;
let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
  Platform.setWebBrowser(WebBrowser.Chrome);
  actual = probeSceneDictionary({
    Scene,
    Workspace,
    Image,
    Rectangle,
    Group,
    Stylable,
    TexturePattern,
    Swatch,
  });
});
afterAll(() => uninstall());

describe("GSceneDictionary in a scene, against the old engine", () => {
  // flush drops the unused entry from the map inside _updateReferences,
  // so its second loop never sees it and the dropped canvas's memory is
  // not given back (kept).
  it("flushes entries nothing uses", () => {
    expect(actual.flush).toEqual(expected.flush);
  });

  it("releases every entry and stops following the scene", () => {
    expect(actual.release).toEqual(expected.release);
  });

  it("redirects texture fills to dictionary urls and counts them", () => {
    expect(actual.texture).toEqual(expected.texture);
  });

  it("drops only the removed node's own references", () => {
    expect(actual.groupRemove).toEqual(expected.groupRemove);
  });

  // A texture swatch gets an entry on insert but keeps its plain url, so
  // the next flush drops that entry (kept).
  it("counts swatches with dictionary urls", () => {
    expect(actual.swatch).toEqual(expected.swatch);
  });

  it("answers file, http and data urls directly and asks the workspace again for cloud ids", () => {
    expect(actual.resolve).toEqual(expected.resolve);
  });

  it("recreates a texture fill's missing entry from its raw url", () => {
    expect(actual.sanitizeTexture).toEqual(expected.sanitizeTexture);
  });
});
