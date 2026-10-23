// Old: designer.browser.dev.js module 872 (GVectorizeBorderAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { each } from "../../../engine/core/util.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { VertexOffsetter } from "../../../engine/geometry/vertex-offsetter.ts";
import { VertexSource, type VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Path } from "../../../engine/scene/path.ts";
import type { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };
type StyledNode = Node & { getPaintLayers(): PaintLayers };

/** Moves the paths of `source` (one path, or a compound path's paths) into `target`. */
function appendPaths(target: CompoundPath, source: Path | CompoundPath): void {
  if (source instanceof Path) target.getPaths().appendChild(source);
  else {
    const paths = source.cloneSubPaths();
    for (
      let path = paths.getFirstChild() as Path | null, next: Path | null;
      null !== path;
      path = next
    ) {
      next = path.getNext() as Path | null;
      paths.removeChild(path);
      target.getPaths().appendChild(path);
    }
  }
}

/**
 * Modify > Path > Vectorize Border: each border of a shape becomes a filled
 * path of the border's outline, in the border's paint. Several borders
 * give a group of such paths.
 */
export class VectorizeBorderAction extends ElementAction {
  static ID = "modify.vectorize";
  static TITLE = new LocaleKey("GVectorizeBorderAction", "title");
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    VectorizeBorderAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GVectorizeBorderAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GVectorizeBorderAction", "tooltip-description")),
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return VectorizeBorderAction.ID;
  }

  override getTitle(): LocaleKey {
    return VectorizeBorderAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string {
    return "gravit-icon-vectorize-border";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getIndividualSelection() as unknown as Node[] | null)
      : null;
    let enabled = false;
    if (selection) {
      for (let i = 0; !enabled && i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (!(node instanceof Image) && node.hasMixin(VertexSource) && node.hasMixin(Stylable)) {
          const layers = (node as StyledNode).getPaintLayers();
          const borders = layers ? layers.getBorderLayers(true) : null;
          enabled = !!borders && borders.length >= 1;
        }
      }
    }
    return enabled;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    const sources: Node[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (node.hasMixin(VertexSource) && !(node instanceof Image) && node.hasMixin(Stylable)) {
          sources.push(node);
        }
      }
    }
    if (!sources.length) return;
    const ed = editor as NonNullable<typeof editor>;
    ed.beginTransaction();
    try {
      const results: Node[] = [];
      let source: Node = sources[0] as Node;
      // One border as a filled path: a band of the border's width around
      // the outline, or for inside/outside borders the shape and its
      // offset combined in one compound path.
      const vectorize = (border: BorderPaintLayer): Node | undefined => {
        const alignment = border.getProperty("_ba");
        let width = border.getProperty("_bw") as number;
        width = width || 1;
        const distance = alignment == Stylable.BorderAlignment.Center ? 0.5 * width : width;
        // The old call also passed the miter limit (_bml) as a 7th argument,
        // which GVertexOffsetter did not take.
        const offsetter = new VertexOffsetter(
          PathUtil.makeClockWise(source) as unknown as VertexReader,
          distance,
          alignment != Stylable.BorderAlignment.Outside,
          alignment != Stylable.BorderAlignment.Inside,
          0,
          border.getProperty("_blc") as string | undefined,
        );
        let path: CompoundPath | Path | undefined;
        if (alignment == Stylable.BorderAlignment.Center) {
          path = PathUtil.createPathFromVertexSource(offsetter) as Path | CompoundPath | null as
            Path | CompoundPath | undefined;
        } else {
          const shape = PathUtil.createPathFromVertexSource(source as unknown as VertexReader) as
            Path | CompoundPath | null;
          const offset = PathUtil.createPathFromVertexSource(offsetter) as
            Path | CompoundPath | null;
          if (shape) {
            path = new CompoundPath();
            appendPaths(path, shape);
            if (offset) appendPaths(path, offset);
          }
        }
        if (path) {
          Element.prototype.assignFrom.call(path, source);
          (path as unknown as StyledNode).getPaintLayers().clearLayers();
          if (border.$_pt) {
            (path as unknown as StyledNode)
              .getPaintLayers()
              .appendChild(new FillPaintLayer(border.$_pt));
          }
        }
        return path;
      };
      const parents = new Set<ContainerNode>();
      for (let i = 0; i < sources.length; ++i) {
        const parent = (sources[i] as Node).getParent();
        if (parent) parents.add(parent);
      }
      const blocked = [...parents] as unknown as Updatable[];
      try {
        blockChanges(ed, blocked, null, null);
        for (let i = 0; i < sources.length; ++i) {
          source = sources[i] as Node;
          const parent = source.getParent() as ContainerNode;
          const next = source.getNext();
          let replacement: Node | null | undefined = null;
          const borders = (source as StyledNode).getPaintLayers().getBorderLayers(true);
          if (borders.length > 1) {
            each(borders, (_index, border) => {
              const path = vectorize(border);
              if (path) {
                if (!replacement) replacement = new Group();
                (replacement as Group).appendChild(path);
              }
            });
          } else if (1 == borders.length) {
            const border = borders.pop() as BorderPaintLayer;
            replacement = vectorize(border);
          }
          if (replacement) {
            parent.insertChild(replacement, next);
            results.push(replacement);
            parent.removeChild(source);
          } else results.push(source);
        }
      } finally {
        releaseChanges(ed, blocked, null);
        if (results.length) ed.updateSelection(false, results);
      }
    } finally {
      ed.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        VectorizeBorderAction.TOOLTIP_CONFIG &&
        VectorizeBorderAction.TOOLTIP_CONFIG[area]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GVectorizeBorderAction]";
  }
}
