// Replays gradientCases (gradient-editors.cases.ts) on the ported editors
// and compares with the same runs recorded in the old app.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import { Group } from "../../engine/scene/group.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { AngularGradientEditor } from "./angular-gradient-editor.ts";
import { gradientCases, type GradientLib } from "./gradient-editors.cases.ts";
import recorded from "./gradient-editors.fixture.json";
import { GradientStyleEditor } from "./gradient-style-editor.ts";
import { GroupEditor } from "./group-editor.ts";
import { LinearGradientEditor } from "./linear-gradient-editor.ts";
import { PageEditor } from "./page-editor.ts";
import { RadialGradientEditor } from "./radial-gradient-editor.ts";
import { RectangleEditor } from "./rectangle-editor.ts";

const lib = {
  Point,
  Transform,
  RGBColor,
  Rectangle,
  Group,
  Page,
  FillPaintLayer,
  OverlayEffect,
  LinearGradient,
  RadialGradient,
  AngularGradient,
  RectangleEditor,
  GroupEditor,
  PageEditor,
  LinearGradientEditor,
  RadialGradientEditor,
  AngularGradientEditor,
  GradientStyleEditor,
} as unknown as GradientLib;

// The handles are drawn from canvases.
let uninstall: () => void;
let actual: Record<string, unknown>;
beforeAll(() => {
  uninstall = installFakeCanvas();
  // Through JSON, like the recording, so -0 and undefined compare the same way.
  actual = JSON.parse(JSON.stringify(gradientCases(lib))) as Record<string, unknown>;
});
afterAll(() => uninstall());

const expected = recorded as Record<string, unknown>;

describe("gradient editors, recorded in the old app", () => {
  it("covers every recorded case", () => {
    expect(Object.keys(actual)).toEqual(Object.keys(expected));
  });

  const groups: [string, string[]][] = [
    [
      "radial: y-leading end handle (scale, skew, flat dy), last stop as end",
      [
        "radialYLeadingEnd",
        "radialYLeadingEndAgain",
        "radialYLeadingEndFlat",
        "radialYLeadingLastStop",
      ],
    ],
    [
      "radial: middle stop slide, clamp and snap on both axes",
      ["radialMiddleStop", "radialMiddleStopYLeading"],
    ],
    [
      "radial: stop 0 as focal handle, Shift on start and end",
      ["radialFocalStop", "radialStartShift", "radialEndShift"],
    ],
    [
      "angular: middle stop wraps past the start angle and clamps, Shift",
      ["angularMiddleStop", "angularMiddleStopTurned", "angularStopShift", "angularEndShift"],
    ],
    ["angular: paints line, unit circle and handles", ["angularPaint", "angularPaintScaled"]],
    ["other holders: effect, group effect, page pattern", ["effect", "group", "page"]],
    ["linear: resetPartMove drops the move", ["linearReset"]],
  ];
  for (const [title, keys] of groups) {
    it(title, () => {
      for (const key of keys) expect([key, actual[key]]).toEqual([key, expected[key]]);
    });
  }
});
