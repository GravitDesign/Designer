import { afterEach, describe, expect, it } from "vitest";
import { Rect } from "../../engine/math/rect.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { setLateModules } from "../shell/late.ts";
import { AlignProperties } from "./align-properties.ts";
import { DimensionProperties } from "./dimension-properties.ts";
import { FrameProperties } from "./frame-properties.ts";
import { GroupFrameProperties } from "./group-frame-properties.ts";
import {
  buildProperties,
  InspectorSidebar,
  pendingProperties,
  PROPERTIES_TABLE,
} from "./inspector-sidebar.ts";
import { ItemProperties } from "./item-properties.ts";
import { Properties, type InspectedElements } from "./properties.ts";
import { TransformProperties } from "./transform-properties.ts";

const AnchorType = Element.Anchor.AnchorType;

/** An element that finds nothing (the panels' DOM is not under test here). */
const emptyPanel = {
  querySelectorAll: () => [],
  querySelector: () => null,
  classList: { add() {}, remove() {}, toggle() {} },
} as unknown as HTMLElement;

function fakeDesigner(): void {
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    getActiveDocument: () => null,
    isTouchEnabled: () => false,
    stats() {},
  } as unknown as Designer);
}

function fakeDocument(log: string[] = []): Document {
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const scene = {
    ...listeners,
    getOptimalDecimalsCount: () => 2,
    pointToString: (v: number) => String(v),
    stringToPoint: (s: string) => parseFloat(s),
    setBorderScale: (on: boolean) => log.push("borders " + on),
    setCornersScale: (on: boolean) => log.push("corners " + on),
  };
  return {
    getScene: () => scene,
    getEditor: () => ({
      ...listeners,
      beginTransaction: () => log.push("begin"),
      commitTransaction: (name: string) => log.push("commit " + name),
      getLinkedElementsInSelection: () => [],
      getEdTransformSettings: () => null,
    }),
  } as unknown as Document;
}

afterEach(() => {
  resetGlobals();
  setLateModules({});
});

describe("the inspector sidebar's panel table", () => {
  it("lists gravit.properties in the old order", () => {
    expect(PROPERTIES_TABLE.map((entry) => entry.name)).toEqual([
      "GDimensionProperties",
      "GAlignProperties",
      "GTransformProperties",
      "GPageProperties",
      "GSceneProperties",
      "GGroupFrameProperties",
      "GFrameProperties",
      "GItemProperties",
      "GPolygonProperties",
      "GPathProperties",
      "GEllipseProperties",
      "GTextProperties",
      "GImageProperties",
      "GRectangleProperties",
      "GSliceProperties",
      "GBoolOpProperties",
      "GSymbolProperties",
      "GAppearanceProperties",
      "fill properties",
      "border properties",
      "GEffectProperties",
    ]);
  });

  it("builds the panels whose files export them and lists the rest as pending", () => {
    class Fake extends Properties {}
    setLateModules({ "inspector/align-properties.ts": { AlignProperties: Fake } });
    const built = buildProperties();
    expect(built).toHaveLength(1);
    expect(built[0]).toBeInstanceOf(Fake);
    expect(pendingProperties()).toHaveLength(PROPERTIES_TABLE.length - 1);
    expect(pendingProperties()[0]).toContain("GDimensionProperties");
  });

  it("groups the appearance panels by their old toString", () => {
    setLateModules({
      "inspector/align-properties.ts": { AlignProperties },
      "inspector/dimension-properties.ts": { DimensionProperties },
    });
    const group = InspectorSidebar.APPEARANCE_PROPERTIES;
    expect(group).toContain("[Object GAlignProperties]");
    expect(group).not.toContain("[Object GDimensionProperties]");
  });

  it("passes the joint type on to the path panel", () => {
    class PathProperties extends Properties {
      types: unknown[] = [];
      assignNodeType(type: unknown) {
        this.types.push(type);
      }
    }
    setLateModules({ "inspector/path-properties.ts": { PathProperties } });
    const sidebar = new InspectorSidebar();
    const path = new PathProperties();
    sidebar._propertyPanels.push({
      panel: emptyPanel,
      toolbar: null,
      divider: emptyPanel,
      properties: path,
    });
    sidebar.setPathPointsNodeType("-");
    expect(path.types).toEqual(["-"]);
  });
});

describe("the frame and group frame panels", () => {
  it("show only when every element is a layer, or a group", () => {
    fakeDesigner();
    const frame = new FrameProperties();
    frame._panel = emptyPanel;
    const groupFrame = new GroupFrameProperties();
    groupFrame._panel = emptyPanel;
    const document = fakeDocument();
    const layer = new Layer();
    const group = new Group();
    expect(frame.update(document, [layer])).toBe(true);
    expect(frame.update(document, [layer, group])).toBe(false);
    expect(frame.update(null, null)).toBe(false);
    expect(groupFrame.update(document, [group])).toBe(true);
    expect(groupFrame.update(document, [layer])).toBe(false);
  });

  it("item properties need an item child in the first element", () => {
    fakeDesigner();
    const item = new ItemProperties();
    item._panel = emptyPanel;
    const document = fakeDocument();
    const group = new Group();
    expect(item.update(document, [group])).toBe(false);
    group.appendChild(new Rectangle());
    expect(item.update(document, [group])).toBe(true);
  });
});

