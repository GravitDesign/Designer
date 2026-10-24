import { describe, expect, it, vi } from "vitest";
import { CMYKColor } from "../engine/color/cmyk-color.ts";
import { RGBColor } from "../engine/color/rgb-color.ts";
import { Point } from "../engine/math/point.ts";
import { Transform } from "../engine/math/transform.ts";
import { Scene } from "../engine/scene/scene.ts";
import { Cursor } from "./cursor.ts";
import { Editor } from "./editor.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorPaintConfiguration } from "./editor-paint-configuration.ts";
import {
  EditorWorkspace,
  registerToolManagerFactory,
  resetMissingToolManagerWarning,
} from "./editor-workspace.ts";
import { EditorAnnotation } from "./handles/editor-annotation.ts";
import { PreserveAspectRatioAnnotation } from "./handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "./handles/rotate-annotation.ts";
import { SkewVerticalAnnotation } from "./handles/skew-vertical-annotation.ts";
import { StyleEdManager } from "./style-ed-manager.ts";
import type { ToolManager } from "./tools/tool-manager.ts";
import { LinearGradientEditor } from "./element-editors/linear-gradient-editor.ts";
import { RadialGradientEditor } from "./element-editors/radial-gradient-editor.ts";

describe("EditorOptions", () => {
  it("restores saved colours as colour objects by component count", () => {
    const saved = {
      gridColor: new RGBColor([1, 2, 3]),
      guideLineColor: new CMYKColor([0.1, 0.2, 0.3, 0.4]),
      nested: { blResizeColor: new RGBColor([9, 8, 7]) },
      other: { _value: [1, 2, 3] },
    };
    const restored = EditorOptions.restore(saved) as Record<string, unknown>;
    expect(restored.gridColor).toBeInstanceOf(RGBColor);
    expect(restored.guideLineColor).toBeInstanceOf(CMYKColor);
    expect((restored.nested as Record<string, unknown>).blResizeColor).toBeInstanceOf(RGBColor);
    expect(restored.other).toEqual({ _value: [1, 2, 3] });
  });

  it("checks the preserve-aspect-ratio handle's side only when it is enabled", () => {
    const handle = EditorOptions.annotationHandles.preserveAspectRatio;
    handle.side = 3;
    expect(EditorOptions.isPreserveAspectRatioEnabledForSide(3)).toBe(false);
    handle.enabled = true;
    expect(EditorOptions.isPreserveAspectRatioEnabledForSide(3)).toBe(true);
    expect(EditorOptions.isPreserveAspectRatioEnabledForSide(2)).toBe(false);
    handle.enabled = false;
    handle.side = null;
  });

  it("names an anonymous user", () => {
    expect(EditorOptions.userConfig.userName).toBe("Anonymous");
    expect(Object.keys(EditorOptions.userConfig)).toEqual(["uid", "userName"]);
  });
});

describe("EditorAnnotation", () => {
  it("measures a handle on the pixel grid with a one pixel border", () => {
    const box = EditorAnnotation.getAnnotationBBox(
      new Transform(2, 0, 0, 2, 0, 0),
      new Point(3.7, 1),
      10,
    );
    expect([box.getX(), box.getY(), box.getWidth(), box.getHeight()]).toEqual([1.5, -3.5, 12, 12]);
    const withMargin = EditorAnnotation.getAnnotationBBox(null, null, 10, true);
    // margin: 10 + 4 + 2 * outlineWidth(1) * 4 = 22, half on every side
    expect([withMargin.getX(), withMargin.getWidth()]).toEqual([-16.5, 34]);
  });

  it("grows icon handles by the annotation pick distance", () => {
    EditorOptions.annotPickDistance = 3;
    try {
      const box = RotateAnnotation.getAnnotationBBox(null, new Point(0, 0));
      expect(box.getWidth()).toBe(EditorOptions.annotationHandles.rotate.size + 2 + 6);
    } finally {
      EditorOptions.annotPickDistance = 0;
    }
    expect(RotateAnnotation.getAnnotHalfWidth()).toBe(5);
    expect(PreserveAspectRatioAnnotation.getAnnotHalfWidth()).toBe(11.5);
    // Both skew handles read the skew options, as in the old code.
    expect(SkewVerticalAnnotation.getAnnotationOptions()).toBe(
      EditorOptions.annotationHandles.tranformBox.skew,
    );
    expect(RotateAnnotation.isIconVisible()).toBe(false);
  });
});

