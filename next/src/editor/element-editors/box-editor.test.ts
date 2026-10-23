import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor } from "./base-editor.ts";
import type { EdTransformOptions } from "./box-editor.ts";
import { BoxEditor, type ResizePartData } from "./box-editor.ts";

/** A box editor over a fixed 100 x 50 box at the origin. */
class FixedBoxEditor extends BoxEditor {
  boxTransform: Transform | null = null;

  override getBox(): Rect | null {
    return new Rect(0, 0, 100, 50);
  }

  override getBoxTransform(): Transform | null {
    return this.boxTransform;
  }
}

/** Recorded from the old app (GBoxEditor with getBox replaced, adaptive handles on). */
interface AdaptiveCase {
  w: number;
  h: number;
  m: [number, number, number, number, number, number];
  handlesBox: number[];
  handles: [string, number, number, number][];
  parts: [string, string | null, number[] | null, number[] | null][];
}
const here = dirname(fileURLToPath(import.meta.url));
const oldAdaptive = JSON.parse(
  readFileSync(resolve(here, "__fixtures__", "old-box-editor-adaptive.json"), "utf8"),
) as AdaptiveCase[];

const identity = new Transform();
const noGuides = { mapPoint: (p: Point) => p };

function selected(): FixedBoxEditor {
  const editor = new FixedBoxEditor();
  editor.setFlag(BaseEditor.Flag.Selected);
  return editor;
}

const partAt = (editor: BoxEditor, x: number, y: number) =>
  editor.getPartInfoAt(new Point(x, y), identity);

