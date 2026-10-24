import { afterEach, describe, expect, it } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Length } from "../../engine/math/length.ts";
import type { Document } from "../document/document.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { OpenFileRequest } from "../shell/container.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { LibraryDocument } from "./library-document.ts";

afterEach(() => resetGlobals());

function setup() {
  const calls: unknown[][] = [];
  const page = { setProperties: (n: string[], v: unknown[]) => calls.push(["page", n, v]) };
  const scene = {
    setProperties: (n: string[], v: unknown[]) => calls.push(["scene", n, v]),
    getActivePage: () => page,
  };
  const stats: unknown[][] = [];
  const executed: string[] = [];
  const designer = Object.assign(new EventTarget(), {
    createScene: () => scene,
    stats: (...args: unknown[]) => stats.push(args),
    executeAction: (id: string) => executed.push(id),
  });
  setDesigner(designer as unknown as Designer);
  const document = {
    status: DocumentStatus.Loaded as number,
    title: null as string | null,
    scene: null as unknown,
    fromTemplate: false,
    getStatus() {
      return this.status;
    },
    setTitle(title: string) {
      this.title = title;
    },
    setScene(s: unknown) {
      this.scene = s;
    },
    setDocumentFromTemplate(value: boolean) {
      this.fromTemplate = value;
    },
  };
  return { calls, stats, executed, designer, document, scene };
}

describe("LibraryDocument.handleOpenFileRequest", () => {
  it("builds a preset document: unit, dpi, white page of the preset size", () => {
    const { calls, stats, document, scene, executed, designer } = setup();
    LibraryDocument.handleOpenFileRequest(
      document as unknown as Document,
      new OpenFileRequest(OpenFileRequest.Type.Preset, null),
      {
        presetCategory: "Social Media/Posts",
        presetLayout: { id: "post", name: "Post", unit: "mm", width: 210, height: 297 },
      },
    );
    expect(calls[0]).toEqual(["scene", ["ut", "dpi"], ["mm", Length.DPI]]);
    const [, names, values] = calls[1] as [string, string[], unknown[]];
    expect(names).toEqual(["bck", "w", "h"]);
    expect(values[1]).toBe(new Length(210, "mm").toPoint());
    expect(values[2]).toBe(new Length(297, "mm").toPoint());
    expect(document.title).toBe("post");
    expect(document.scene).toBe(scene);
    expect(document.fromTemplate).toBe(true);
    expect(stats).toEqual([["directlink_preset_social-media-posts", "Post"]]);
    // A preset doesn't wait for the document to fit it.
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, document));
    expect(executed).toEqual([]);
  });

  it("fits other requests once their document is active, unless loading failed", () => {
    const { document, executed, designer } = setup();
    LibraryDocument.handleOpenFileRequest(
      document as unknown as Document,
      new OpenFileRequest(OpenFileRequest.Type.Token, "abc"),
    );
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, {}));
    expect(executed).toEqual([]);
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, document));
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, document));
    expect(executed).toEqual(["view.zoom.fit.all"]);

    const failed = setup();
    failed.document.status = DocumentStatus.LoadFailed;
    LibraryDocument.handleOpenFileRequest(
      failed.document as unknown as Document,
      new OpenFileRequest(OpenFileRequest.Type.Token, "abc"),
    );
    failed.designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, failed.document));
    expect(failed.executed).toEqual([]);
  });
});
