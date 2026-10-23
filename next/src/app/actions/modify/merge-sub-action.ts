// Old: designer.browser.dev.js module 1600 (GMergeSubAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { VertexPolyBoolean } from "../../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import type { StylableNode } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import type { Editor } from "../../../editor/editor.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, richTooltipVideoUrl, TOOLTIP_AREA } from "../deps.ts";
import { activeDocument } from "../host.ts";
import { SubAction } from "../sub-action.ts";
import { MergeMainAction } from "./merge-main-action.ts";

const Type = {
  Union: "union",
  Subtract: "subtract",
  Intersect: "intersect",
  Difference: "difference",
} as const;

const TransactionType = { Merge: "merge", Combine: "combine" } as const;

type Updatable = { beginUpdate(): void; endUpdate(): void };
type StyledNode = Node & { getPaintLayers(): PaintLayers };

/**
 * The tooltips of the boolean buttons. The old module built them at load;
 * they are built on first use here, because a module must not reach the
 * locale and the widgets at load (UI.md section 9). The text is the same.
 */
let tooltipConfig: Record<string, Record<string, unknown>> | null = null;

function buildTooltipConfig(): Record<string, Record<string, unknown>> {
  const tooltip = (key: string, video: string) =>
    richTooltipConfig({
      title: Locale.getValue("GMergeSubAction", "tooltip." + key + ".title"),
      description: Locale.getValue("GMergeSubAction", "tooltip." + key + ".description"),
      video: richTooltipVideoUrl(video),
      middle: false,
      learnMore: "",
    });
  return {
    [TOOLTIP_AREA.TOOLBAR]: {
      [Type.Union]: tooltip("union", "Boolean_Union.mp4"),
      // "substract" is the old key.
      [Type.Subtract]: tooltip("substract", "Boolean_Subtract.mp4"),
      [Type.Intersect]: tooltip("intersect", "Boolean_Intersect.mp4"),
      [Type.Difference]: tooltip("difference", "Boolean_Difference.mp4"),
    },
  };
}

/**
 * Union, Subtract, Intersect and Difference ("modify.merge.<type>"), the
 * sub-actions of Combine (merge-main-action.ts). On several shapes they
 * build a compound shape with that boolean operation; on one compound
 * shape (or one shape inside one) they change its operation instead.
 */
export class MergeSubAction extends SubAction {
  static override Type = Type;
  static TransactionType = TransactionType;

  static get TOOLTIP_CONFIG(): Record<string, Record<string, unknown>> {
    if (!tooltipConfig) tooltipConfig = buildTooltipConfig();
    return tooltipConfig;
  }

  private _transactionType: string | null;

  constructor(type: string) {
    super(type);
    this._title = new LocaleKey("GMergeSubAction", "title.".concat(this._type));
    this._transactionType = null;
  }

  protected override _getMainActionId(): string {
    return MergeMainAction.ID;
  }

  override getFullTitle(): string {
    const title = this.getTitle();
    const mainTitle = this.getMainAction().getTitle();
    return "".concat(Locale.get(mainTitle) as string, " (", Locale.get(title) as string, ")");
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_COMBINE;
  }

  override getGroup(): string {
    return "structure-boolean/combine";
  }

  override getIcon(): string | null {
    switch (this._type) {
      case Type.Union:
        return "gravit-icon-merge-union";
      case Type.Subtract:
        return "gravit-icon-merge-subtract";
      case Type.Intersect:
        return "gravit-icon-merge-intersect";
      case Type.Difference:
        return "gravit-icon-merge-difference";
      default:
        return null;
    }
  }

  override isVisible(): boolean {
    return true;
  }

  override getShortcutSubKey(): string | null {
    switch (this._type) {
      case Type.Union:
        return Key.Constant.U as string;
      case Type.Subtract:
        return Key.Constant.S as string;
      case Type.Intersect:
        return Key.Constant.I as string;
      case Type.Difference:
        return Key.Constant.X as string;
      default:
        return null;
    }
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    const nodes =
      editor && Node.order((editor.getIndividualSelection() as unknown as Node[]).slice());
    if (!nodes) return;
    editor.beginTransaction();
    const changeOperation = this._shouldChangeBooleanOperation(nodes);
    try {
      if (changeOperation) {
        this._setTransactionType(TransactionType.Merge);
        this._changeBooleanOperationType(nodes[0] as Node);
      } else {
        this._setTransactionType(TransactionType.Combine);
        this._createCompoundShape(editor, nodes);
      }
    } finally {
      editor.commitTransaction(this._getTransactionName());
    }
  }

  private _setTransactionType(type: string): void {
    this._transactionType = type;
  }

  private _getTransactionName(): string {
    return Locale.getValue(
      "GMergeSubAction",
      "transaction.".concat(this._transactionType as string),
    ) as string;
  }

