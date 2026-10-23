// Old: chunk.vendor.js module 915 (the scene's styles container, no G name).
/**
 * The document's styles: the "styles" child of the scene. It holds the
 * shared styles (GStyle) and one default style per element class, which
 * new elements of that class get (`_sdf` holds the class's type id).
 * The defaults are created in the order of DEFAULT_STYLE_CLASSES, also
 * when `repairSdf` adds the ones a loaded document lacks.
 */
import { ColorHelper } from "../color/color-helper.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { getRegisteredClass, getTypeId } from "../core/object.ts";
import { lookupOldTypeId } from "../core/type-ids.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { Connector } from "../scene/connector.ts";
import { Ellipse } from "../scene/ellipse.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Container } from "../scene/node-container.ts";
import { Store } from "../scene/node-store.ts";
import { Path } from "../scene/path.ts";
import { PathsGraph } from "../scene/paths-graph/paths-graph.ts";
import { Polygon } from "../scene/polygon.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { SceneNode } from "../scene/scene-node.ts";
import { Shape } from "../scene/shape.ts";
import { Text } from "../text/text.ts";
import { BorderPaintLayer } from "./border-paint-layer.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import type { Pattern } from "./pattern.ts";
import { BorderMarker, PropertySet } from "./stylable-sets.ts";
import { Style } from "./style.ts";

/** The default style's name per element class (old G name), in creation order. */
export const DEFAULT_STYLE_NAMES: Readonly<Record<string, string>> = {
  GShape: "Shape Default",
  GText: "Text Default",
  GRectangle: "Rectangle Default",
  GEllipse: "Ellipse Default",
  GPolygon: "Polygon Default",
  GPath: "Path Default",
  GPathsGraph: "Path graph default",
  GConnector: "Connector default",
  GTextAnnotation: "Text annotation default",
  GRectangleAnnotation: "Rectangle annotation default",
  GEllipseAnnotation: "Ellipse annotation default",
  GPencilAnnotation: "Pencil annotation default",
  GHighlighterAnnotation: "Highlighter annotation default",
  GArrowAnnotation: "Arrow annotation default",
  GCommentAnnotation: "Comment annotation default",
};

/** The element classes that get a default style, in the old order. */
export const DEFAULT_STYLE_CLASSES: readonly string[] = [
  "GShape",
  "GText",
  "GRectangle",
  "GEllipse",
  "GPolygon",
  "GPath",
  "GPathsGraph",
  "GConnector",
  "GTextAnnotation",
  "GRectangleAnnotation",
  "GEllipseAnnotation",
  "GPencilAnnotation",
  "GHighlighterAnnotation",
  "GArrowAnnotation",
  "GCommentAnnotation",
];

const DIRECT_CLASSES: Readonly<Record<string, object>> = {
  GShape: Shape,
  GText: Text,
  GRectangle: Rectangle,
  GEllipse: Ellipse,
  GPolygon: Polygon,
  GPath: Path,
  GPathsGraph: PathsGraph,
  GConnector: Connector,
};

/**
 * The type id of a default style's element class. The annotation classes
 * belong to a cluster that this one must not import (it would make the
 * load order circular), so they are found by their old name once
 * registered; before that, the old table gives the number they register
 * with.
 */
function classTypeId(oldName: string): number | null {
  const cls = DIRECT_CLASSES[oldName] ?? getRegisteredClass(oldName);
  if (cls) return getTypeId(cls);
  return lookupOldTypeId(oldName) ?? null;
}

/** A child style as this container reads it. */
interface DefaultStyleChild {
  $defaultStyle: unknown;
  $name: unknown;
  $_sdf: unknown;
}

const { BlendMode, LineCap } = PaintCanvas;

export class DefaultStyles extends Store(Container(SceneNode)) {
  static {
    registerNodeClass(this, "styles", "GStyles");
  }

  constructor() {
    super();
    for (const name of DEFAULT_STYLE_CLASSES) this._initDefault(name);
  }

