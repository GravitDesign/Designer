import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FakeCanvas, FakeContext2D } from "../../engine/paint/testing/fake-canvas.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { RulerWidget } from "./ruler-widget.ts";
import { installFakeDom, type FakeElement } from "./testing/fake-dom.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
});
afterEach(() => uninstall());

function log(ruler: RulerWidget): string[] {
  return ((ruler._canvas as unknown as FakeCanvas).getContext("2d") as FakeContext2D).log;
}

/** The labels a paint wrote, with their x position. */
function labels(ruler: RulerWidget): string[] {
  return log(ruler)
    .filter((entry) => entry.startsWith("fillText(") && !entry.startsWith('fillText("",'))
    .map((entry) => entry.replace(/^fillText\((.*)\)$/, "$1"));
}

describe("RulerWidget", () => {
  it("labels every 50 px at 100% with ticks every 5 px", () => {
    const scene = new Scene(new Workspace());
    const ruler = new RulerWidget(RulerWidget.Orientation.Horizontal, scene);
    // Painted by the resize; offset 0 and zoom 1 are the defaults, so
    // updateView has nothing to repaint.
    ruler.resize(400, 19);
    const painted = log(ruler).length;
    ruler.updateView(0, 1);
    expect(log(ruler).length).toBe(painted);
    // The horizontal canvas is as wide as the screen.
    expect((ruler._canvas as unknown as FakeCanvas).width).toBe(1600);
    expect(labels(ruler).slice(0, 4)).toEqual([
      // Centered on the tick: the fake text is 5 px per character.
      '"0",-2,8',
      '"50",45,8',
      '"100",93,8',
      '"150",143,8',
    ]);
    const ticks = log(ruler).filter((entry) => entry.startsWith("moveTo("));
    expect(ticks.slice(0, 3)).toEqual([
      "moveTo(0.5,19.5)",
      "moveTo(5.5,19.5)",
      "moveTo(10.5,19.5)",
    ]);
  });

  it("follows the view's offset and zoom", () => {
    const scene = new Scene(new Workspace());
    const ruler = new RulerWidget(RulerWidget.Orientation.Horizontal, scene);
    ruler.resize(400, 19);
    log(ruler).length = 0;
    ruler.updateView(-37, 0.25);
    // At 25% a label every 200 units; the offset moves the zero left.
    expect(labels(ruler).slice(0, 2)).toEqual(['"200",6,8', '"400",56,8']);
    log(ruler).length = 0;
    ruler.updateView(-37, 0.25);
    expect(log(ruler)).toEqual([]);
  });

  it("rotates the vertical ruler and keeps its width", () => {
    const scene = new Scene(new Workspace());
    const ruler = new RulerWidget(RulerWidget.Orientation.Vertical, scene);
    ruler.resize(19, 300);
    expect(ruler.getWidth()).toBe(19);
    expect(log(ruler)).toContain("translate(19,0)");
    expect(log(ruler)).toContain("rotate(" + String((Math.PI / 180) * 90) + ")");
    expect((ruler._htmlElement as unknown as FakeElement).className).toBe(
      "g-ruler-widget vertical",
    );
  });

  it("repaints when the scene unit changes", () => {
    const scene = new Scene(new Workspace());
    const ruler = new RulerWidget(RulerWidget.Orientation.Horizontal, scene);
    ruler.resize(400, 19);
    ruler.updateView(0, 1);
    log(ruler).length = 0;
    scene.setProperty("ut", "in");
    // 1in = 72pt: a label every inch.
    expect(labels(ruler).slice(0, 3)).toEqual(['"0",-2,8', '"1",70,8', '"2",142,8']);
    ruler.release();
    log(ruler).length = 0;
    scene.setProperty("ut", "px");
    expect(log(ruler)).toEqual([]);
  });

  it("shows the unit in the unit box", () => {
    const scene = new Scene(new Workspace());
    const unit = new RulerWidget(null, scene, undefined, true, { rulerLeftFill: false });
    const element = unit._htmlElement as unknown as FakeElement;
    expect(element.style.justifyContent).toBe("center");
    expect((element.firstChild as FakeElement).innerHTML).toBe("px");
    scene.setProperty("ut", "mm");
    expect((element.firstChild as FakeElement).innerHTML).toBe("mm");
  });
});
