import { afterEach, describe, expect, it } from "vitest";
import { Rect } from "../../engine/math/rect.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { setLateModules } from "../shell/late.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { installPaintTestDom, type PaintTestDom } from "./paint-dom.testing.ts";
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

describe("the dimension panel with several elements and editors (R7-C-504)", () => {
  interface Applied {
    matrix: number[];
    full: unknown;
    linked: unknown;
  }

  /** A transformable element with an open editor that records applyTransform. */
  function element(
    box: Rect,
    log: Applied[],
    target: Record<string, unknown> = {},
  ): Record<string, unknown> {
    let pending: { getMatrix(): number[] } | null = null;
    Object.assign(target, {
      hasMixin: () => true,
      getGeometryBBox: () => box,
      getAngle: () => 0.25,
      _scene: {},
    });
    target.__editor__ = {
      getElement: () => target,
      getPEGeometryBBox: () => new Rect(box.getX() + 1, box.getY() + 1, box.getWidth(), 5),
      getRotationAngle: () => 0.75,
      _setTransform: (t: { getMatrix(): number[] }) => {
        pending = t;
      },
      applyTransform: (_target: unknown, full: unknown, linked: unknown) =>
        log.push({ matrix: (pending as { getMatrix(): number[] }).getMatrix(), full, linked }),
    };
    return target;
  }

  /** A panel whose keep-ratio link says `ratio`. */
  function panelWith(
    ratio: "yes" | "no",
    editorExtras: Record<string, unknown> = {},
    log: string[] = [],
  ): DimensionProperties {
    fakeDesigner();
    const panel = new DimensionProperties();
    panel._panel = {
      ...emptyPanel,
      querySelectorAll: () => [],
      querySelector: (selector: string) =>
        selector === "[data-ratio]" ? { getAttribute: () => ratio } : null,
    } as unknown as HTMLElement;
    const document = fakeDocument(log);
    const editor = document.getEditor() as unknown as Record<string, unknown>;
    Object.assign(editor, editorExtras);
    panel._document = {
      getScene: document.getScene,
      getEditor: () => editor,
    } as unknown as Document;
    return panel;
  }

  it("resizes several elements by one transform of their united box, keeping the ratio", () => {
    const log: Applied[] = [];
    const commits: string[] = [];
    const panel = panelWith("yes", {}, commits);
    const a = element(new Rect(0, 0, 100, 50), log);
    const b = element(new Rect(100, 10, 100, 50), log);
    panel._elements = [a as never, b as never];
    panel._assignDimension("w", "400");
    // Union (0, 0, 200, 60); scale 2 both ways around its top left.
    expect(log.map((entry) => entry.matrix)).toEqual([
      [2, 0, 0, 2, 0, 0],
      [2, 0, 0, 2, 0, 0],
    ]);
    expect(log.map((entry) => !!entry.full)).toEqual([false, false]);
    expect(commits).toEqual(["begin", "commit Change Size"]);
  });

  it("keeps the other side without the ratio link", () => {
    const log: Applied[] = [];
    const panel = panelWith("no");
    panel._elements = [element(new Rect(0, 0, 100, 50), log) as never];
    panel._assignDimension("h", "100");
    expect(log.map((entry) => entry.matrix)).toEqual([[1, 0, 0, 2, 0, 0]]);
  });

  it("skips elements linked to others in the selection", () => {
    const log: Applied[] = [];
    const b: Record<string, unknown> = {};
    const panel = panelWith("no", {
      getLinkedElementsInSelection: (node: unknown) => (node === b ? [b] : []),
    });
    const a = element(new Rect(0, 0, 100, 50), log);
    element(new Rect(100, 0, 100, 50), log, b);
    panel._elements = [a as never, b as never];
    panel._assignDimension("x", "10");
    // Several elements move as one box: only a moves, with the linked list.
    expect(log).toHaveLength(1);
    expect(log[0]?.matrix).toEqual([1, 0, 0, 1, 10, 0]);
    expect(log[0]?.linked).toEqual([b]);
  });

  it("transforms the full content for symbol moves, rotation and the full-content setting", () => {
    const log: Applied[] = [];
    const panel = panelWith("no");
    const symbol = element(
      new Rect(0, 0, 100, 50),
      log,
      Object.create(SymbolNode.prototype) as Record<string, unknown>,
    );
    panel._elements = [symbol as never];
    panel._assignDimension("x", "10");
    panel._assignDimension("w", "50");
    const plain = panelWith("no", {
      getEdTransformSettings: () => ({ fullContentTransform: true }),
    });
    plain._elements = [element(new Rect(0, 0, 100, 50), log) as never];
    plain._assignDimension("w", "50");
    const rotate = panelWith("no");
    rotate._elements = [element(new Rect(0, 0, 100, 50), log) as never];
    rotate._assignDimension("rotate", "90");
    expect(log.map((entry) => !!entry.full)).toEqual([true, false, true, true]);
  });

  it("reads the boxes and angles from the element editors while dragging", () => {
    const log: Applied[] = [];
    const panel = panelWith("no", {
      getSelectionEditor: () => ({ getRotationAngle: () => 1.5 }),
    });
    const a = element(new Rect(0, 0, 100, 50), log);
    panel._elements = [a as never];
    // One element: the editor's box and rotation angle.
    expect(panel._getCurrentDimensions(false, true)).toEqual({
      x: 1,
      y: 1,
      w: 100,
      h: 5,
      angle: 0.75,
    });
    expect(panel._getCurrentDimensions(false, false)).toEqual({
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      angle: 0.25,
    });
    const b = element(new Rect(200, 0, 100, 50), log);
    panel._elements = [a as never, b as never];
    // Several: the united editor boxes and the selection editor's angle.
    expect(panel._getCurrentDimensions(false, true)).toEqual({
      x: 1,
      y: 1,
      w: 300,
      h: 5,
      angle: 1.5,
    });
    const calls: unknown[][] = [];
    panel._updateDimensions = (keepBoxes?: boolean, fromEditors?: boolean) => {
      calls.push([keepBoxes, fromEditors]);
    };
    panel._edGeometryChange();
    expect(calls).toEqual([[false, true]]);
  });

  it("refreshes on the decimals setting only", () => {
    const panel = panelWith("no");
    let updates = 0;
    panel._updateDimensions = () => {
      updates++;
    };
    panel._settingChanged(new SettingChangedEvent("touch", false, true));
    panel._settingChanged(new SettingChangedEvent("decimals_num", 1, 2));
    expect(updates).toBe(1);
  });
});