describe("GBoxEditor", () => {
  it("starts with all handles on", () => {
    const editor = new FixedBoxEditor();
    expect(editor.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeCenters)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(true);
  });

  it("hits the resize handles with their side and cursor", () => {
    const editor = selected();
    const corner = partAt(editor, 1, 1);
    expect(corner?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    expect((corner?.data as ResizePartData).side).toBe(Rect.Side.TOP_LEFT);
    expect(editor.getCursor(corner?.id, corner?.data)).toBe(Cursor.SelectResizeUpLeftDownRight);
    const right = partAt(editor, 100, 25);
    expect((right?.data as ResizePartData).side).toBe(Rect.Side.RIGHT_CENTER);
    expect(editor.getCursor(right?.id, right?.data)).toBe(Cursor.SelectResizeHoriz);
    const top = partAt(editor, 50, 0);
    expect(editor.getCursor(top?.id, top?.data)).toBe(Cursor.SelectResizeVert);
    const bottom = partAt(editor, 50, 50);
    expect(editor.getCursor(bottom?.id, bottom?.data)).toBe(Cursor.SelectResizeVert);
    const bottomLeft = partAt(editor, 0, 50);
    expect(editor.getCursor(bottomLeft?.id, bottomLeft?.data)).toBe(
      Cursor.SelectResizeUpRightDownLeft,
    );
    // Inside the box, away from the handles: nothing of the box editor.
    expect(partAt(editor, 30, 25)).toBeNull();
  });

  it("puts the rotation handle above the box and rotation zones off the corners", () => {
    const editor = selected();
    const handle = partAt(editor, 50, -22);
    expect(handle?.id).toBe(BoxEditor.ROTATION_HANDLE_PART_ID);
    expect(editor.getCursor(handle?.id, handle?.data)).toBe(Cursor.SelectRotateRound);
    const zone = partAt(editor, 108, 58);
    expect(zone?.id).toBe(BoxEditor.ROTATION_HANDLE_PART_ID);
    expect(editor.getCursor(zone?.id, zone?.data)).toBe(
      Cursor.SelectRotate[(zone?.data as { rotSegment: number }).rotSegment],
    );
    // The handle follows a mirrored box to the other side.
    editor.boxTransform = new Transform(1, 0, 0, -1, 0, 50);
    expect(partAt(editor, 50, 72)?.id).toBe(BoxEditor.ROTATION_HANDLE_PART_ID);
  });

  it("has no handles when not selected or while outlined", () => {
    const editor = new FixedBoxEditor();
    expect(partAt(editor, 1, 1)).toBeNull();
    editor.setFlag(BaseEditor.Flag.Selected);
    editor.setFlag(BaseEditor.Flag.Outline);
    expect(partAt(editor, 1, 1)).toBeNull();
  });

  it("previews a resize handle drag as a resize transform and remembers the move", () => {
    const editor = selected();
    const part = partAt(editor, 100, 50);
    const result = editor.movePart(
      part?.id,
      part?.data,
      new Point(120, 60),
      identity,
      noGuides,
      false,
      false,
    ) as Transform;
    expect(result.getMatrix()).toEqual([1.2, 0, 0, 1.2, 0, 0]);
    expect(editor._transform).toBe(result);
    expect(editor._storedMoveData).toMatchObject({ side: "br", dx: 20, dy: 10 });
    expect(editor.hasFlag(BaseEditor.Flag.Outline)).toBe(true);
    // Option resizes from the centre.
    const centred = editor.movePart(
      part?.id,
      part?.data,
      new Point(120, 60),
      identity,
      noGuides,
      false,
      true,
    ) as Transform;
    expect(centred.mapPoint(new Point(50, 25)).getX()).toBeCloseTo(50, 10);
    editor.resetTransform();
    expect(editor._transform).toBeNull();
    expect(editor._storedMoveData).toBeNull();
  });

  it("rotates around the box centre, in 15 degree steps with Shift", () => {
    const editor = selected();
    const handle = partAt(editor, 50, -22);
    const options: EdTransformOptions[] = [];
    editor.edTransform = function (transform, partId, partData, opts) {
      options.push(opts as EdTransformOptions);
      BoxEditor.prototype.edTransform.call(this, transform, partId, partData, opts);
    };
    const rotation = editor.movePart(
      handle?.id,
      handle?.data,
      new Point(130, 29),
      identity,
      noGuides,
      true,
    ) as Transform;
    const center = rotation.mapPoint(new Point(50, 25));
    expect([center.getX(), center.getY()].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([50, 25]);
    // Dragging the top handle to just below the right of the centre turns
    // it a bit more than 90 degrees clockwise; Shift snaps it to 90.
    expect(rotation.getRotationFactor()).toBeCloseTo(-Math.PI / 2, 10);
    expect(options[0]?.fullContentsTransform).toBe(true);
  });

  it("grows its bbox by the handles", () => {
    const editor = selected();
    const box = editor.getBBox(identity) as Rect;
    expect(box.getY()).toBeLessThan(-22);
    expect(box.getX()).toBeLessThan(0);
    editor.removeFlag(BaseEditor.Flag.Selected);
    expect(editor.getBBox(identity)).toBeNull();
  });

  it("grows the handle box of a small box with adaptive handles, as the old app did", () => {
    EditorOptions.adaptiveResizeHandles = true;
    try {
      for (const recorded of oldAdaptive) {
        const editor = new (class extends BoxEditor {
          override getBox(): Rect | null {
            return new Rect(0, 0, recorded.w, recorded.h);
          }
        })();
        editor.setFlag(BaseEditor.Flag.Selected);
        const view = new Transform(...recorded.m);
        const handlesBox = editor._getResizeHandlesBBox(view) as Rect;
        const handles: [string, number, number, number][] = [];
        editor._iterateResizeHandles((point, side, segment) => {
          handles.push([side, point.getX(), point.getY(), segment as number]);
          return undefined;
        }, view);
        const parts: AdaptiveCase["parts"] = [];
        for (const [side, x, y] of handles) {
          const viewPoint = view.mapPoint(new Point(x, y));
          const part = editor.getPartInfoAt(viewPoint, view);
          if (!part || part.id !== BoxEditor.RESIZE_HANDLE_PART_ID) {
            parts.push([side, null, null, null]);
            continue;
          }
          const data = part.data as ResizePartData;
          // Pressing and "dragging" to the same spot resizes nothing.
          const resize = editor.movePart(
            part.id,
            data,
            viewPoint,
            view.inverted() as Transform,
            noGuides,
            false,
            false,
          ) as Transform | null;
          parts.push([
            side,
            data.side,
            data.offset ? [data.offset.getX(), data.offset.getY()] : null,
            resize ? resize.getMatrix() : null,
          ]);
          editor.resetTransform();
        }
        expect({
          size: [recorded.w, recorded.h, recorded.m],
          handlesBox: [
            handlesBox.getX(),
            handlesBox.getY(),
            handlesBox.getWidth(),
            handlesBox.getHeight(),
          ],
          handles,
          parts,
        }).toEqual({
          size: [recorded.w, recorded.h, recorded.m],
          handlesBox: recorded.handlesBox,
          handles: recorded.handles,
          parts: recorded.parts,
        });
      }
    } finally {
      EditorOptions.adaptiveResizeHandles = false;
    }
  });
});