  /** Adds the default style of one element class. */
  _initDefault(className: string): void {
    const name = DEFAULT_STYLE_NAMES[className];
    const sdf = classTypeId(className);
    const shapeSets = [
      PropertySet.Style,
      PropertySet.BorderPaintLayers,
      PropertySet.FillPaintLayers,
    ];
    const lightGray = () => new RGBColor([235, 235, 235]);
    const red = () => new RGBColor([230, 2, 2]);
    switch (className) {
      case "GShape": {
        const style = new Style();
        style.setProperties(["name", "_sdf", "ps"], [name, sdf, shapeSets]);
        style.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.WHITE));
        style.getPaintLayers()?.appendChild(new BorderPaintLayer(RGBColor.BLACK));
        style.setProperty("defaultStyle", true);
        this.appendChild(style);
        break;
      }
      case "GRectangle":
      case "GEllipse":
      case "GPolygon": {
        const style = new Style();
        style.setProperties(["name", "defaultStyle", "_sdf", "ps"], [name, true, sdf, shapeSets]);
        style.getPaintLayers()?.appendChild(new FillPaintLayer(lightGray()));
        this.appendChild(style);
        break;
      }
      case "GPath": {
        const style = new Style();
        style.setProperties(["name", "defaultStyle", "_sdf", "ps"], [name, true, sdf, shapeSets]);
        style.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.WHITE, 1, false));
        style.getPaintLayers()?.appendChild(new BorderPaintLayer(RGBColor.BLACK));
        this.appendChild(style);
        break;
      }
      case "GText": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_fc"],
          [
            name,
            true,
            sdf,
            [
              PropertySet.Style,
              PropertySet.BorderPaintLayers,
              PropertySet.FillPaintLayers,
              PropertySet.Text,
              PropertySet.Paragraph,
            ],
            RGBColor.BLACK,
          ],
        );
        this.appendChild(style);
        break;
      }
      case "GPathsGraph": {
        const style = new Style();
        style.setProperties(["name", "defaultStyle", "_sdf", "ps"], [name, true, sdf, shapeSets]);
        const border = new BorderPaintLayer(RGBColor.BLACK);
        border.setProperty("_blc", LineCap.Round);
        style.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.WHITE, 1, false));
        style.getPaintLayers()?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GConnector": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps"],
          [name, true, sdf, [PropertySet.Style, PropertySet.BorderPaintLayers]],
        );
        const border = new BorderPaintLayer(RGBColor.BLACK);
        border.setProperties(
          ["_bhm", "_btm", "_blc"],
          [BorderMarker.Arrow, BorderMarker.Arrow, LineCap.Butt],
        );
        style.getPaintLayers()?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GRectangleAnnotation":
      case "GEllipseAnnotation": {
        const style = new Style();
        style.setProperties(["name", "defaultStyle", "_sdf", "ps"], [name, true, sdf, shapeSets]);
        const fill = new FillPaintLayer(red(), 0, true, BlendMode.Multiply);
        const border = new BorderPaintLayer(red());
        const layers = style.getPaintLayers();
        border.setProperties(["_bw"], [2]);
        layers?.appendChild(fill);
        layers?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GHighlighterAnnotation": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_stop", "_sbl"],
          [
            name,
            true,
            sdf,
            [PropertySet.Style, PropertySet.BorderPaintLayers],
            0.5,
            BlendMode.Normal,
          ],
        );
        const border = new BorderPaintLayer(new RGBColor([248, 206, 28]));
        border.setProperties(["_bw"], [12]);
        style.getPaintLayers()?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GPencilAnnotation": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_stop", "_sbl"],
          [
            name,
            true,
            sdf,
            [PropertySet.Style, PropertySet.BorderPaintLayers],
            1,
            BlendMode.Normal,
          ],
        );
        const border = new BorderPaintLayer(red());
        border.setProperties(["_bw"], [2]);
        style.getPaintLayers()?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GArrowAnnotation": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_stop", "_sbl"],
          [
            name,
            true,
            sdf,
            [PropertySet.Style, PropertySet.BorderPaintLayers],
            1,
            BlendMode.Normal,
          ],
        );
        const border = new BorderPaintLayer(red());
        border.setProperties(
          ["_btm", "_blc", "_bw", "_btmi", "_bhmi"],
          [BorderMarker.Arrow, LineCap.Butt, 2, 0, 0],
        );
        style.getPaintLayers()?.appendChild(border);
        this.appendChild(style);
        break;
      }
      case "GCommentAnnotation": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_stop", "_sbl"],
          [
            name,
            true,
            sdf,
            [
              PropertySet.Style,
              PropertySet.BorderPaintLayers,
              PropertySet.FillPaintLayers,
              PropertySet.Effects,
            ],
            1,
            BlendMode.Normal,
          ],
        );
        style.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 0])));
        this.appendChild(style);
        break;
      }
      case "GTextAnnotation": {
        const style = new Style();
        style.setProperties(
          ["name", "defaultStyle", "_sdf", "ps", "_sbl", "_fc"],
          [
            name,
            true,
            sdf,
            [PropertySet.Style, PropertySet.Text],
            BlendMode.Multiply,
            RGBColor.BLACK,
          ],
        );
        this.appendChild(style);
        break;
      }
    }
  }

  /**
   * After loading: gives every default style found by name the type id of
   * its class again (written directly, not as a property change) and adds
   * the default styles that are missing.
   */
  repairSdf(): void {
    const found: string[] = [];
    for (let child = this.getFirstChild(); child; child = child.getNext()) {
      const style = child as unknown as DefaultStyleChild;
      if (style.$defaultStyle) {
        for (const className in DEFAULT_STYLE_NAMES) {
          if (style.$name === DEFAULT_STYLE_NAMES[className]) {
            found.push(className);
            style.$_sdf = classTypeId(className);
            break;
          }
        }
      }
    }
    for (const className of DEFAULT_STYLE_CLASSES) {
      if (found.indexOf(className) < 0) this._initDefault(className);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.PrepareRestore) this.clearChildren();
    super._handleChange(change, args);
  }

  /** Converts the colors of every style's paint layers to a color mode. */
  setColorMode(mode: string): void {
    for (let child = this.getFirstChild(); child; child = child.getNext()) {
      const layers = (child as Style).getPaintLayers();
      if (layers) {
        for (let layer = layers.getFirstChild(); layer; layer = layer.getNext()) {
          const paintLayer = layer as FillPaintLayer;
          const pattern = paintLayer.getProperty("_pt");
          const converted = ColorHelper.convertColor(pattern, mode);
          if (converted) paintLayer.setProperty("_pt", converted as Pattern);
        }
      }
    }
  }

  override validateInsertion(parent: Node): boolean {
    return "scene" === Node.getName(parent);
  }
}
