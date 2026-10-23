// Old: designer.browser.dev.js module 871 (GTransformAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { BoxEditor } from "../../../editor/element-editors/box-editor.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument, gDesigner } from "../host.ts";

const Type = {
  Rotate45Left: "rotate-45-left",
  Rotate90Left: "rotate-90-left",
  Rotate180Left: "rotate-180-left",
  Rotate45Right: "rotate-45-right",
  Rotate90Right: "rotate-90-right",
  Rotate180Right: "rotate-180-right",
  FlipVertical: "flip-vertical",
  FlipHorizontal: "flip-horizontal",
} as const;

type TransformableNode = Node & { transform(transform: Transform, noRecord?: boolean): void };

/** Elements whose editor lets them rotate (a corner or the rotate handle). */
function isRotatable(node: Node): boolean {
  const editor = ElementEditor.getEditor(node) as { hasFlag(flag: number): boolean } | null;
  return (
    !!editor &&
    (editor.hasFlag(BoxEditor.Flag.RotateCorners) || editor.hasFlag(BoxEditor.Flag.RotateHandle))
  );
}

/** The toolbar tooltip of one transform. */
function transformTooltip(name: string): unknown {
  return richTooltipConfig({
    title: Locale.get(new LocaleKey("GTransformAction", `${name}-tooltip-title`)),
    description: Locale.get(new LocaleKey("GTransformAction", `${name}-tooltip-description`)),
    learnMore: "",
  });
}

/**
 * Modify > Transform: rotate by 45, 90 or 180 degrees either way, or flip
 * ("arrange.transform.<type>"), around the centre of the elements'
 * united geometry box.
 */
export class TransformAction extends Action {
  static Type = Type;
  static TOOLTIP_CONFIG: Record<string, Record<string, unknown>> | null = null;
  static ID = "arrange.transform";

  protected _type: string;
  protected _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GTransformAction", "title." + type);
    TransformAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: {
        [Type.Rotate45Left]: null,
        [Type.Rotate90Left]: transformTooltip("rotate-90-left"),
        [Type.Rotate180Left]: null,
        [Type.Rotate45Right]: null,
        [Type.Rotate90Right]: transformTooltip("rotate-90-right"),
        [Type.Rotate180Right]: null,
        [Type.FlipVertical]: transformTooltip("flip-vertical"),
        [Type.FlipHorizontal]: transformTooltip("flip-horizontal"),
      },
    };
  }

  override getId(): string {
    return TransformAction.ID + "." + this._type;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getIcon(): string | null {
    switch (this._type) {
      case Type.Rotate90Left:
      case Type.Rotate90Right:
        return "gravit-icon-rotate";
      case Type.FlipVertical:
        return "gravit-icon-flip-vertical";
      case Type.FlipHorizontal:
        return "gravit-icon-flip-horizontal";
      default:
        return null;
    }
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_TRANSFORM;
  }

  override getGroup(): string {
    let group = "";
    switch (this._type) {
      case Type.Rotate45Left:
      case Type.Rotate90Left:
      case Type.Rotate180Left:
        group = "rotate-left";
        break;
      case Type.Rotate45Right:
      case Type.Rotate90Right:
      case Type.Rotate180Right:
        group = "rotate-right";
        break;
      case Type.FlipVertical:
      case Type.FlipHorizontal:
        group = "flip";
    }
    return "arrange/transform-" + group;
  }

  override getShortcut(): null {
    return null;
  }

  /** `nodes` defaults to the selection. */
  override isEnabled(nodes?: unknown): boolean {
    let list = (nodes ||
      (gDesigner().getActiveDocument() ? activeDocument().getEditor().getSelection() : null) ||
      []) as Node[];
    list = list.filter((node) => isRotatable(node));
    return list.length > 0;
  }

  override execute(nodes?: unknown): void {
    const designerDocument = activeDocument();
    const scene = designerDocument.getScene();
    let list = nodes as Node[] | null | undefined;
    if (!list) list = designerDocument.getEditor().getSelection() as Node[];
    const elements = (
      designerDocument.getEditor().filterIndividualElements(list as never) as unknown as Node[]
    ).filter((node) => isRotatable(node));
    const box = Editor.getGroupGeometryBBox(elements);
    if (!box) return;
    Editor.tryRunTransaction(
      scene,
      () => {
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i] as TransformableNode;
          if (element.hasMixin(Element.Transform) && box) {
            const center = box.getSide(Rect.Side.CENTER);
            let angle = 0;
            let scaleX = 1;
            let scaleY = 1;
            switch (this._type) {
              case Type.Rotate45Left:
                angle = -45;
                break;
              case Type.Rotate90Left:
                angle = -90;
                break;
              case Type.Rotate180Left:
                angle = -180;
                break;
              case Type.Rotate45Right:
                angle = 45;
                break;
              case Type.Rotate90Right:
                angle = 90;
                break;
              case Type.Rotate180Right:
                angle = 180;
                break;
              case Type.FlipVertical:
                scaleY = -1;
                break;
              case Type.FlipHorizontal:
                scaleX = -1;
            }
            const transform = new Transform()
              .translated(-center.getX(), -center.getY())
              .scaled(scaleX, scaleY)
              .rotated(GMath.toRadians(angle))
              .translated(center.getX(), center.getY());
            element.transform(transform, true);
          }
        }
      },
      Locale.get(this.getTitle()) as string,
    );
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        TransformAction.TOOLTIP_CONFIG &&
        TransformAction.TOOLTIP_CONFIG[area] &&
        TransformAction.TOOLTIP_CONFIG[area][this._type]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GTransformAction]";
  }
}