describe("the dimension panel in touch mode (R7-C-504)", () => {
  let t: PaintTestDom | null = null;
  const sidebarClasses: string[] = [];

  afterEach(() => {
    t?.uninstall();
    t = null;
  });

  function touchPanel() {
    sidebarClasses.length = 0;
    t = installPaintTestDom({
      isTouchEnabled: () => true,
      getRightSidebars: () => ({
        addClassName: (name: string) => sidebarClasses.push("+" + name),
        removeClassName: (name: string) => sidebarClasses.push("-" + name),
      }),
    });
    const doc = t.dom.document;
    const make = (tag: string, ...classes: string[]): FakeElement => {
      const element = doc.createElement(tag);
      if (classes.length) element.classList.add(...classes);
      return element;
    };
    const root = make("div", "dimension-panel");
    const button = make("button", "transform-button");
    const anchors = make("div", "anchor-panel");
    const advanced = make("div", "advanced-transform-properties");
    const toolbar = make("div", "advanced-transform-toolbar");
    const label = make("label");
    toolbar.append(label);
    doc.body.append(root, advanced, toolbar);
    const panel = new DimensionProperties();
    panel._panel = root as unknown as HTMLElement;
    panel._transformButton = button as unknown as HTMLButtonElement;
    panel._anchorsPanel = anchors as unknown as HTMLElement;
    return { panel, button, root, anchors, advanced, label };
  }

  it("switches the button, the anchors and the sidebar's z-index with transform mode", () => {
    const { panel, button, root, anchors, advanced, label } = touchPanel();
    expect(panel.isAvailable(true)).toBe(true);
    expect(button.classList.contains("g-active")).toBe(true);
    expect(button.textContent).toBe("Close");
    expect(label.textContent).toBe("ADVANCED TRANSFORM");
    expect(anchors.classList.contains("down")).toBe(true);
    expect(root.classList.contains("have-anchor")).toBe(false);
    expect(advanced.classList.contains("have-anchor")).toBe(true);
    expect(panel.isAvailable(false)).toBe(true);
    expect(button.classList.contains("g-active")).toBe(false);
    expect(button.textContent).toBe("Transform");
    expect(anchors.classList.contains("down")).toBe(false);
    expect(root.classList.contains("have-anchor")).toBe(true);
    expect(advanced.classList.contains("have-anchor")).toBe(false);
    expect(sidebarClasses).toEqual(["+more-z-index", "-more-z-index"]);
  });
});