describe("the align and transform panels", () => {
  it("show only in transform mode", () => {
    expect(new AlignProperties().isAvailable(true)).toBe(true);
    expect(new AlignProperties().isAvailable(false)).toBe(false);
    expect(new TransformProperties().isAvailable(false)).toBe(false);
    expect(new Properties().isAvailable(true)).toBe(false);
  });

  it("align needs two transformable elements and no page", () => {
    fakeDesigner();
    const align = new AlignProperties();
    const document = fakeDocument();
    expect(align.update(document, [new Rectangle()])).toBe(false);
    expect(align.update(document, [new Rectangle(), new Rectangle()])).toBe(true);
    expect(align.update(document, [new Rectangle(), new Page()])).toBe(false);
    expect(align.isGroup()).toBe(false);
  });

  it("transform applies its border and corner switches to the scene", () => {
    fakeDesigner();
    const log: string[] = [];
    const transform = new TransformProperties();
    transform._copiesAndApply = { style: { setProperty() {} } } as unknown as HTMLElement;
    transform._copiesAndApplyTouch = transform._copiesAndApply;
    transform._advancedTransformPanel = {
      querySelector: () => ({ checked: true }),
    } as unknown as HTMLElement;
    expect(transform.update(fakeDocument(log), [new Rectangle()])).toBe(true);
    expect(log).toEqual(["borders true", "corners true"]);
  });
});

describe("the dimension panel", () => {
  function dimension(log: string[]): DimensionProperties {
    fakeDesigner();
    const panel = new DimensionProperties();
    panel._panel = emptyPanel;
    panel._document = fakeDocument(log);
    return panel;
  }

  it("toggles anchors as the old buttons did", () => {
    const panel = dimension([]);
    const rect = new Rectangle();
    const layer = new Layer();
    layer.appendChild(rect);
    panel._elements = [rect as never];
    // Start on nothing gives Start; End on Start gives Stretch; Start on
    // Stretch leaves End; Middle replaces anything; the same type again clears.
    expect(panel._defineAnchorProperty("hacr", AnchorType.Start, 0)).toBe(AnchorType.Start);
    expect(panel._defineAnchorProperty("hacr", AnchorType.End, AnchorType.Start)).toBe(
      AnchorType.Stretch,
    );
    expect(panel._defineAnchorProperty("hacr", AnchorType.Start, AnchorType.Stretch)).toBe(
      AnchorType.End,
    );
    expect(panel._defineAnchorProperty("hacr", AnchorType.Middle, AnchorType.End)).toBe(
      AnchorType.Middle,
    );
    expect(panel._defineAnchorProperty("hacr", AnchorType.End, AnchorType.End)).toBe(0);
    expect(panel._defineAnchorProperty("hacr", AnchorType.Start, AnchorType.End)).toBe(
      AnchorType.Stretch,
    );
  });

  it("measures one element by its box and several by their union", () => {
    const panel = dimension([]);
    const one = {
      hasMixin: () => true,
      getGeometryBBox: () => new Rect(10, 20, 30, 40),
      getAngle: () => 0.5,
    };
    const two = {
      hasMixin: () => true,
      getGeometryBBox: () => new Rect(50, 0, 10, 10),
      getAngle: () => 1,
    };
    panel._elements = [one as never];
    expect(panel._getCurrentDimensions()).toEqual({ x: 10, y: 20, w: 30, h: 40, angle: 0.5 });
    panel._elements = [one as never, two as never];
    expect(panel._getCurrentDimensions()).toEqual({ x: 10, y: 0, w: 50, h: 60, angle: 0 });
  });

  it("resizes from the box's top left corner in one transaction", () => {
    const log: string[] = [];
    const panel = dimension(log);
    const applied: number[][] = [];
    const element = {
      hasMixin: () => true,
      getGeometryBBox: () => new Rect(10, 20, 100, 50),
      getAngle: () => 0,
      _scene: {},
      // The open element editor gets the transform, as the old panel did.
      __editor__: {
        _setTransform: (t: { getMatrix(): number[] }) => applied.push(t.getMatrix()),
        applyTransform: () => applied.push([]),
      },
    };
    panel._elements = [element as never];
    panel._assignDimension("w", "200");
    // scale 2 around (10, 20): x' = 2x - 10.
    expect(applied).toEqual([[2, 0, 0, 1, -10, 0], []]);
    expect(log).toEqual(["begin", "commit Change Size"]);
  });

  it("ignores a size of zero and an unchanged value", () => {
    const log: string[] = [];
    const panel = dimension(log);
    const element = {
      hasMixin: () => true,
      getGeometryBBox: () => new Rect(10, 20, 100, 50),
      getAngle: () => 0,
      transform: () => log.push("transform"),
    };
    panel._elements = [element as never];
    panel._assignDimension("w", "0");
    panel._assignDimension("x", "10");
    expect(log).toEqual([]);
  });

  it("updates only for transformable non-page elements", () => {
    const panel = dimension([]);
    expect(panel.update(fakeDocument(), [new Page()] as InspectedElements)).toBe(false);
  });
});
