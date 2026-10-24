import "../actions/window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import type { Rectangle } from "../../engine/scene/rectangle.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import {
  layersOf,
  rect,
  setupDesigner,
  stubBrowserDocument,
  type Fixture,
} from "../actions/actions.testing.ts";
import { setActionDesigner } from "../actions/host.ts";
import { ClipboardBridge } from "./clipboard-bridge.ts";

let fixture: Fixture;
let bridge: ClipboardBridge;

function fakeElement(): Record<string, unknown> {
  return {
    style: {},
    addEventListener() {},
    appendChild() {},
    blur() {},
    focus() {},
    children: [],
    replaceChildren() {},
  };
}

beforeEach(() => {
  const browser = stubBrowserDocument() as unknown as Record<string, unknown>;
  browser.createElement = () => fakeElement();
  browser.body = fakeElement();
  browser.addEventListener = () => {};
  vi.stubGlobal("navigator", { userAgent: "Chrome" });
  fixture = setupDesigner();
  bridge = new ClipboardBridge();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setActionDesigner(null);
});

const pageChildren = (): Node[] =>
  (fixture.scene.getActivePage() as unknown as { getChildren(): Node[] }).getChildren();

describe("ClipboardBridge", () => {
  it("inserts copied nodes as one undoable paste", () => {
    const data = Node.serialize([rect("copy", 0, 0, 10, 10)]) as string;
    bridge.handlePasteData({ [Node.MIME_TYPE]: data });
    const pasted = pageChildren().filter((node) => node.getNodeName() === "rectangle");
    expect(pasted.map((node) => (node as Rectangle).getProperty("name"))).toEqual(["copy"]);
    expect(fixture.editor.getSelection()).toEqual(pasted);
    expect(fixture.editor.getUndoStateName()).toBe("Paste");
  });

  it("hands the nodes to an assigned callback once instead", () => {
    const received: Node[][] = [];
    bridge.assignCallback((elements) => received.push(elements));
    const data = Node.serialize([rect("copy", 0)]) as string;
    bridge.handlePasteData({ [Node.MIME_TYPE]: data });
    bridge.handlePasteData({ [Node.MIME_TYPE]: data });
    expect(received).toHaveLength(1);
    expect(pageChildren().filter((node) => node.getNodeName() === "rectangle")).toHaveLength(1);
  });

  it("adds a single copied fill layer to every selected element", () => {
    const { editor } = fixture;
    const a = rect("A", 0);
    const b = rect("B", 20);
    editor.insertElements([a, b], true);
    const before = layersOf(a).getChildren().length;
    bridge.handlePasteData({ [Node.MIME_TYPE]: Node.serialize([new FillPaintLayer()]) as string });
    expect(layersOf(a).getChildren().length).toBe(before + 1);
    expect(layersOf(b).getChildren().length).toBe(before + 1);
  });

  it("pastes a copied SVG file (BUG-083)", () => {
    const handled: unknown[] = [];
    const internals = bridge as unknown as {
      _handlePasteData(data: unknown): void;
      _documentPasteEvent(event: unknown): void;
    };
    internals._handlePasteData = (data) => handled.push(data);
    const file = new Blob(["<svg/>"], { type: "image/svg+xml" });
    internals._documentPasteEvent({
      clipboardData: {
        items: [{ type: "image/svg+xml", kind: "file", getAsFile: () => file }],
        getData: () => "",
      },
    });
    expect(handled).toEqual([{ "image/svg+xml": file }]);
  });

  it("does nothing while the annotations sidebar is active", () => {
    (fixture.designer as unknown as Record<string, unknown>).getRightSidebars = () => ({
      getActiveSidebar: () => "annotations",
    });
    expect(bridge.handlePasteData({ [Node.MIME_TYPE]: "[]" })).toBe(false);
  });
});