  private _shouldChangeBooleanOperation(nodes: Node[]): boolean {
    const [first] = nodes as [Node];
    return (
      1 === nodes.length &&
      (first instanceof CompoundShape || 1 === MergeMainAction.getValidItems(first).length)
    );
  }

  private _changeBooleanOperationType(node: Node): void {
    const props = node as Node & { setProperty(name: string, value: unknown): unknown };
    if (
      node.getParent() instanceof CompoundShape &&
      (node instanceof CompoundShape || (node.hasMixin(VertexSource) && !(node instanceof Group)))
    ) {
      props.setProperty("bool", this._getBooleanOperationType());
      return;
    }
    if (node instanceof CompoundShape && node.getFirstChild()) {
      for (
        let child = (node.getFirstChild() as Node).getNext();
        null !== child;
        child = child.getNext()
      ) {
        (child as typeof props).setProperty("bool", this._getBooleanOperationType());
      }
    }
  }

  private _createCompoundShape(editor: Editor, nodes: Node[]): void {
    const compound = new CompoundShape();
    let parents: Set<ContainerNode> | undefined;
    let items: Node[] = [];
    nodes.forEach((node) => {
      items = items.concat(MergeMainAction.getValidItems(node));
    });
    if (items.length > 1) {
      const last = nodes[nodes.length - 1] as Node;
      let parent = last.getParent() as ContainerNode | null;
      let reference = last.getNext();
      // Walks up until the compound shape may go in (e.g. out of a group of a compound).
      while (!compound.validateInsertion(parent as ContainerNode)) {
        reference = (parent as ContainerNode).getNext();
        parent = (parent as ContainerNode).getParent();
      }
      if (!parent) return;
      parent.insertChild(compound, reference);
      try {
        const inCompound: Node[] = [];
        const others: Node[] = [];
        let firstCompound: ContainerNode | null = null;
        parents = new Set();
        items.forEach((item) => {
          if (item.getParent() instanceof CompoundShape) {
            inCompound.push(item);
            if (!firstCompound) firstCompound = item.getParent();
          } else others.push(item);
          (parents as Set<ContainerNode>).add(item.getParent() as ContainerNode);
        });
        items = inCompound.concat(others);
        const styleSource: Node = firstCompound || (items[0] as Node);
        blockChanges(
          editor,
          [...parents] as unknown as Updatable[],
          null,
          compound as unknown as Updatable,
        );
        compound.assignStyleFrom(styleSource as unknown as StylableNode);
        if (styleSource instanceof Text) {
          const text = styleSource;
          const textLayers = (text as unknown as StyledNode).getPaintLayers();
          if (!textLayers.getFillLayers(true).length && text.getProperty("_fc")) {
            const compoundLayers = (compound as unknown as StyledNode).getPaintLayers();
            compoundLayers.clearFillLayers();
            const color =
              "string" == typeof text.getProperty("_fc")
                ? RGBColor.fromCSSColor(text.getProperty("_fc") as string)
                : text.getProperty("_fc");
            compoundLayers.appendChild(
              new FillPaintLayer(color as ConstructorParameters<typeof FillPaintLayer>[0]),
            );
          }
        }
        items.forEach((item) => {
          let parentOfItem = item.getParent() as ContainerNode;
          let emptied: Node;
          if (!(
            parentOfItem === firstCompound ||
            (parentOfItem instanceof CompoundShape && this._type === Type.Union)
          )) {
            (item as Node & { setProperty(n: string, v: unknown): unknown }).setProperty(
              "bool",
              this._getBooleanOperationType(),
            );
          }
          parentOfItem.removeChild(item);
          // Groups and compounds left empty go too.
          while (
            (parentOfItem instanceof Group || parentOfItem instanceof CompoundShape) &&
            !parentOfItem.getFirstChild()
          ) {
            emptied = parentOfItem;
            parentOfItem = parentOfItem.getParent() as ContainerNode;
            parentOfItem.removeChild(emptied);
          }
          compound.appendChild(item);
        });
      } finally {
        releaseChanges(
          editor,
          parents ? ([...parents] as unknown as Updatable[]) : parents,
          null,
          compound as unknown as Updatable,
        );
      }
      editor.updateSelection(false, [compound]);
    }
  }

  private _getBooleanOperationType(): number {
    switch (this._type) {
      case Type.Union:
        return VertexPolyBoolean.OR;
      case Type.Subtract:
        return VertexPolyBoolean.SUB;
      case Type.Intersect:
        return VertexPolyBoolean.AND;
      case Type.Difference:
        return VertexPolyBoolean.XOR;
      default:
        throw new Error("Type is not valid.");
    }
  }

  override getTooltipConfig(area?: string): unknown {
    return area && MergeSubAction.TOOLTIP_CONFIG[area]
      ? (MergeSubAction.TOOLTIP_CONFIG[area] as Record<string, unknown>)[this._type]
      : null;
  }

  override toString(): string {
    return "[Object GMergeSubAction]";
  }
}
