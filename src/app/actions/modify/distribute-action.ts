// Old: designer.browser.dev.js module 867 (GDistributeAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument, gDesigner } from "../host.ts";

const Type = { Horizontal: "horizontal", Vertical: "vertical" } as const;

type TransformableNode = Node & {
  getGeometryBBox(): Rect | null;
  transform(transform: Transform, noRecord?: boolean): void;
};

interface Entry {
  elbbox: Rect;
  element: TransformableNode;
}

const HORIZONTAL_ICON =
  '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="3 2 20 20" width="20" height="20"><rect id="align-area" x="4" y="6" width="4" height="12" fill="#FFF"/><rect id="align-area" x="18" y="8" width="4" height="8" fill="#FFF"/><rect id="align-shape" x="10" y="3" width="2" height="18" fill="#3A98FF"/><rect id="align-shape" x="14" y="3" width="2" height="18" fill="#3A98FF"/></svg>';
const VERTICAL_ICON =
  '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="28 2 20 20" width="20" height="20"><rect id="align-area" x="36" y="13" width="4" height="12" transform="rotate(-90 38 19)" fill="#FFF"/><rect id="align-area" x="36" y="1" width="4" height="8" transform="rotate(-90 38 5)" fill="#FFF"/><rect id="align-shape" x="37" y="5" width="2" height="18" transform="rotate(-90 38 14)" fill="#3A98FF"/><rect id="align-shape" x="37" y="1" width="2" height="18" transform="rotate(-90 38 10)" fill="#3A98FF"/></svg>';

/**
 * Modify > Align > Distribute horizontally / vertically
 * ("arrange.distribute.<type>"): spaces the elements evenly within their
 * united box, or within the area the align panel passes. When they don't
 * fit, their centres are spaced evenly instead.
 */
export class DistributeAction extends Action {
  static Type = Type;
  static ID = "arrange.distribute";
  static TOOLTIP_CONFIG: Record<string, Record<string, unknown>> | null = null;

