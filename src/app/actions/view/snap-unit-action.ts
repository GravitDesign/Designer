// Old: designer.browser.dev.js module 1295 (GSnapUnitAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { GMath } from "../../../engine/math/math.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element as GElement } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner, known } from "./view-host.ts";

const Type = { FullUnit: "full", HalfUnit: "half" } as const;
type SnapUnitType = (typeof Type)[keyof typeof Type];

/** An element with the transform mixin. */
type TransformableElement = Node & {
  getGeometryBBox(): Rect | null;
  transform(transform: Transform): void;
};

/**
 * Modify > Align > Snap to Full / Half Pixel: moves and scales each
 * selected element so its geometry box starts and ends on whole units
 * (half: on .5). Zero-sized boxes are left alone. Half also makes the box
 * half a unit larger; see "Snap to Half Pixel grows the size" in QUESTIONS.md.
 */
export class SnapUnitAction extends Action {
  static Type = Type;
  static ID = "arrange.snap-unit";

  private readonly _category: SnapUnitType;
  private readonly _title: LocaleKey;

  constructor(category: SnapUnitType) {
    super();
    this._category = category;
    this._title = new LocaleKey("GSnapUnitAction", "title." + category);
  }

  override getId(): string {
    return SnapUnitAction.ID + "." + this._category;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_ALIGN;
  }

  override getGroup(): string {
    return "arrange/snap-unit";
  }

  override getShortcut(): Shortcut | null {
    switch (this._category) {
      case Type.FullUnit:
        return [Key.Constant.SHIFT, Key.Constant.META, "U"];
      default:
        return null;
    }
  }

  /** `elements` defaults to the individual selection. */
  override isEnabled(elements?: unknown): boolean {
    const document = viewDesigner().getActiveDocument();
    const list =
      (elements as Node[] | null | undefined) ||
      (document
        ? (known(document.getEditor()).getIndividualSelection() as unknown as Node[] | null)
        : null);
    return !!list && list.length > 0;
  }

  override execute(elements?: unknown): void {
    const document = known(viewDesigner().getActiveDocument());
    const scene = document.getScene();
    const list =
      (elements as Node[] | null | undefined) ||
      (known(document.getEditor()).getIndividualSelection() as unknown as Node[]);
    Editor.tryRunTransaction(
      scene,
      () => {
        for (let i = 0; i < list.length; ++i) {
          const element = list[i] as TransformableElement;
          if (element.hasMixin(GElement.Transform)) {
            const box = element.getGeometryBBox();
            if (box && box.getWidth() + box.getHeight() !== 0) {
              let x = GMath.round(box.getX(), true);
              let y = GMath.round(box.getY(), true);
              let width = GMath.round(box.getWidth(), true);
              let height = GMath.round(box.getHeight(), true);
              if (this._category === Type.HalfUnit) {
                x += 0.5;
                y += 0.5;
                width += 0.5;
                height += 0.5;
              }
              const transform = new Transform()
                .translated(-box.getX(), -box.getY())
                .scaled(width / (box.getWidth() || 1), height / (box.getHeight() || 1))
                .translated(box.getX(), box.getY())
                .translated(x - box.getX(), y - box.getY());
              element.transform(transform);
            }
          }
        }
      },
      Locale.get(this.getTitle()) as string,
    );
  }

  override toString(): string {
    return "[Object GSnapUnitAction]";
  }
}
