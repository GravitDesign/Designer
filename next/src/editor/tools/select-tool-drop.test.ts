// Drops at the end of a select tool move: onto another page in the
// multi-page view (with linked elements going along), pages onto pages,
// and images into an image grid.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ElementData } from "../../engine/paint/element-data.ts";
import type { Element } from "../../engine/scene/element.ts";
import { ImageGrid } from "../../engine/scene/image-grid.ts";
import { Image } from "../../engine/scene/image.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorOptions } from "../editor-options.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PageEditor } from "../element-editors/page-editor.ts";
import { installFakeDom, runAllFrames } from "../view/testing/fake-dom.ts";
import { SelectTool } from "./select-tool.ts";
import { applyMoveDrop } from "./select/drop-apply.ts";
import { clearModifiers, Input, rect, setupTool } from "./select/testing.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

// The trf property comes with the Transform mixin, not typed on Node.
const trf = (node: Node): number[] =>
  (node as unknown as { getProperty(n: string): Transform }).getProperty("trf").getMatrix();

/**
 * Three 200 x 200 pages side by side in the multi-page view (page 2 at
 * x 222, page 3 at x 444), scene (0, 0) at view (0, 100).
 */
function multiPage() {
  const s = setupTool(new SelectTool());
  const input = new Input(s.view);
  const page1 = s.scene.getActivePage() as Page;
  page1.setProperties(["w", "h"], [200, 200]);
  const page2 = s.scene.insertPage();
  const page3 = s.scene.insertPage();
  s.view.getViewConfiguration().multiPageView = true;
  s.view.transform(0, -100, 1);
  runAllFrames();
  return { ...s, input, page1, page2, page3 };
}

describe("SelectTool drop onto another page", () => {
  it("hovering an empty spot of a page in the multi-page view finds nothing", () => {
    // The multi-page hit test returns the bare page there; the old code
    // checked the hit itself for a page, not the hit's element.
    const { page2, tool, input } = multiPage();
    input.move(300, 250);
    expect(tool._elementUnderMouse).toBeNull();
    expect(page2.hasFlag(NodeFlag.Highlighted)).toBe(false);
  });

  it("moves the element into the page under the pointer, keeping its scene position", async () => {
    const { page1, page2, editor, tool, input } = multiPage();
    const a = rect(page1, 20, 20, 50, 50);
    input.down(40, 140);
    input.drag(41, 140);
    vi.advanceTimersByTime(40);
    input.drag(150, 140);
    input.drag(300, 140);
    expect(tool._itemsToAddToPage?.map((c) => [c.source, c.target])).toEqual([[a, page2]]);
    // The image mask cleanup right after it clears the page's highlight;
    // see "Page drop targets lose their highlight at once" in QUESTIONS.md.
    expect(page2.hasFlag(NodeFlag.Highlighted)).toBe(false);
    await input.up(300, 140);
    expect(a.getParent()).toBe(page2);
    // Moved by 260 to scene x 280..330, which is 58..108 on page 2 (at 222).
    expect(trf(a)).toEqual([25, 0, 0, 25, 83, 45]);
    expect(editor.getUndoStateName()).toBe("Transform Selection & Move to Page");
    expect(editor.getSelection()).toEqual([a]);
    expect(page2.hasFlag(NodeFlag.Highlighted)).toBe(false);
    expect(tool._itemsToAddToPage).toBeNull();
    // One undo step puts it back.
    editor.undoState();
    expect(a.getParent()).toBe(page1);
    expect(trf(a)).toEqual([25, 0, 0, 25, 45, 45]);
  });

  it("takes along the elements the dragged one is linked to", async () => {
    const { page1, page2, scene, tool, input } = multiPage();
    const a = rect(page1, 20, 20, 50, 50);
    const text = new Text();
    text.setProperty("trf", new Transform(1, 0, 0, 1, 20, 120));
    page1.appendChild(text);
    scene.link(text as never, a as never);
    input.down(40, 140);
    input.drag(41, 140);
    vi.advanceTimersByTime(40);
    input.drag(150, 140);
    input.drag(300, 140);
    expect(tool._itemsToAddToPage?.map((c) => [c.source, c.target])).toEqual([
      [a, page2],
      [text, page2],
    ]);
    await input.up(300, 140);
    expect(a.getParent()).toBe(page2);
    expect(text.getParent()).toBe(page2);
  });

  it("leaves the master behind when a symbol instance is dragged", async () => {
    // The instance is linked to its master, but symbols linked to a
    // dragged symbol don't go along.
    const { page1, page2, tool, input } = multiPage();
    const a = rect(page1, 20, 20, 50, 50);
    const master = Symbol.create([a], page1 as never, "Badge");
    const instance = master.clone() as Symbol;
    page1.appendChild(instance);
    instance.transform(new Transform(1, 0, 0, 1, 0, 100));
    input.down(40, 240);
    input.drag(41, 240);
    vi.advanceTimersByTime(40);
    input.drag(150, 240);
    input.drag(300, 240);
    expect(tool._itemsToAddToPage?.map((c) => [c.source, c.target])).toEqual([[instance, page2]]);
    await input.up(300, 240);
    expect(instance.getParent()).toBe(page2);
    expect(master.getParent()).toBe(page1);
  });
});

