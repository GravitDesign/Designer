// Old: designer.browser.dev.js module 1616 (GVectorizeImageAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { ImageTracer } from "../../../engine/geometry/image-tracer.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { Vertex } from "../../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { VertexSimplifier } from "../../../engine/geometry/vertex-simplifier.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/**
 * Modify > Path > Vectorize Image: traces each loaded image into a group of
 * filled paths, one per traced color region, named after the closest CSS
 * color.
 */
export class VectorizeImageAction extends ElementAction {
  static ID = "modify.bmp2path";
  static TITLE = new LocaleKey("GVectorizeImageAction", "title");

  override getId(): string {
    return VectorizeImageAction.ID;
  }

  override getTitle(): LocaleKey {
    return VectorizeImageAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument ? designerDocument.getEditor().getSelection() : null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Image && !node.getStatus()) return true;
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    const images: Image[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Image && !node.getStatus()) images.push(node);
      }
    }
    if (!images.length) return;
    const ed = editor as NonNullable<typeof editor>;
    ed.beginTransaction();
    try {
      const created: Node[] = [];
      const parents = new Set<ContainerNode>();
      for (let i = 0; i < images.length; ++i) {
        const parent = (images[i] as Image).getParent();
        if (parent) parents.add(parent);
      }
      const blocked = [...parents] as unknown as Updatable[];
      try {
        blockChanges(ed, blocked, null, null);
        for (let i = 0; i < images.length; ++i) {
          const image = images[i] as Image;
          const parent = image.getParent() as ContainerNode;
          const next = image.getNext();
          const group = this._vectorize(image);
          if (group) {
            parent.insertChild(group, next);
            created.push(group);
          }
          parent.removeChild(image);
        }
      } finally {
        releaseChanges(ed, blocked, null);
        if (created.length) ed.updateSelection(false, created);
      }
    } finally {
      ed.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  _vectorize(image: Image): Group {
    const canvas = image.getImageCanvas() as HTMLCanvasElement;
    const tracer = new ImageTracer();
    const imageData = tracer.getImgdata(canvas);
    const width = imageData.width;
    const height = imageData.height;
    const traced = tracer.imagedataToTracedata(imageData, {
      ltres: 1,
      qtres: Math.min(width / 4, height / 4, 10),
      numberofcolors: 8,
      blurradius: 2,
      colorquantcycles: 5,
      pathomit: Math.min(0.25 * width, 0.25 * height, 20),
    });
    const palette = traced.palette;
    // The paths by the pixel index of their start, so they are stacked in
    // scan order across the color layers.
    const starts: { l: string; p: string }[] = [];
    for (const layer in traced.layers) {
      if (Object.prototype.hasOwnProperty.call(traced.layers, layer)) {
        const paths = traced.layers[layer as unknown as number] as { x1: number; y1: number }[][];
        for (let p = 0; p < paths.length; p++) {
          const first = (paths[p] as { x1: number; y1: number }[])[0] as { x1: number; y1: number };
          starts[first.y1 * width + first.x1] = { l: "" + layer, p: "" + p };
        }
      }
    }
    const keys = Object.keys(starts);
    keys.sort((a, b) => (a as unknown as number) - (b as unknown as number));
    const group = new Group();
    let previousLayer: string | number = -1;
    let vertices: VertexContainer | undefined;
    for (let t = 0; t < keys.length; t++) {
      const entry = starts[keys[t] as unknown as number] as { l: string; p: string };
      const layer = entry.l;
      const nextLayer: string | number =
        t + 1 < keys.length ? (starts[keys[t + 1] as unknown as number] as { l: string }).l : -1;
      const pathIndex = entry.p;
      const color = palette[layer as unknown as number] as {
        r: number;
        g: number;
        b: number;
        a: number;
      };
      if (0 !== color.a) {
        const fill = new RGBColor([color.r, color.g, color.b]);
        const layerPaths = traced.layers[layer as unknown as number] as unknown as Record<
          string,
          {
            type: string;
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            x3?: number;
            y3?: number;
          }[]
        >;
        if (layer !== previousLayer) vertices = new VertexContainer();
        const vc = vertices as VertexContainer;
        const segments = layerPaths[pathIndex] as {
          type: string;
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          x3?: number;
          y3?: number;
        }[];
        const start = segments[0] as { x1: number; y1: number };
        vc.addVertex(Vertex.Command.Move, start.x1, start.y1);
        for (let s = 0; s < segments.length; s++) {
          const segment = segments[s] as (typeof segments)[number];
          if ("L" === segment.type) vc.addVertex(Vertex.Command.Line, segment.x2, segment.y2);
          else {
            vc.addVertex(Vertex.Command.Curve, segment.x3 as number, segment.y3 as number);
            vc.addVertex(Vertex.Command.Curve, segment.x2, segment.y2);
          }
        }
        if (layer !== nextLayer) {
          vertices = new VertexSimplifier(vc).simplify(0.4, false, true);
          const path = PathUtil.createPathFromVertexSource(vertices as unknown as VertexReader) as
            | (Node & {
                getPaintLayers(): PaintLayers;
                setProperty(n: string, v: unknown): unknown;
              })
            | null;
          if (path) {
            path.getPaintLayers().appendChild(new FillPaintLayer(fill));
            path.setProperty("name", fill.getClosestCSSName());
            group.appendChild(path);
          }
        }
        previousLayer = layer;
      }
    }
    return group;
  }

  override toString(): string {
    return "[Object GVectorizeImageAction]";
  }
}