  protected _type: string;
  protected _title: LocaleKey;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = new LocaleKey("GDistributeAction", "title." + type);
    DistributeAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.SIDEBAR]: {
        [Type.Horizontal]: richTooltipConfig({
          title: Locale.get(new LocaleKey("GDistributeAction", "text.horizontal-tooltip-title")),
          description: Locale.get(
            new LocaleKey("GDistributeAction", "text.horizontal-tooltip-description"),
          ),
          learnMore: "",
        }),
        [Type.Vertical]: richTooltipConfig({
          title: Locale.get(new LocaleKey("GDistributeAction", "text.vertical-tooltip-title")),
          description: Locale.get(
            new LocaleKey("GDistributeAction", "text.vertical-tooltip-description"),
          ),
          learnMore: "",
        }),
      },
    };
  }

  override getId(): string {
    return DistributeAction.ID + "." + this._type;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getIcon(): string | null {
    switch (this._type) {
      case Type.Horizontal:
        return HORIZONTAL_ICON;
      case Type.Vertical:
        return VERTICAL_ICON;
      default:
        return null;
    }
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_ALIGN;
  }

  override getGroup(): string {
    return "arrange/align-distribute";
  }

  override getShortcut(): null {
    return null;
  }

  /**
   * Needs three elements, or two with an `area` or a `spacing` above 0
   * (the align panel's arguments).
   */
  override isEnabled(nodes?: unknown, area?: unknown, spacing?: unknown): boolean {
    const list = (nodes ||
      (gDesigner().getActiveDocument()
        ? activeDocument().getEditor().getIndividualSelection()
        : null)) as Node[] | null;
    return (
      !!list &&
      (area ? list.length > 1 : (spacing as number) > 0 ? list.length >= 2 : list.length > 2)
    );
  }

  override execute(nodes?: unknown, area?: unknown, spacing?: unknown): void {
    const designerDocument = activeDocument();
    const scene = designerDocument.getScene();
    let list = nodes as Node[] | null | undefined;
    if (!list) list = designerDocument.getEditor().getSelection() as Node[];
    const individual = designerDocument
      .getEditor()
      .filterIndividualElements(list as never) as unknown as Node[];
    const entries: Entry[] = [];
    for (let i = 0; i < individual.length; ++i) {
      const node = individual[i] as TransformableNode;
      if (node.hasMixin(Element.Transform)) {
        const box = node.getGeometryBBox();
        if (!box || box.getWidth() + box.getHeight() === 0) continue;
        entries.push({ elbbox: box, element: node });
      }
    }
    let bounds = area as Rect | null | undefined;
    let gap = spacing as number | undefined;
    if (!bounds) {
      for (let i = 0; i < entries.length; ++i) {
        bounds = bounds
          ? bounds.united((entries[i] as Entry).elbbox)
          : (entries[i] as Entry).elbbox;
      }
    }
    if (!bounds || bounds.isEmpty()) return;
    const box = bounds;
    if (this._type === Type.Horizontal) {
      entries.sort(function (a, b) {
        return (
          a.elbbox.getX() + a.elbbox.getWidth() / 2 - b.elbbox.getX() - b.elbbox.getWidth() / 2
        );
      });
      let centerStep: number | null = null;
      if (!gap) {
        if (entries.length > 1) {
          let total = 0;
          for (let i = 0; i < entries.length; ++i) total += (entries[i] as Entry).elbbox.getWidth();
          if (total <= box.getWidth()) gap = (box.getWidth() - total) / (entries.length - 1);
          else {
            centerStep =
              (box.getWidth() -
                (entries[0] as Entry).elbbox.getWidth() / 2 -
                (entries[entries.length - 1] as Entry).elbbox.getWidth() / 2) /
              (entries.length - 1);
          }
        } else gap = 0;
      }
      Editor.tryRunTransaction(
        scene,
        () => {
          let x = box.getX();
          if (null === centerStep) {
            for (let i = 0; i < entries.length; ++i) {
              const entry = entries[i] as Entry;
              if (x !== entry.elbbox.getX()) {
                entry.element.transform(
                  new Transform(1, 0, 0, 1, x - entry.elbbox.getX(), 0),
                  true,
                );
              }
              x += entry.elbbox.getWidth() + (gap as number);
            }
          } else {
            const firstCenter = x + (entries[0] as Entry).elbbox.getWidth() / 2;
            for (let i = 0; i < entries.length; ++i) {
              const entry = entries[i] as Entry;
              const left = firstCenter + centerStep * i - entry.elbbox.getWidth() / 2;
              if (left !== entry.elbbox.getX()) {
                entry.element.transform(
                  new Transform(1, 0, 0, 1, left - entry.elbbox.getX(), 0),
                  true,
                );
              }
            }
          }
        },
        Locale.get(this.getTitle()) as string,
      );
    } else if (this._type === Type.Vertical) {
      entries.sort(function (a, b) {
        return (
          a.elbbox.getY() + a.elbbox.getHeight() / 2 - (b.elbbox.getY() + b.elbbox.getHeight() / 2)
        );
      });
      let centerStep: number | null = null;
      if (!gap) {
        if (entries.length > 1) {
          let total = 0;
          for (let i = 0; i < entries.length; ++i)
            total += (entries[i] as Entry).elbbox.getHeight();
          if (total <= box.getHeight()) gap = (box.getHeight() - total) / (entries.length - 1);
          else {
            centerStep =
              (box.getHeight() -
                (entries[0] as Entry).elbbox.getHeight() / 2 -
                (entries[entries.length - 1] as Entry).elbbox.getHeight() / 2) /
              (entries.length - 1);
          }
        } else gap = 0;
      }
      Editor.tryRunTransaction(
        scene,
        () => {
          let y = box.getY();
          if (null === centerStep) {
            for (let i = 0; i < entries.length; ++i) {
              const entry = entries[i] as Entry;
              if (y !== entry.elbbox.getY()) {
                entry.element.transform(
                  new Transform(1, 0, 0, 1, 0, y - entry.elbbox.getY()),
                  true,
                );
              }
              y += entry.elbbox.getHeight() + (gap as number);
            }
          } else {
            const firstCenter = y + (entries[0] as Entry).elbbox.getHeight() / 2;
            for (let i = 0; i < entries.length; ++i) {
              const entry = entries[i] as Entry;
              const top = firstCenter + centerStep * i - entry.elbbox.getHeight() / 2;
              // Compared with the x position, as the old code did; see
              // "Vertical distribute compares the new top with x" in QUESTIONS.md.
              if (top !== entry.elbbox.getX()) {
                entry.element.transform(
                  new Transform(1, 0, 0, 1, 0, top - entry.elbbox.getY()),
                  true,
                );
              }
            }
          }
        },
        Locale.get(this.getTitle()) as string,
      );
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area &&
        DistributeAction.TOOLTIP_CONFIG &&
        DistributeAction.TOOLTIP_CONFIG[area] &&
        DistributeAction.TOOLTIP_CONFIG[area][this._type]) ||
      null
    );
  }

  override toString(): string {
    return "[Object GDistributeAction]";
  }
}
