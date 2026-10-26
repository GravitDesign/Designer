import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnchorPoint } from "../../../engine/scene/path-base.ts";
import { Path } from "../../../engine/scene/path.ts";
import "../../../editor/element-editors/path-editor.ts";
import { fire, installFakeDom, type FakeElement } from "../../color/fake-dom.testing.ts";
import { setLateModules } from "../../shell/late.ts";
import { setupDesigner, type Fixture } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { SimplifyAction } from "./simplify-action.ts";

let fixture: Fixture;

/** A selected zigzag path of 8 points. */
function selectWave(): Path {
  const p = new Path(false);
  for (let i = 0; i < 8; ++i) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [i * 20, i % 2 ? 10 : 0]);
    p.getAnchorPoints().appendChild(point);
  }
  p.setProperty("name", "Wave");
  fixture.editor.insertElements([p], true);
  fixture.editor.updateSelection(false, [p]);
  return p;
}

/**
 * A system dialog whose prompt types `typed` into the tolerance field
 * (a change event, as when the field loses focus to the OK button) and
 * confirms.
 */
function typeIntoPrompt(typed: string): { messages: string[] } {
  const seen = { messages: [] as string[] };
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        prompt(message: string, done: (value?: unknown) => void, content: unknown) {
          seen.messages.push(message);
          const input = (content as FakeElement).querySelector("input") as FakeElement;
          input.value = typed;
          fire(input, "change");
          done(true);
        },
        alert(message: string) {
          seen.messages.push("alert: " + message);
        },
      },
    },
  });
  return seen;
}

/** The tolerances the action simplifies with. */
function recordTolerances(): number[] {
  const tolerances: number[] = [];
  const original = SimplifyAction.prototype._makeSimplified;
  vi.spyOn(SimplifyAction.prototype, "_makeSimplified").mockImplementation(function (
    this: SimplifyAction,
    tolerance,
    source,
  ) {
    tolerances.push(tolerance);
    return original.call(this, tolerance, source);
  });
  return tolerances;
}

beforeEach(() => {
  installFakeDom();
  fixture = setupDesigner();
});

afterEach(() => {
  setLateModules({});
  setActionDesigner(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Simplify Path", () => {
  it("simplifies with the tolerance typed into the field (BUG-134)", () => {
    typeIntoPrompt("40");
    const tolerances = recordTolerances();
    const p = selectWave();
    new SimplifyAction().execute();
    expect(tolerances).toEqual([40]);
    expect(p.getParent()).toBeNull();
    expect(fixture.editor.getUndoStateName()).toBe("Simplify Path");
  });

  it("refuses a typed tolerance of 0 (BUG-134)", () => {
    const seen = typeIntoPrompt("0");
    const tolerances = recordTolerances();
    const p = selectWave();
    new SimplifyAction().execute();
    expect(seen.messages).toEqual([
      "Path simplification",
      "alert: Entered invalid number for pixel tolerance.",
    ]);
    expect(tolerances).toEqual([]);
    expect(p.getParent()).not.toBeNull();
  });

  it("keeps the slider's value when the typed text isn't a length", () => {
    typeIntoPrompt("abc");
    const tolerances = recordTolerances();
    selectWave();
    new SimplifyAction().execute();
    expect(tolerances).toEqual([10]);
  });
});
