import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { Document } from "../document/document.ts";
import { appExportHost } from "./export-document.ts";
import { ExportDialog, type ExportDialogSettings } from "./export-dialog.ts";

/**
 * A dialog without its DOM: the decisions the old dialog made from its
 * settings and mode, on a bare instance (the DOM build is covered by the
 * import-export/ui parity scenarios).
 */
function bare(settings: Partial<ExportDialogSettings>, mode = "canvas"): ExportDialog {
  const dialog = Object.create(ExportDialog.prototype) as ExportDialog;
  dialog._settings = {
    size: "1x",
    format: "png",
    jpegQuality: 92,
    backgroundColor: null,
    backgroundOpacity: 1,
    chooserColor: null,
    chooserOpacity: 1,
    convertTextToPath: false,
    decimalPlacesPrecision: 3,
    configuration: {
      ignoreEffects: false,
      forceEffectsWhenZoomed: true,
      sceneBackground: true,
      isOutline: () => false,
    },
    preserveEditingCapabilities: false,
    layerNamesAsId: false,
    downsampleImages: false,
    background: "page-background",
    ...settings,
  };
  dialog._activeMode = mode as ExportDialog["_activeMode"];
  dialog._document = null;
  dialog._options = null;
  const container = { querySelector: () => null, querySelectorAll: () => [] };
  dialog._settingsContainer = container as unknown as HTMLElement;
  dialog._previewContainer = container as unknown as HTMLElement;
  return dialog;
}

describe("ExportDialog settings", () => {
  it("shows size for bitmaps and PDF, quality for JPEG and PDF, format outside assets", () => {
    expect(bare({ format: "svg" })._hasSize()).toBe(false);
    expect(bare({ format: "pdf" })._hasSize()).toBe(true);
    expect(bare({ format: "png" })._hasJpegQuality()).toBe(false);
    expect(bare({ format: "pdf" })._hasJpegQuality()).toBe(true);
    expect(bare({}, "assets")._hasFormat()).toBe(false);
    expect(bare({}, "assets")._hasSize()).toBe(false);
    // selection mode has a background only for bitmaps and PDF
    expect(bare({ format: "svg" }, "selection")._hasBackgroundColor()).toBe(false);
    expect(bare({ format: "svg" }, "canvas")._hasBackgroundColor()).toBe(true);
  });

  it("names the output format: the format, none in assets mode", () => {
    // The old ZIP branch for assets sits behind _hasFormat(), which is
    // false in assets mode, so it never runs.
    expect(bare({}, "assets")._getFormat()).toBeNull();
    expect(bare({ format: "jpg" })._getFormat()).toBe("jpg");
  });

  it("turns PDF size captions into dpi values", () => {
    expect(bare({ format: "pdf" })._formatCaption("Web (96dpi)")).toBe("96dpi");
    expect(bare({ format: "png" })._formatCaption("2x")).toBe("2x");
  });

  it("uses no color without a background, white for JPEG pages, the page itself otherwise", () => {
    const assets = bare({ backgroundColor: RGBColor.WHITE }, "assets");
    assets._updateBackground();
    expect(assets._settings.backgroundColor).toBeNull();
    expect(assets._settings.backgroundOpacity).toBe(0);
    const jpg = bare({ format: "jpg" });
    jpg._updateBackground();
    expect(jpg._settings.backgroundColor).toBe(RGBColor.WHITE);
    expect(jpg._settings.configuration.sceneBackground).toBe(true);
    const transparent = bare({ background: "no-background" });
    transparent._updateBackground();
    expect(transparent._settings.backgroundColor).toBeNull();
    expect(transparent._settings.configuration.sceneBackground).toBe(false);
  });

  it("mixes a custom color with white for JPEG (no chooser: the page color, white without one)", () => {
    const dialog = bare({ format: "jpg", background: "custom-background" });
    dialog._updateBackground();
    expect(dialog._settings.configuration.sceneBackground).toBe(false);
    expect(dialog._settings.backgroundColor).toBeInstanceOf(RGBColor);
    expect((dialog._settings.backgroundColor as RGBColor).getValue()?.slice(0, 3)).toEqual([
      255, 255, 255,
    ]);
    expect(dialog._settings.backgroundOpacity).toBe(1);
  });

  it("sets the pages' background opacity to 0 for canvas bitmaps and puts it back", () => {
    const page = new Page();
    page.setProperty("bop", 0.5);
    const dialog = bare({ format: "png" });
    const list = [{ element: page, format: "png", overrideBackground: true }];
    const saved = dialog._persistOpacities(list);
    expect(page.getProperty("bop")).toBe(0);
    dialog._restoreOpacities(list, saved);
    expect(page.getProperty("bop")).toBe(0.5);
    // SVG keeps the page as it is
    expect(bare({ format: "svg" })._persistOpacities(list)).toEqual([]);
  });

  it("exports the visible pages named after the document in canvas mode", () => {
    const scene = new Scene(new EditorWorkspace());
    for (const child of scene.getChildren().slice()) scene.removeChild(child);
    const first = new Page();
    const hidden = new Page();
    for (const page of [first, hidden]) page.setProperties(["w", "h"], [100, 100]);
    scene.appendChild(first);
    scene.appendChild(hidden);
    hidden.setFlag(ElementFlag.Hidden);
    const dialog = bare({ format: "png", background: "custom-background" });
    dialog._document = { getScene: () => scene, getTitle: () => "Doc" } as unknown as Document;
    const list = dialog._generateExportables();
    expect(list.map((e) => e.element)).toEqual([first]);
    expect(list[0]?.name).toBe("Doc");
    expect(list[0]?.overrideBackground).toBe(true);
  });
});

describe("appExportHost", () => {
  it("keeps the previous host's user and takes the GDocument file types", async () => {
    const host = appExportHost({
      getUserFullName: () => Promise.resolve("Test"),
      getActiveWindowTitle: () => "old",
      getFileTypes: () => [],
    });
    await expect(host.getUserFullName()).resolves.toBe("Test");
    expect(host.getFileTypes().map((t) => t.ext)).toContain("pdf");
    // no designer yet: no window title
    expect(host.getActiveWindowTitle()).toBeNull();
  });
});