describe("SelectTool drop of pages onto pages", () => {
  const collision = EditorOptions.pageCollisionTransform;
  const switchOrder = PageEditor.SWITCH_ORDER;
  afterEach(() => {
    EditorOptions.pageCollisionTransform = collision;
    PageEditor.SWITCH_ORDER = switchOrder;
  });

  /** Page 2 dropped on page 1, as collectDropTargets leaves it. */
  function dropPage2OnPage1() {
    const s = multiPage();
    s.editor.updateSelection(false, [s.page2]);
    s.tool._mode = SelectTool._Mode.Moving;
    s.tool._itemsToAddToPage = [
      { source: s.page2 as Element, target: s.page1 as Element, sourceBox: new Rect(0, 0, 1, 1) },
    ];
    const update = vi.spyOn(s.scene, "beginUpdate");
    const endUpdate = vi.spyOn(s.scene, "endUpdate");
    const blockStart = vi.spyOn(s.scene, "startBlockReferenceChanges");
    const blockEnd = vi.spyOn(s.scene, "endBlockReferenceChanges");
    applyMoveDrop(s.tool, new MouseEvent.Release());
    return { ...s, update, endUpdate, blockStart, blockEnd };
  }

  it("swaps the pages with GPageEditor.SWITCH_ORDER", () => {
    EditorOptions.pageCollisionTransform = true;
    PageEditor.SWITCH_ORDER = true;
    const { scene, page1, page2, page3, editor, update, endUpdate, blockStart, blockEnd } =
      dropPage2OnPage1();
    expect(scene.getChildren().filter((c) => c === page1 || c === page2 || c === page3)).toEqual([
      page2,
      page1,
      page3,
    ]);
    expect(editor.getUndoStateName()).toBe("Transform Selection & Switch Pages");
    expect(editor.getSelection()).toEqual([page2]);
    expect([update.mock.calls.length, endUpdate.mock.calls.length]).toEqual([1, 1]);
    expect([blockStart.mock.calls.length, blockEnd.mock.calls.length]).toEqual([1, 1]);
  });

  it("removes the dropped page without SWITCH_ORDER (the old default)", () => {
    // See "Pages dropped on pages are removed" in QUESTIONS.md.
    EditorOptions.pageCollisionTransform = true;
    const { scene, page1, page2, page3, editor } = dropPage2OnPage1();
    expect(scene.getChildren().filter((c) => c === page1 || c === page2 || c === page3)).toEqual([
      page1,
      page3,
    ]);
    expect(page2.getParent()).toBeNull();
    expect(editor.getUndoStateName()).toBe("Transform Selection & Switch Pages");
  });

  it("leaves pages out of the drop targets without pageCollisionTransform (the default)", () => {
    const { page1, page2, tool, editor } = multiPage();
    editor.updateSelection(false, [page2]);
    // Page 1 large enough to hold page 2's box.
    vi.spyOn(page1, "getGeometryBBox").mockReturnValue(new Rect(-1000, -1000, 3000, 3000));
    const gather = (): unknown[] =>
      tool
        ._gatherItemsForAdd(
          () => true,
          (element) => element === page1,
          (visit) => visit(page1 as Element),
          null,
        )
        .map((c) => [c.source, c.target]);
    expect(EditorOptions.pageCollisionTransform).toBe(false);
    expect(gather()).toEqual([]);
    EditorOptions.pageCollisionTransform = true;
    expect(gather()).toEqual([[page2, page1]]);
  });
});

describe("SelectTool drop into an image grid", () => {
  it("puts a dragged image into the grid with its box on the page", async () => {
    const { page2, editor, tool, input } = multiPage();
    const grid = new ImageGrid(true);
    grid.setProperty("trf", new Transform(100, 0, 0, 100, 100, 100));
    page2.appendChild(grid);
    const image = new Image();
    image.setProperty("trf", new Transform(0.4, 0, 0, 0.4, 0, 0));
    page2.appendChild(image);
    // No bitmap in the fake DOM: let the image take the hit.
    vi.spyOn(image, "_detailHitTest").mockImplementation(
      () => new ElementData(image as never, null),
    );
    const addImage = vi.spyOn(grid, "addImage");
    // The image (page 2 at x 222) covers view 222..262 x 100..140; the
    // drag puts it at 130..170 on the page, inside the grid's box.
    input.down(240, 120);
    input.drag(241, 120);
    vi.advanceTimersByTime(40);
    input.drag(300, 200);
    input.drag(370, 250);
    const candidates = tool._itemsToAddToImageMask as NonNullable<
      typeof tool._itemsToAddToImageMask
    >;
    expect(candidates.map((c) => [c.source, c.target])).toEqual([[image, grid]]);
    expect(grid.hasFlag(NodeFlag.Highlighted)).toBe(true);
    // The source box is the image's editor box moved by page 2's position.
    const own = ElementEditor.getEditor<ElementEditor>(image)?.getBBox(new Transform()) as Rect;
    const sourceBox = (candidates[0] as { sourceBox: Rect }).sourceBox;
    expect(sourceBox).toEqual(new Transform(1, 0, 0, 1, 222, 0).mapRect(own));
    await input.up(370, 250);
    expect(addImage.mock.calls).toEqual([[image, sourceBox]]);
    expect(tool._itemsToAddToImageMask).toBeNull();
    expect(image.getParent()?.getParent()).toBe(grid);
    expect(editor.getSelection()).toEqual([grid]);
    expect(editor.getUndoStateName()).toBe("Create image mask");
  });
});
