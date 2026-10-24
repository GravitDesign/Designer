// Gradient editor runs shared by gradient-editors.test.ts and the scratch
// script that recorded gradient-editors.fixture.json in the old app. The
// body only uses what `lib` hands it, so the same steps run on the old
// modules (chunk.vendor.js, through window.__wpRequire) and on the ports;
// keep it free of imports.
import type { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Group } from "../../engine/scene/group.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Rectangle } from "../../engine/scene/rectangle.ts";
import type { AngularGradient } from "../../engine/style/angular-gradient.ts";
import type { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";
import type { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { Gradient } from "../../engine/style/gradient.ts";
import type { LinearGradient } from "../../engine/style/linear-gradient.ts";
import type { RadialGradient } from "../../engine/style/radial-gradient.ts";
import type { StyleEdManager } from "../style-ed-manager.ts";
import type { AngularGradientEditor } from "./angular-gradient-editor.ts";
import type { BaseEditor } from "./base-editor.ts";
import type { GradientStyleEditor } from "./gradient-style-editor.ts";
import type { GroupEditor } from "./group-editor.ts";
import type { LinearGradientEditor } from "./linear-gradient-editor.ts";
import type { PageEditor } from "./page-editor.ts";
import type { RadialGradientEditor } from "./radial-gradient-editor.ts";
import type { RectangleEditor } from "./rectangle-editor.ts";

type Stop = { position: number; color: RGBColor; opacity: number };

/** The classes the runs use, old or new. */
export interface GradientLib {
  Point: new (x: number, y: number) => Point;
  Transform: new (
    a?: number,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
  ) => Transform;
  RGBColor: new (rgb: number[]) => RGBColor;
  Rectangle: new (x: number, y: number, w: number, h: number) => Rectangle;
  Group: new () => Group;
  Page: new () => Page;
  FillPaintLayer: new () => FillPaintLayer;
  OverlayEffect: new () => OverlayEffect;
  LinearGradient: new (stops?: Stop[]) => LinearGradient;
  RadialGradient: new (stops?: Stop[]) => RadialGradient;
  AngularGradient: new (stops?: Stop[]) => AngularGradient;
  RectangleEditor: new (element: never) => RectangleEditor;
  GroupEditor: new (element: never) => GroupEditor;
  PageEditor: new (element: never) => PageEditor;
  LinearGradientEditor: typeof LinearGradientEditor;
  RadialGradientEditor: typeof RadialGradientEditor;
  AngularGradientEditor: typeof AngularGradientEditor;
  GradientStyleEditor: typeof GradientStyleEditor;
}

/** Runs every case and returns plain data (numbers, strings, arrays). */
export function gradientCases(lib: GradientLib): Record<string, unknown> {
  const P = (x: number, y: number) => new lib.Point(x, y);
  const I = new lib.Transform();
  const STOP = lib.GradientStyleEditor.STOP_HANDLE_PART_ID;
  const R = lib.RadialGradientEditor;
  const A = lib.AngularGradientEditor;

  const num = (v: number) => (Object.is(v, -0) ? 0 : v);
  const pt = (p: Point | null | undefined) => (p ? [num(p.getX()), num(p.getY())] : null);
  const matrix = (t: Transform | null | undefined) => (t ? t.getMatrix().map((v) => num(v)) : null);
  const stops3 = (): Stop[] => [
    { position: 0, color: new lib.RGBColor([255, 255, 255]), opacity: 1 },
    { position: 0.5, color: new lib.RGBColor([255, 0, 0]), opacity: 1 },
    { position: 1, color: new lib.RGBColor([0, 0, 0]), opacity: 1 },
  ];

  const manager = {
    getScene: () => null,
    getActiveEditor: () => null,
    notifyDeactivated: () => undefined,
    blockEditorUpdate: () => undefined,
    releaseEditorUpdate: () => undefined,
    preparePermanentChange: () => undefined,
    beginTransaction: () => undefined,
    commitTransaction: () => undefined,
    handleEditorPartUpdate: () => undefined,
    updateActiveEditorCursor: () => undefined,
  } as unknown as StyleEdManager;

  /** A 200 x 120 rectangle at (100, 100) whose fill holds `gradient`, edited. */
  const onRect = <E extends GradientStyleEditor>(editor: E, gradient: Gradient) => {
    const rect = new lib.Rectangle(100, 100, 200, 120);
    const fill = new lib.FillPaintLayer();
    fill.setProperty("_pt", gradient);
    (rect.getPaintLayers() as unknown as { appendChild(n: unknown): void }).appendChild(fill);
    editor._manager = manager;
    const ok = editor.activate({
      parentEditor: new lib.RectangleEditor(rect as never),
      propName: "_pt",
      propHolder: fill as unknown as PropertiesNode,
    });
    return { editor, rect, fill, ok };
  };
  const temp = (fill: FillPaintLayer) => fill.getProperty("_pt", false, null, true) as Gradient;
  const state = (g: Gradient) => {
    const any = g as unknown as Record<string, number>;
    return {
      fx: any._fx,
      fy: any._fy,
      cx: any._cx,
      cy: any._cy,
      scale: any._scale,
      a0: any._a0,
      t: matrix(g.getTransform()),
      stops: g.getStops().map((s) => s.position),
    };
  };
  const pivots = (e: RadialGradientEditor | AngularGradientEditor) =>
    (e._getPivotPoints() ?? []).map(pt);
  const move = (
    e: GradientStyleEditor,
    part: unknown,
    x: number,
    y: number,
    shift?: boolean,
    data?: unknown,
  ) => e.movePart(part, data ?? null, P(x, y), I, null, !!shift, false);

  const out: Record<string, unknown> = {};

  // R6-B-012: radial editor branches.
  {
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    editor.updatePartSelection(false, [R.EXTRA_HANDLE_PART_ID]);
    move(editor, R.END_HANDLE_PART_ID, 230, 70);
    out.radialYLeadingEnd = { xLeading: editor._xLeading, g: state(temp(fill)), p: pivots(editor) };
    move(editor, R.END_HANDLE_PART_ID, 180, 40);
    out.radialYLeadingEndAgain = { g: state(temp(fill)), p: pivots(editor) };
  }
  {
    // Level with the centre: dy is 0, defaultEps keeps the skew finite.
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    editor.updatePartSelection(false, [R.EXTRA_HANDLE_PART_ID]);
    move(editor, R.END_HANDLE_PART_ID, 240, 160);
    out.radialYLeadingEndFlat = { g: state(temp(fill)), p: pivots(editor) };
  }
  {
    // The last stop at 1 acts as the end handle on the y axis too.
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    editor.updatePartSelection(false, [R.EXTRA_HANDLE_PART_ID]);
    move(editor, { type: STOP, idx: 1 }, 215, 60);
    out.radialYLeadingLastStop = { g: state(temp(fill)), p: pivots(editor) };
  }
  {
    const { editor, fill } = onRect(
      new lib.RadialGradientEditor(),
      new lib.RadialGradient(stops3()),
    );
    const part = { type: STOP, idx: 1 };
    const seen: unknown[] = [];
    for (const [x, y] of [
      [275, 172],
      [340, 160],
      [299.99, 160],
      [200.5, 160],
      [200.005, 160],
      [150, 150],
    ] as const) {
      move(editor, part, x, y);
      seen.push(state(temp(fill)).stops);
    }
    out.radialMiddleStop = seen;
  }
  {
    const { editor, fill } = onRect(
      new lib.RadialGradientEditor(),
      new lib.RadialGradient(stops3()),
    );
    editor.updatePartSelection(false, [R.EXTRA_HANDLE_PART_ID]);
    // The extra handle click selects the last stop; slide the middle one.
    const seen: unknown[] = [];
    for (const [x, y] of [
      [205, 125],
      [230, 90],
    ] as const) {
      move(editor, { type: STOP, idx: 1 }, x, y);
      seen.push(state(temp(fill)).stops);
    }
    out.radialMiddleStopYLeading = seen;
  }
  {
    // Stop 0 at position 0 is the focal handle.
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    move(editor, { type: STOP, idx: 0 }, 230, 175);
    out.radialFocalStop = state(temp(fill));
  }
  {
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    move(editor, R.START_HANDLE_PART_ID, 243, 176, true);
    out.radialStartShift = state(temp(fill));
  }
  {
    const { editor, fill } = onRect(new lib.RadialGradientEditor(), new lib.RadialGradient());
    move(editor, R.END_HANDLE_PART_ID, 330, 205, true);
    out.radialEndShift = { g: state(temp(fill)), p: pivots(editor) };
  }

  // R6-B-013: angular middle stop, Shift and paint.
  {
    const { editor, fill } = onRect(
      new lib.AngularGradientEditor(),
      new lib.AngularGradient(stops3()),
    );
    const seen: unknown[] = [];
    for (const [x, y] of [
      [200, 100],
      [260, 110],
      [300, 150],
      [300, 172],
      [120, 200],
      [100, 160],
    ] as const) {
      move(editor, { type: STOP, idx: 1 }, x, y);
      seen.push(state(temp(fill)).stops);
    }
    out.angularMiddleStop = seen;
  }
  {
    // Turned start angle first, then a stop dragged across it.
    const { editor, fill } = onRect(
      new lib.AngularGradientEditor(),
      new lib.AngularGradient(stops3()),
    );
    move(editor, A.END_HANDLE_PART_ID, 300, 220);
    const seen: unknown[] = [state(temp(fill))];
    for (const [x, y] of [
      [160, 230],
      [240, 230],
      [300, 120],
      // Below the start angle: wraps by 2 PI.
      [300, 175],
    ] as const) {
      move(editor, { type: STOP, idx: 1 }, x, y);
      seen.push(state(temp(fill)).stops);
    }
    out.angularMiddleStopTurned = seen;
  }
  {
    const { editor, fill } = onRect(
      new lib.AngularGradientEditor(),
      new lib.AngularGradient(stops3()),
    );
    move(editor, { type: STOP, idx: 1 }, 133, 107, true);
    out.angularStopShift = state(temp(fill)).stops;
    move(editor, A.END_HANDLE_PART_ID, 380, 170, true);
    out.angularEndShift = state(temp(fill));
  }
  {
    const { editor } = onRect(new lib.AngularGradientEditor(), new lib.AngularGradient(stops3()));
    editor.updatePartSelection(false, [{ type: STOP, idx: 1 }]);
    const paint = (transform: Transform) => {
      const calls: unknown[] = [];
      const value = (v: unknown): unknown => {
        if (typeof v === "number") return num(v);
        if (v === null || v === undefined || typeof v !== "object") return v ?? null;
        if (Array.isArray(v)) return v.map(value);
        const o = v as Record<string, unknown>;
        if (typeof o.getMatrix === "function") return ["T", matrix(v as Transform)];
        if (typeof o.getX === "function") return ["P", pt(v as Point)];
        if (typeof o.toScreenCSS === "function") return ["C", (o.toScreenCSS as () => string)()];
        if (typeof o.readVertex === "function" && typeof o.rewindVertices === "function") {
          // A vertex source: its vertices, read the way the canvas reads them.
          const source = o as unknown as {
            rewindVertices(i: number): boolean;
            readVertex(v: { command: number; x: number; y: number }): boolean;
          };
          const vertices: number[] = [];
          const vertex = { command: 0, x: 0, y: 0 };
          source.rewindVertices(0);
          while (source.readVertex(vertex))
            vertices.push(vertex.command, num(vertex.x), num(vertex.y));
          return ["V", vertices];
        }
        // A handle image (canvas): its size tells big and small handles apart.
        if (typeof o.width === "number" && typeof o.height === "number") {
          return ["I", o.width, o.height];
        }
        return "object";
      };
      const canvas = new Proxy(
        {},
        {
          get: (_t, name) => {
            if (name === "getTransform") return () => new lib.Transform();
            return (...args: unknown[]) => {
              calls.push([String(name), ...args.map(value)]);
              return undefined;
            };
          },
        },
      );
      const context = {
        canvas,
        selectionOutlineColor: new lib.RGBColor([40, 128, 230]),
      } as unknown as PaintContext;
      (editor as unknown as BaseEditor).paint(transform, context as never);
      return calls;
    };
    out.angularPaint = paint(I);
    out.angularPaintScaled = paint(new lib.Transform(2, 0, 0, 2, -50, -30));
  }

  // R6-B-033: other property holders and the linear reset.
  {
    const rect = new lib.Rectangle(100, 100, 200, 120);
    rect.transform(new lib.Transform(0.8, 0.6, -0.6, 0.8, 0, 0));
    const fill = new lib.FillPaintLayer();
    fill.setProperty("_pt", new lib.LinearGradient());
    (rect.getPaintLayers() as unknown as { appendChild(n: unknown): void }).appendChild(fill);
    const effects = rect.getEffects() as unknown as { appendChild(n: unknown): void };
    effects.appendChild(new lib.OverlayEffect());
    const effect = new lib.OverlayEffect();
    effect.setProperty("pat", new lib.LinearGradient());
    effects.appendChild(effect);
    const viaFill = new lib.LinearGradientEditor();
    viaFill._manager = manager;
    viaFill.activate({
      parentEditor: new lib.RectangleEditor(rect as never),
      propName: "_pt",
      propHolder: fill as unknown as PropertiesNode,
    });
    const viaEffect = new lib.LinearGradientEditor();
    viaEffect._manager = manager;
    const ok = viaEffect.activate({
      parentEditor: new lib.RectangleEditor(rect as never),
      propName: "pat",
      propHolder: effect as unknown as PropertiesNode,
    });
    viaEffect.updatePartSelection(false, [{ type: STOP, idx: 1 }], true);
    out.effect = {
      ok,
      componentOfEffect: viaEffect._componentOfEffect,
      data: viaEffect.getEditorData(),
      composite: matrix(viaEffect._getCompositeTransform(true)),
      points: viaEffect._getAnnotationPoints().map(pt),
      fillComposite: matrix(viaFill._getCompositeTransform(true)),
      fillPoints: viaFill._getAnnotationPoints().map(pt),
      bboxElemIsRect: viaEffect._getBBoxElem() === rect,
    };
  }
  {
    const group = new lib.Group();
    const rect = new lib.Rectangle(100, 100, 200, 120);
    (group as unknown as { appendChild(n: unknown): void }).appendChild(rect);
    // Groups have no paint layers; an overlay effect on the group walks up
    // to it.
    const effect = new lib.OverlayEffect();
    effect.setProperty("pat", new lib.RadialGradient());
    (group.getEffects() as unknown as { appendChild(n: unknown): void }).appendChild(effect);
    const editor = new lib.RadialGradientEditor();
    editor._manager = manager;
    const ok = editor.activate({
      parentEditor: new lib.GroupEditor(group as never),
      propName: "pat",
      propHolder: effect as unknown as PropertiesNode,
    });
    out.group = {
      ok,
      bboxElemIsGroup: editor._getBBoxElem() === group,
      data: editor.getEditorData(),
      composite: matrix(editor._getCompositeTransform(true)),
      pivots: pivots(editor),
    };
  }
  {
    const page = new lib.Page();
    page.setProperties(["x", "y", "w", "h"], [20, 30, 400, 300]);
    page.setProperty("bck", new lib.AngularGradient());
    const editor = new lib.AngularGradientEditor();
    editor._manager = manager;
    const ok = editor.activate({
      parentEditor: new lib.PageEditor(page as never),
      propName: "bck",
      propHolder: page as unknown as PropertiesNode,
    });
    out.page = {
      ok,
      data: editor.getEditorData(),
      bboxElem: editor._getBBoxElem() === null ? null : "other",
      composite: matrix(editor._getCompositeTransform(true)),
    };
  }
  {
    const { editor, fill } = onRect(new lib.LinearGradientEditor(), new lib.LinearGradient());
    const part = { type: STOP, idx: 1 };
    move(editor, part, 280, 220);
    const moved = {
      scaleDelta: editor._scaleDelta,
      angleDelta: editor._angleDelta,
      t: matrix(editor._gradient.getTransform()),
      points: editor._getAnnotationPoints().map(pt),
    };
    editor.resetPartMove(part, null);
    out.linearReset = {
      moved,
      scaleDelta: editor._scaleDelta,
      angleDelta: editor._angleDelta,
      t: matrix(editor._gradient.getTransform()),
      points: editor._getAnnotationPoints().map(pt),
      saved: state(fill.getProperty("_pt") as Gradient),
      temporary: state(temp(fill)),
    };
  }
  return out;
}
