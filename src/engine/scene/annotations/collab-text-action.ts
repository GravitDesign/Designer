// Old: chunk.vendor.js module 1000 (no G name; the "A" button of GCollabText).
/**
 * The button on a collaborative text (GCollabText) that opens the inline
 * text editor: a green 24 by 24 circle with a white "A" and a speech
 * bubble. Its size is what GCollabText adds above its paint box.
 *
 * port-map.tsv first listed this module as dead code; it was moved to
 * "port" because GCollabText's constructor adds it.
 */
import { RGBColor } from "../../color/rgb-color.ts";
import { Vertex } from "../../geometry/vertex.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { VertexTransformer } from "../../geometry/vertex-transformer.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import type { PaintContext } from "../../paint/paint-context.ts";
import { ActionItem } from "./action-item.ts";

/** What `execute` needs from the editor. */
export interface InlineTextEditor {
  isInlineEditing(): boolean;
  closeInlineEditor(): void;
  updateSelection(toggle: boolean, elements: unknown[]): void;
  openInlineEditor(element: unknown, event: unknown): void;
}

const C = Vertex.Command;

/** [command, x, y] triples. */
// prettier-ignore
const OUTER: readonly number[] = [
  C.Move, 0, 12,
  C.Curve2, 12, 0,
  C.Curve2, 0, 5.377,
  C.Curve2, 5.377, 0,
  C.Curve2, 24, 12,
  C.Curve2, 18.623, 0,
  C.Curve2, 24, 5.377,
  C.Curve2, 12, 24,
  C.Curve2, 24, 18.623,
  C.Curve2, 18.623, 24,
  C.Curve2, 0, 12,
  C.Curve2, 5.377, 24,
  C.Curve2, 0, 18.623,
  C.Close, 0, 0,
];

// prettier-ignore
const INNER: readonly number[] = [
  // The bubble's inner frame.
  C.Move, 16.5, 6,
  C.Line, 13.5, 6,
  C.Curve2, 13, 6.5,
  C.Curve2, 13.224, 6,
  C.Curve2, 13, 6.224,
  C.Line, 13, 6.5,
  C.Line, 13, 8.5,
  C.Curve2, 13.5, 9,
  C.Curve2, 13, 8.776,
  C.Curve2, 13.224, 9,
  C.Line, 13.5, 9,
  C.Line, 16.5, 9,
  C.Curve2, 17, 8.5,
  C.Curve2, 16.776, 9,
  C.Curve2, 17, 8.776,
  C.Line, 17, 8.5,
  C.Line, 17, 6.5,
  C.Curve2, 16.5, 6,
  C.Curve2, 17, 6.224,
  C.Curve2, 16.776, 6,
  C.Line, 16.5, 6,
  C.Line, 16.5, 6,
  C.Close, 0, 0,
  // The bubble.
  C.Move, 17, 5,
  C.Curve2, 18, 6,
  C.Curve2, 17.552, 5,
  C.Curve2, 18, 5.448,
  C.Line, 18, 9,
  C.Curve2, 17, 10,
  C.Curve2, 18, 9.552,
  C.Curve2, 17.552, 10,
  C.Line, 14, 10,
  C.Line, 13, 11.5,
  C.Line, 13, 10,
  C.Curve2, 12, 9,
  C.Curve2, 12.448, 10,
  C.Curve2, 12, 9.552,
  C.Line, 12, 6,
  C.Curve2, 13, 5,
  C.Curve2, 12, 5.448,
  C.Curve2, 12.448, 5,
  C.Line, 17, 5,
  C.Line, 17, 5,
  C.Close, 0, 0,
  // The counter of the "A".
  C.Move, 9.99, 9.707,
  C.Line, 9.821, 10.183,
  C.Curve2, 9.407, 11.362,
  C.Curve2, 9.709, 10.5,
  C.Curve2, 9.571, 10.893,
  C.Line, 8.917, 12.768,
  C.Curve2, 8.503, 13.947,
  C.Curve2, 8.753, 13.237,
  C.Curve2, 8.615, 13.63,
  C.Line, 8.334, 14.423,
  C.Line, 11.762, 14.423,
  C.Line, 10.107, 9.707,
  C.Line, 9.99, 9.707,
  C.Line, 9.99, 9.707,
  C.Close, 0, 0,
  // The "A".
  C.Move, 13.212, 18.569,
  C.Line, 13.051, 18.111,
  C.Curve2, 12.681, 17.056,
  C.Curve2, 12.944, 17.806,
  C.Curve2, 12.821, 17.454,
  C.Curve2, 12.312, 16.002,
  C.Curve2, 12.542, 16.658,
  C.Curve2, 12.419, 16.307,
  C.Line, 12.15, 15.544,
  C.Line, 7.946, 15.544,
  C.Line, 6.884, 18.569,
  C.Line, 5.5, 18.569,
  C.Line, 9.397, 8,
  C.Line, 10.7, 8,
  C.Line, 14.597, 18.569,
  C.Line, 13.212, 18.569,
  C.Line, 13.212, 18.569,
  C.Close, 0, 0,
];

function toContainer(data: readonly number[]): VertexContainer {
  const container = new VertexContainer();
  for (let i = 0; i < data.length; i += 3) {
    container.addVertex(data[i] as number, data[i + 1] as number, data[i + 2] as number);
  }
  return container;
}

// Built on first use and shared, as in the old module.
let outerVertices: VertexContainer | null = null;
let innerVertices: VertexContainer | null = null;
let sourceBBox: Rect | null = null;

export class CollabTextAction extends ActionItem {
  override paint(context: PaintContext, transform: Transform): void {
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    canvas.putVertices(new VertexTransformer(this._getOuterVertices(), transform));
    canvas.fillVertices("#2CBE2D", 1);
    canvas.putVertices(new VertexTransformer(this._getInnerVertices(), transform));
    canvas.fillVertices(RGBColor.WHITE, 1);
  }

  override getSourceBBox(): Rect {
    if (!sourceBBox)
      sourceBBox = VertexInfo.calculateBounds(this._getOuterVertices(), true) as Rect;
    return sourceBBox;
  }

  /** Opens the inline editor on the text (closing one that is open first). */
  override execute(element: unknown, editor: unknown, event: unknown): void {
    const inline = editor as InlineTextEditor;
    if (inline.isInlineEditing()) inline.closeInlineEditor();
    inline.updateSelection(false, [element]);
    inline.openInlineEditor(element, event);
  }

  _getOuterVertices(): VertexContainer {
    if (!outerVertices) outerVertices = toContainer(OUTER);
    return outerVertices;
  }

  _getInnerVertices(): VertexContainer {
    if (!innerVertices) innerVertices = toContainer(INNER);
    return innerVertices;
  }
}
