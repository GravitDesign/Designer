/**
 * The transform panel (old module 1660) on the fake DOM with a real scene
 * and editor: _applyTransformation (old 161340-161490), the keep-ratio
 * link (160982-161059), Enter formatting (161311-161339) and the
 * desktop/touch switch (161280-161286).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Node } from "../../engine/scene/node.ts";
import { Transform } from "../../engine/math/transform.ts";
import "../../editor/index.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { Document } from "../document/document.ts";
import { fire, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { InputBox } from "../widgets/input-box.ts";
import { setPivotValue } from "../widgets/pivot.ts";
import { installPaintTestDom, type PaintTestDom } from "./paint-dom.testing.ts";
import { TransformProperties } from "./transform-properties.ts";

let t: PaintTestDom;
let touch = false;

beforeEach(() => {
  touch = false;
  t = installPaintTestDom({ isTouchEnabled: () => touch });
});

afterEach(() => {
  t.uninstall();
});

interface Setup {
  scene: Scene;
  page: Page;
  editor: Editor;
  document: Document;
  commits: string[];
}

function setup(): Setup {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const editor = new Editor(scene);
  const commits: string[] = [];
  const commit = editor.commitTransaction.bind(editor);
  vi.spyOn(editor, "commitTransaction").mockImplementation((name?: unknown, ...rest) => {
    commits.push(String(name));
    return commit(name as string, ...(rest as []));
  });
  const document = { getScene: () => scene, getEditor: () => editor } as unknown as Document;
  return { scene, page, editor, document, commits };
}

/** A 100 x 50 rectangle at (x, y) on the page. */
function rect(page: Page, x = 0, y = 0): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(50, 0, 0, 25, x + 50, y + 25));
  (page as unknown as ContainerApi).appendChild(r);
  return r;
}

function panel(
  document: Document,
  elements: Node[],
): {
  properties: TransformProperties;
  root: FakeElement;
  set(property: string, value: string): void;
  get(property: string): string;
} {
  const root = t.dom.document.createElement("div");
  const toolbar = t.dom.document.createElement("div");
  const properties = new TransformProperties();
  properties.init(root as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  expect(properties.update(document, elements)).toBe(true);
  const box = (property: string, scope: FakeElement = root) => {
    const holder = touch
      ? (properties._copiesAndApplyTouch as unknown as FakeElement)
      : (properties._copiesAndApply as unknown as FakeElement);
    const within = property === "copies" ? holder : scope;
    const input = within.querySelector(`[data-property="${property}"]`);
    return InputBox.of(input as unknown as HTMLInputElement) as InputBox;
  };
  return {
    properties,
    root,
    set: (property, value) => {
      box(property).value(value);
    },
    get: (property) => box(property).value(),
  };
}

const bbox = (node: Rectangle) => {
  const b = node.getGeometryBBox();
  return b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()].map((v) => +v.toFixed(6)) : null;
};

