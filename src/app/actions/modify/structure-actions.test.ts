import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Group } from "../../../engine/scene/group.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { Rectangle } from "../../../engine/scene/rectangle.ts";
import { OverlayEffect } from "../../../engine/style/effects/overlay-effect.ts";
import type { Effects } from "../../../engine/style/effects.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { Editor } from "../../../editor/editor.ts";
import "../../../editor/element-editors/group-editor.ts";
import { layersOf, rect, setupDesigner, type Fixture } from "../actions.testing.ts";
import { props, setActionDesigner } from "../host.ts";
import { AlignAction } from "./align-action.ts";
import { ArrangeAction } from "./arrange-action.ts";
import { ClipAction } from "./clip-action.ts";
import { DistributeAction } from "./distribute-action.ts";
import { GroupAction } from "./group-action.ts";
import { MaskWithShapeAction } from "./mask-with-shape-action.ts";
import { SplitAction } from "./split-action.ts";
import { TransformAction } from "./transform-action.ts";

let fixture: Fixture;

function insert(nodes: Node[], selected: Node[] = nodes): void {
  fixture.editor.insertElements(nodes, true);
  fixture.editor.updateSelection(false, selected);
}

function names(nodes: readonly Node[] | null): unknown[] {
  return (nodes || []).map((node) => props(node).getProperty("name"));
}

function box(node: Node): number[] {
  const r = (node as Rectangle).getGeometryBBox() as Rect;
  return [r.getX(), r.getY(), r.getWidth(), r.getHeight()].map((v) => Math.round(v * 1000) / 1000);
}

beforeEach(() => {
  fixture = setupDesigner();
});

afterEach(() => {
  setActionDesigner(null);
});

describe("Group and Ungroup", () => {
  it("groups the selection where its last element was and selects the group", () => {
    const a = rect("A", 0, 0);
    const b = rect("B", 20, 0);
    const c = rect("C", 40, 0);
    insert([a, b, c], [a, b]);
    const action = new GroupAction();
    expect(action.getId()).toBe("modify.group");
    expect(action.isEnabled()).toBe(true);
    action.execute();
    const group = (fixture.editor.getSelection() as Node[])[0] as Group;
    expect(group).toBeInstanceOf(Group);
    expect(names(group.getChildren())).toEqual(["A", "B"]);
    expect(group.getNext()).toBe(c);
    expect(fixture.editor.getUndoStateName()).toBe("Group Selection");
  });

  it("puts a group's children back in its place", () => {
    const a = rect("A", 0, 0);
    const b = rect("B", 20, 0);
    insert([a, b]);
    new GroupAction().execute();
    const group = (fixture.editor.getSelection() as Node[])[0] as Group;
    const parent = group.getParent();
    const split = new SplitAction();
    expect(split.isEnabled()).toBe(true);
    split.execute();
    expect(group.getParent()).toBe(null);
    expect(a.getParent()).toBe(parent);
    expect(names(fixture.editor.getSelection())).toEqual(["A", "B"]);
    expect(fixture.editor.getUndoStateName()).toBe("Ungroup Selection");
  });

  it("is not enabled for plain shapes", () => {
    insert([rect("A", 0, 0)]);
    expect(new SplitAction().isEnabled()).toBe(false);
  });
});

describe("Clip and Mask", () => {
  it("clips with the bottom element and leaves elements outside its box alone", () => {
    const base = rect("Base", 0, 0, 50, 50);
    const inside = rect("In", 10, 10);
    const outside = rect("Out", 200, 200);
    insert([base, inside, outside]);
    new ClipAction().execute();
    expect(names(base.getChildren())).toEqual(["In"]);
    expect(outside.getParent()).not.toBe(base);
    expect(names(fixture.editor.getSelection())).toEqual(["Base"]);
    expect(fixture.editor.getUndoStateName()).toBe("Clip Selection");
  });

  it("masks with the top element and turns a black and white gradient into an overlay", () => {
    const content = rect("Content", 0, 0, 50, 50);
    const mask = rect("Shape", 10, 10, 20, 20);
    insert([content, mask]);
    const layers = layersOf(mask);
    for (const layer of layers.getChildren().slice()) layers.removeChild(layer);
    const fill = new FillPaintLayer();
    fill.setProperty(
      "_pt",
      new LinearGradient([
        { position: 0, color: new RGBColor([0, 0, 0]), opacity: 1 },
        { position: 1, color: new RGBColor([255, 255, 255]), opacity: 1 },
      ]),
    );
    layers.appendChild(fill);
    new MaskWithShapeAction().execute();
    expect((fixture.editor.getSelection() as Node[])[0]).toBe(mask);
    expect(mask.getProperty("name")).toBe("Mask");
    expect(names(mask.getChildren())).toEqual(["Content"]);
    const fills = layers.getChildren().filter((l) => l instanceof FillPaintLayer);
    expect(fills.length).toBe(1);
    expect(String((fills[0] as FillPaintLayer).getProperty("_pt"))).toBe(String(RGBColor.WHITE));
    const overlay = (mask.getEffects() as Effects).getFirstChild() as OverlayEffect;
    expect(overlay).toBeInstanceOf(OverlayEffect);
    const stops = (overlay.getProperty("pat") as LinearGradient).getStops();
    expect(stops.map((s) => s.opacity)).toEqual([1, 0]);
    expect(fixture.editor.getUndoStates().length).toBe(2);
  });
});

describe("Align, distribute, arrange and transform", () => {
  it("aligns the selection to its left edge", () => {
    const a = rect("A", 0, 0);
    const b = rect("B", 30, 20, 20, 20);
    insert([a, b]);
    const action = new AlignAction(Editor.ArrangeAlignType.AlignLeft);
    expect(action.getId()).toBe("arrange.align.align-left");
    expect(action.getGroup()).toBe("arrange/align-horizontal");
    expect(action.getShortcutHint()).toBe("Alt+A");
    action.execute();
    expect(box(b)[0]).toBe(0);
  });

  it("distributes three elements with equal gaps", () => {
    const a = rect("A", 0, 0);
    const b = rect("B", 15, 0);
    const c = rect("C", 100, 0);
    insert([a, b, c]);
    const action = new DistributeAction(DistributeAction.Type.Horizontal);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect([box(a)[0], box(b)[0], box(c)[0]]).toEqual([0, 50, 100]);
  });

  it("needs three elements to distribute without an area", () => {
    insert([rect("A", 0, 0), rect("B", 50, 0)]);
    const action = new DistributeAction(DistributeAction.Type.Vertical);
    expect(action.isEnabled()).toBe(false);
    expect(action.isEnabled(null, null, 5)).toBe(true);
  });

  it("brings the selection forward with Cmd+Up", () => {
    const a = rect("A", 0, 0);
    const b = rect("B", 5, 5);
    insert([a, b], [a]);
    const action = new ArrangeAction(Editor.ArrangeOrderType.BringForward);
    expect(action.getId()).toBe("arrange.order.bring-forward");
    expect(action.getShortcutHint()).toBe("Ctrl+Up");
    action.execute();
    expect(b.getNext()).toBe(a);
  });

  it("rotates around the centre of the selection", () => {
    const a = rect("A", 0, 0, 40, 20);
    insert([a]);
    const action = new TransformAction(TransformAction.Type.Rotate90Right);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(box(a)).toEqual([10, -10, 20, 40]);
    expect(fixture.editor.getUndoStateName()).toBe("Rotate 90° Right");
  });
});