describe("Cursor", () => {
  it("writes svg cursors with a hotspot, cur files otherwise, and browser names as is", () => {
    expect(Cursor.cssRule(Cursor.Comment)).toBe(
      '.g-cursor-comment {cursor: url("assets/cursor/comment.svg") 9 12, auto !important;}',
    );
    expect(Cursor.cssRule(Cursor.Pen)).toBe(
      '.g-cursor-pen {cursor: url("assets/cursor/pen.cur"), auto !important;}',
    );
    expect(Cursor.cssRule(Cursor.Text)).toBe(".g-cursor-text {cursor: text !important;}");
  });
});

describe("EditorPaintConfiguration", () => {
  it("keeps its defaults on the prototype", () => {
    const configuration = new EditorPaintConfiguration();
    expect(configuration.pageDecoration.shadowBackground).toBe("rgba(0,0,0,0.5)");
    expect(configuration.gridVisible).toBe(true);
    expect(configuration.pageLabelsVisible).toBe(false);
    expect(Object.keys(configuration)).not.toContain("gridVisible");
  });
});

describe("EditorWorkspace", () => {
  it("makes its tool manager with the registered factory and puts the old one back", () => {
    const first = {} as ToolManager;
    const second = {} as ToolManager;
    const original = registerToolManagerFactory(() => first);
    try {
      const previous = registerToolManagerFactory(() => second);
      expect(new EditorWorkspace().getToolManager()).toBe(second);
      registerToolManagerFactory(previous);
      expect(new EditorWorkspace().getToolManager()).toBe(first);
      registerToolManagerFactory(null);
      expect(new EditorWorkspace().getToolManager()).toBeNull();
    } finally {
      registerToolManagerFactory(original);
    }
    expect(new EditorWorkspace().getStyleEdManager()).toBeInstanceOf(StyleEdManager);
  });

  it("warns once in development when no tool manager factory is registered", () => {
    const previous = registerToolManagerFactory(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // Quiet in unit tests, which make workspaces without the tools on purpose.
      new EditorWorkspace();
      expect(warn).not.toHaveBeenCalled();
      vi.stubEnv("MODE", "development");
      resetMissingToolManagerWarning();
      new EditorWorkspace();
      new EditorWorkspace();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("Import editor/index.ts");
      // A registered factory never warns.
      resetMissingToolManagerWarning();
      registerToolManagerFactory(() => ({}) as ToolManager);
      new EditorWorkspace();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
      warn.mockRestore();
      resetMissingToolManagerWarning();
      registerToolManagerFactory(previous);
    }
  });
});

describe("StyleEdManager", () => {
  it("registers the three gradient editors and finds them by class", () => {
    const manager = new StyleEdManager();
    expect(manager.getEditor(LinearGradientEditor)).toBeInstanceOf(LinearGradientEditor);
    expect(manager.getEditor(RadialGradientEditor)).toBeInstanceOf(RadialGradientEditor);
    const editor = manager.getEditor(LinearGradientEditor) as LinearGradientEditor;
    expect(editor._manager).toBe(manager);
    expect(() => manager.addEditor(editor)).toThrow("Editor is already registered");
  });

  it("routes transactions to the view's editor while activated", () => {
    const scene = new Scene(new EditorWorkspace());
    const editor = new Editor(scene);
    const manager = new StyleEdManager();
    const calls: string[] = [];
    manager.addEventListener(StyleEdManager.EditorEvent, (event) =>
      calls.push("event " + String(event.type)),
    );
    manager.activate({
      getScene: () => scene,
      getEditor: () => ({
        beginTransaction: () => calls.push("begin"),
        commitTransaction: (name?: string | null) => calls.push("commit " + String(name)),
      }),
    } as never);
    expect(manager.isActivated()).toBe(true);
    manager.beginTransaction();
    manager.commitTransaction("Gradient");
    expect(calls).toEqual(["event 2", "begin", "commit Gradient"]);
    manager.deactivate();
    expect(manager.getScene()).toBeNull();
    editor.release();
  });
});
