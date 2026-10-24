import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { normalizeDocument, type Json } from "../../../parity/support/normalize.ts";
import { CMYKColor } from "../color/cmyk-color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId } from "../core/object.ts";
import { lookupOldTypeId } from "../core/type-ids.ts";
import { ArrowAnnotation } from "../scene/annotations/arrow-annotation.ts";
import { CommentAnnotation } from "../scene/annotations/comment-annotation.ts";
import { EllipseAnnotation } from "../scene/annotations/ellipse-annotation.ts";
import { HighlighterAnnotation } from "../scene/annotations/highlighter-annotation.ts";
import { PencilAnnotation } from "../scene/annotations/pencil-annotation.ts";
import { RectangleAnnotation } from "../scene/annotations/rectangle-annotation.ts";
import { TextAnnotation } from "../scene/annotations/text-annotation.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { Container } from "../scene/node-container.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { SceneNode } from "../scene/scene-node.ts";
import { Store } from "../scene/node-store.ts";
import { Text } from "../text/text.ts";
import { DEFAULT_STYLE_CLASSES, DEFAULT_STYLE_NAMES, DefaultStyles } from "./default-styles.ts";
import type { FillPaintLayer } from "./fill-paint-layer.ts";
import type { Style } from "./style.ts";

/** Stands in for GScene, which validateInsertion only checks by name. */
class FakeScene extends Store(Container(SceneNode)) {
  static {
    registerNodeClass(this, "scene", "GTestDefaultStylesScene");
  }
}

const recorded = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/styles/default-styles.json"), "utf8"),
) as { styles: Json };

const styles = (container: DefaultStyles) => container.getChildren() as unknown as Style[];

describe("DefaultStyles", () => {
  it("creates the default styles the old app saved, in class order", () => {
    const container = new DefaultStyles();
    // In a document every style got its reference id from the workspace.
    for (const style of styles(container)) style.getReferenceId();
    const blob = JSON.parse(Node.serialize(container) as string) as Json;
    expect(normalizeDocument(blob)).toEqual(recorded.styles);
    expect(styles(container).map((s) => s.getProperty("name"))).toEqual(
      DEFAULT_STYLE_CLASSES.map((c) => DEFAULT_STYLE_NAMES[c]),
    );
  });

  it("stores the element class type ids in _sdf", () => {
    const [shape, text, rectangle] = styles(new DefaultStyles());
    expect(shape?.getProperty("_sdf")).toBe(94);
    expect(text?.getProperty("_sdf")).toBe(getTypeId(Text));
    expect(rectangle?.getProperty("_sdf")).toBe(getTypeId(Rectangle));
  });

  it("gives the annotation defaults their live class ids, which match the old table", () => {
    // The old module imported these classes; this one finds them by name
    // once registered and falls back to the table, so the two must agree.
    const classes: Record<string, object> = {
      GTextAnnotation: TextAnnotation,
      GRectangleAnnotation: RectangleAnnotation,
      GEllipseAnnotation: EllipseAnnotation,
      GPencilAnnotation: PencilAnnotation,
      GHighlighterAnnotation: HighlighterAnnotation,
      GArrowAnnotation: ArrowAnnotation,
      GCommentAnnotation: CommentAnnotation,
    };
    const list = styles(new DefaultStyles());
    for (const [oldName, cls] of Object.entries(classes)) {
      const style = list[DEFAULT_STYLE_CLASSES.indexOf(oldName)] as Style;
      expect(style.getProperty("_sdf")).toBe(getTypeId(cls));
      expect(getTypeId(cls)).toBe(lookupOldTypeId(oldName));
    }
  });

  it("repairSdf restores ids and adds missing defaults at the end", () => {
    const container = new DefaultStyles();
    const list = styles(container);
    const rectangle = list[2] as Style;
    (rectangle as unknown as { $_sdf: unknown }).$_sdf = 1;
    container.removeChild(list[0] as Style);
    container.removeChild(list[14] as Style);
    container.repairSdf();
    const names = styles(container).map((s) => s.getProperty("name"));
    expect(names.slice(-2)).toEqual(["Shape Default", "Comment annotation default"]);
    expect(names.length).toBe(15);
    expect(rectangle.getProperty("_sdf")).toBe(getTypeId(Rectangle));
  });

  it("converts paint layer colors to a color mode", () => {
    const container = new DefaultStyles();
    container.setColorMode("CMYK");
    const layer = (styles(container)[2] as Style).getPaintLayers()?.getFirstChild() as
      FillPaintLayer | undefined;
    expect(layer?.getProperty("_pt")).toBeInstanceOf(CMYKColor);
    container.setColorMode("RGB");
    expect(layer?.getProperty("_pt")).toBeInstanceOf(RGBColor);
  });

  it("only goes into a scene and empties itself before a restore", () => {
    const container = new DefaultStyles();
    expect(container.validateInsertion(new FakeScene() as unknown as never)).toBe(true);
    expect(container.validateInsertion(new DefaultStyles() as unknown as never)).toBe(false);
    container._handleChange(NodeChange.PrepareRestore, { blob: {} });
    expect(container.getFirstChild()).toBeNull();
  });
});