describe("TransformProperties._applyTransformation", () => {
  it("moves, scales and rotates one element around the centre in one transaction", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    p.set("move-x", "10");
    p.set("scale-x", "200");
    p.properties._applyTransformation();
    // Move 10, then scale x by 2 around the centre of the box before the
    // move (50, 25): x' = 2x - 50.
    expect(bbox(r)).toEqual([-30, 0, 200, 50]);
    expect(s.commits).toEqual(["Apply Transformation"]);
    expect(s.page.getChildren()).toHaveLength(1);
  });

  it("puts copies after the element, each one step further, and selects the last copy", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const after = rect(s.page, 500, 0);
    r.setFlag(Node.Flag.Selected as number);
    const p = panel(s.document, [r]);
    p.set("copies", "2");
    p.set("move-x", "10");
    p.properties._applyTransformation();
    const children = s.page.getChildren() as Rectangle[];
    expect(children).toHaveLength(4);
    expect(children[0]).toBe(r);
    expect(children[3]).toBe(after);
    // The original is step 0 (no move); the copies are steps 1 and 2.
    expect(children.slice(0, 3).map((c) => bbox(c))).toEqual([
      [0, 0, 100, 50],
      [10, 0, 100, 50],
      [20, 0, 100, 50],
    ]);
    expect(children.map((c) => c.hasFlag(Node.Flag.Selected as number))).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(s.commits).toEqual(["Apply Transformation"]);
  });

  it("scales step i by scale + (scale - 1) * (i - 1), so the original keeps its size", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    p.set("copies", "2");
    p.set("scale-x", "150");
    p.properties._applyTransformation();
    const [original, first, second] = s.page.getChildren() as Rectangle[];
    // Around the centre (50, 25): step 0 gets 1, step 1 gets 1.5, step 2 gets 2.
    expect(bbox(original as Rectangle)).toEqual([0, 0, 100, 50]);
    expect(bbox(first as Rectangle)).toEqual([-25, 0, 150, 50]);
    expect(bbox(second as Rectangle)).toEqual([-50, 0, 200, 50]);
  });

  it("reflects only the odd steps", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    p.set("copies", "2");
    p.set("reflect", "90");
    p.properties._applyTransformation();
    const [step0, step1, step2] = (s.page.getChildren() as Rectangle[]).map((c) =>
      (c.getProperty("trf") as Transform).getMatrix().map((v) => +v.toFixed(6) || 0),
    );
    expect(step0).toEqual([50, 0, 0, 25, 50, 25]);
    expect(step2).toEqual([50, 0, 0, 25, 50, 25]);
    // Mirrored on the vertical axis through the centre (50, 25).
    expect(step1).toEqual([-50, 0, 0, 25, 50, 25]);
  });

  it("ignores a skew of 90 degrees or more", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    p.set("skew-x", "90");
    p.properties._applyTransformation();
    expect(bbox(r)).toEqual([0, 0, 100, 50]);
    p.set("skew-x", "45");
    p.properties._applyTransformation();
    expect(bbox(r)).not.toEqual([0, 0, 100, 50]);
  });

  it("does nothing without a pivot, but still runs the transaction", () => {
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    const pivot = (p.properties._copiesAndApply as unknown as FakeElement).querySelector(
      '[data-property="pivot"]',
    ) as unknown as HTMLElement;
    setPivotValue(pivot, null);
    p.set("move-x", "10");
    p.properties._applyTransformation();
    expect(bbox(r)).toEqual([0, 0, 100, 50]);
    expect(s.commits).toEqual(["Apply Transformation"]);
  });

  it("transforms around the united box of several elements", () => {
    const s = setup();
    const a = rect(s.page, 0, 0);
    const b = rect(s.page, 100, 50);
    const p = panel(s.document, [a, b]);
    const pivot = (p.properties._copiesAndApply as unknown as FakeElement).querySelector(
      '[data-property="pivot"]',
    ) as unknown as HTMLElement;
    setPivotValue(pivot, "tl");
    p.set("scale-x", "50");
    p.set("scale-y", "50");
    p.properties._applyTransformation();
    expect(bbox(a)).toEqual([0, 0, 50, 25]);
    expect(bbox(b)).toEqual([50, 25, 50, 25]);
  });

  it("reads copies and pivot from the touch block in touch mode", () => {
    touch = true;
    const s = setup();
    const r = rect(s.page, 0, 0);
    const p = panel(s.document, [r]);
    // The desktop block's copies stay 0; the touch block asks for one copy.
    p.set("copies", "1");
    p.set("move-x", "10");
    p.properties._applyTransformation();
    expect(s.page.getChildren()).toHaveLength(2);
  });
});

describe("TransformProperties inputs", () => {
  it("rescales the other box to one decimal when the ratio is linked", () => {
    const s = setup();
    const p = panel(s.document, [rect(s.page)]);
    const link = p.root.querySelector(".transform-scale-link") as FakeElement;
    fire(link, "click");
    expect(link.getAttribute("data-ratio")).toBe("yes");
    p.set("scale-x", "200");
    fire(p.root.querySelector('[data-property="scale-x"]'), "change");
    expect(p.get("scale-y")).toBe("200.0");
    p.set("scale-y", "300");
    fire(p.root.querySelector('[data-property="scale-y"]'), "change");
    // Factor 300 / 100 (the last y the panel saw) on x = 200.
    expect(p.get("scale-x")).toBe("600.0");
    fire(link, "click");
    p.set("scale-x", "100");
    fire(p.root.querySelector('[data-property="scale-x"]'), "change");
    expect(p.get("scale-y")).toBe("300");
  });

  it("formats the move boxes on Enter and turns negative values into 0", () => {
    const s = setup();
    const p = panel(s.document, [rect(s.page)]);
    p.set("move-x", "12.345");
    p.set("move-y", "-10");
    fire(p.root.querySelector('[data-property="move-x"]'), "keydown", { keyCode: 13 });
    // The scene's optimal decimals count (1 for the default px unit).
    expect(s.scene.getOptimalDecimalsCount()).toBe(1);
    expect(p.get("move-x")).toBe("12.3");
    // See "Transform panel Enter turns negative moves into 0" in QUESTIONS.md.
    expect(p.get("move-y")).toBe("0");
    p.set("move-x", "7.5");
    fire(p.root.querySelector('[data-property="move-x"]'), "keydown", { keyCode: 65 });
    expect(p.get("move-x")).toBe("7.5");
  });

  it("shows the desktop or the touch block", () => {
    const s = setup();
    const p = panel(s.document, [rect(s.page)]);
    const desktop = p.properties._copiesAndApply as unknown as FakeElement;
    const mobile = p.properties._copiesAndApplyTouch as unknown as FakeElement;
    expect([desktop.style.display, mobile.style.display]).toEqual(["block", "none"]);
    touch = true;
    p.properties.update(s.document, [rect(s.page)]);
    expect([desktop.style.display, mobile.style.display]).toEqual(["none", "block"]);
  });
});
