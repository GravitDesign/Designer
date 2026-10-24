// Old: designer.browser.dev.js module 1642 (GTogglePaintLayersVisibilityAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { PaintLayer } from "../../../engine/style/paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "./view-host.ts";

const Type = { Fill: "fill", Border: "border" } as const;
type LayerType = (typeof Type)[keyof typeof Type];

/** jQuery's `:input`: an input, select, textarea or button. */
function isInputElement(element: Element): boolean {
  return /^(?:input|select|textarea|button)$/i.test(element.nodeName);
}

/** A node with the stylable mixin. */
type StylableNode = Node & { getPaintLayers(): PaintLayers | null };

/**
 * F and Shift+B (shortcut only): hides the fills or borders of the
 * selection and everything inside it, or shows them when they are all
 * hidden. The old app imported this module but never registered the
 * action (bootstrap left it out), so the keys do nothing there; the class
 * is kept for that reason and not in the registration table.
 */
export class TogglePaintLayersVisibilityAction extends Action {
  static ID = "view.toggle-paint-layers-visibility";
  static Type = Type;
  /**
   * The old code named its transaction with this, which was never set; see
   * "Fill and border visibility toggle is never registered" in QUESTIONS.md.
   */
  static TITLE: LocaleKey | undefined = undefined;

  private readonly _type: LayerType;
  private readonly _title: LocaleKey;

  constructor(type: LayerType) {
    super();
    this._type = type;
    this._title = new LocaleKey("GTogglePaintLayersVisibilityAction", "title.".concat(this._type));
  }

  override getId(): string {
    return "".concat(TogglePaintLayersVisibilityAction.ID, ".").concat(this._type);
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut | null {
    switch (this._type) {
      case Type.Fill:
        return ["F"];
      case Type.Border:
        return [Key.Constant.SHIFT, "B"];
    }
    return null;
  }

  override isVisible(): boolean {
    return false;
  }

  override isEnabled(): boolean {
    return !document.activeElement || !isInputElement(document.activeElement);
  }

  /** The nodes below `nodes`, depth first, with the nodes themselves; layers left out. */
  _getSingleLevelSelection(nodes: readonly (Node | null)[]): Node[] {
    let result: Node[] = [];
    nodes.forEach((node) => {
      if (node) {
        const children = (node as Node & { getChildren(): Node[] | null }).getChildren();
        if (!(node instanceof Layer)) result.push(node);
        if (Array.isArray(children) && children.length > 0)
          result = result.concat(this._getSingleLevelSelection(children));
      }
    });
    return result;
  }

  _getPaintLayers(node: Node | null): PaintLayer[] | null {
    const layers = node && node.hasMixin(Stylable) && (node as StylableNode).getPaintLayers();
    if (!layers) return null;
    switch (this._type) {
      case Type.Fill:
        return layers.getFillLayers();
      case Type.Border:
        return layers.getBorderLayers();
      default:
        return null;
    }
  }

  _checkPaintLayersVisibility(nodes: readonly Node[]): {
    hasHiddenPaintLayers: boolean;
    hasVisiblePaintLayers: boolean;
  } {
    let hidden = false;
    let visible = false;
    for (let i = 0; nodes.length > i && (!hidden || !visible); i++) {
      const layers = this._getPaintLayers(nodes[i] as Node);
      if (Array.isArray(layers))
        for (let j = 0; layers.length > j && (!hidden || !visible); j++) {
          if ((layers[j] as PaintLayer).getProperty("_vs")) visible = true;
          else hidden = true;
        }
    }
    return { hasHiddenPaintLayers: hidden, hasVisiblePaintLayers: visible };
  }

  _setVisibilityPaintLayersState(nodes: readonly Node[], visible: boolean): void {
    const document = viewDesigner().getActiveDocument();
    const scene = document && document.getScene();
    if (scene)
      Editor.tryRunTransaction(
        scene,
        () => {
          nodes.forEach((node) => {
            node.beginUpdate();
            const layers = this._getPaintLayers(node);
            if (Array.isArray(layers))
              layers.forEach((layer) => {
                layer.setProperty("_vs", visible);
              });
            node.endUpdate();
          });
        },
        Locale.get(TogglePaintLayersVisibilityAction.TITLE as LocaleKey) as string,
      );
  }

  /** Mixed visibility hides them all; all hidden shows them; all visible hides them. */
  override execute(): void {
    const document = viewDesigner().getActiveDocument();
    const scene = document && document.getScene();
    const editor = document && document.getEditor();
    const selection = editor && (editor.getSelection() as Node[] | null);
    if (scene) {
      scene.beginUpdate();
      try {
        if (Array.isArray(selection) && selection.length > 0) {
          const nodes = this._getSingleLevelSelection(selection);
          const { hasHiddenPaintLayers, hasVisiblePaintLayers } =
            this._checkPaintLayersVisibility(nodes);
          if (!hasHiddenPaintLayers && !hasVisiblePaintLayers) return;
          if (hasHiddenPaintLayers && hasVisiblePaintLayers)
            this._setVisibilityPaintLayersState(nodes, false);
          else this._setVisibilityPaintLayersState(nodes, hasHiddenPaintLayers);
        }
      } finally {
        scene.endUpdate();
      }
    }
  }

  override toString(): string {
    return "[Object GTogglePaintLayersVisibilityAction]";
  }
}
