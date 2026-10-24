import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installDocumentPanelsDom,
  type DocumentPanelsDom,
} from "../inspector/document-panels-dom.testing.ts";
import { fake } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";
import { ExportDialog } from "./export-dialog.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("../inspector/color-deps.ts", () => import("../inspector/color-deps.testing.ts"));
// The dialog frame is React; only its content is looked at here.
vi.mock("../dialogs/dialog.ts", () => ({
  Dialog: class {
    open() {}
    close() {}
  },
}));

describe("ExportDialog DOM", () => {
  let env: DocumentPanelsDom;
  beforeEach(() => {
    env = installDocumentPanelsDom();
    setDesigner({
      isTouchEnabled: () => false,
      getSetting: (_n: string, d: unknown) => d,
      addEventListener() {},
      removeEventListener() {},
      getActiveDocument: () => null,
    } as unknown as Designer);
    setContainer({ getStorageDestinations: () => null } as unknown as Parameters<
      typeof setContainer
    >[0]);
  });
  afterEach(() => {
    resetGlobals();
    env.uninstall();
  });

  it("builds the JPEG quality slider and sets it to the quality", () => {
    // Old: the slider was always there; a missing late-module map must not
    // drop it.
    vi.spyOn(ExportDialog.prototype, "_updatePreview").mockImplementation(() => {});
    const dialog = new ExportDialog(null, { jpegQuality: 60 });
    const quality = fake(dialog.getContent()).querySelector(".jpeg-quality");
    const slider = quality ? quality.children[0] : undefined;
    expect(slider?.classList.contains("g-input-slider")).toBe(true);
    expect(slider?.getAttribute("value")).toBe("60");
  });
});
