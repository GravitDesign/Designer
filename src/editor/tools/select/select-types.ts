/**
 * Shapes of the data the select tools pass around: part infos of the
 * element editors, guide line hits and the targets a move can drop into.
 */
import type { Rect } from "../../../engine/math/rect.ts";
import type { Element } from "../../../engine/scene/element.ts";
import type { BaseEditor, PartInfo } from "../../element-editors/base-editor.ts";

/** A ruler guide line near the pointer: horizontal (hgl) or vertical (vgl), by index. */
export interface GuideLineHit {
  isVertical: boolean;
  guideIndex: number;
}

/** The editor that owns a part (compound path children), as the part data names it. */
export interface OwnerEditor extends BaseEditor {
  getElement(): Element;
}

/**
 * The `data` of a part info, as far as the select tool reads it. Each
 * element editor puts its own fields there; these are the ones the tool
 * looks at.
 */
export interface PartData {
  side?: string;
  type?: number;
  hitRes?: unknown;
  ownerEditor?: OwnerEditor | null;
  noEditorSelectionChangedEvent?: unknown;
  rightButton?: { isolated?: unknown; selectable?: unknown } | null;
}

/** The part data of `info`, or null. */
export function partData(info: PartInfo | null | undefined): PartData | null {
  return info && info.data ? (info.data as PartData) : null;
}

/**
 * A move that drops `source` into `target`: an image into a shape or
 * image grid (image mask), or an element onto another page.
 * `sourceBox` is the source's box with its page offset.
 */
export interface AddCandidate {
  target: Element;
  source: Element;
  sourceBox: Rect;
}
