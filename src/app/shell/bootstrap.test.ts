import { afterEach, describe, expect, it } from "vitest";
import { buildRegistry, pendingRegistrations } from "./bootstrap.ts";
import { setLateModules } from "./late.ts";
import { PendingSidebar } from "./pending-sidebar.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import * as fileTypes from "../document/file-types.ts";
import { ArrowAnnotationTool } from "../../editor/annotations/arrow-annotation-tool.ts";
import { CommentAnnotationTool } from "../../editor/annotations/comment-annotation-tool.ts";
import { EllipseAnnotationTool } from "../../editor/annotations/ellipse-annotation-tool.ts";
import { HighlighterAnnotationTool } from "../../editor/annotations/highlighter-annotation-tool.ts";
import { PencilAnnotationTool } from "../../editor/annotations/pencil-annotation-tool.ts";
import { RectangleAnnotationTool } from "../../editor/annotations/rectangle-annotation-tool.ts";
import { TextAnnotationTool } from "../../editor/annotations/text-annotation-tool.ts";

/** A fake action class that remembers its constructor arguments. */
function fakeAction(name: string, statics: Record<string, unknown> = {}) {
  const cls = class {
    readonly args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
    }
    getId(): string {
      return name + (this.args.length ? ":" + JSON.stringify(this.args) : "");
    }
  };
  return Object.assign(cls, statics);
}

afterEach(() => setLateModules({}));

describe("buildRegistry", () => {
  it("builds the actions in the old order with the old constructor arguments", () => {
    setLateModules({
      "actions/file/new-action.ts": { NewAction: fakeAction("new") },
      "actions/file/save-as-action.ts": { SaveAsAction: fakeAction("saveas") },
      "actions/edit/cut-copy-action.ts": { CutCopyAction: fakeAction("cutcopy") },
      "actions/view/snap-unit-action.ts": {
        SnapUnitAction: fakeAction("snap", { Type: { FullUnit: 1, HalfUnit: 2 } }),
      },
    });
    const ids = buildRegistry().actions.map((action) => action.getId());
    expect(ids).toEqual([
      "new",
      'saveas:["gvdesign"]',
      'saveas:["pdf",{"dpi":72}]',
      'saveas:["pdf",{"dpi":96}]',
      'saveas:["pdf",{"dpi":150}]',
      'saveas:["pdf",{"dpi":300}]',
      "cutcopy:[true]",
      "cutcopy:[false]",
      "snap:[1]",
      "snap:[2]",
    ]);
  });

  it("lists what is not ported yet and stands in for missing sidebars", () => {
    setLateModules({});
    const registry = buildRegistry();
    expect(registry.actions).toEqual([]);
    expect(pendingRegistrations()).toContain(
      "GNewAction (a1601, actions/file/new-action.ts NewAction)",
    );
    expect(registry.sidebars.map((sidebar) => sidebar.getId())).toEqual([
      "inspector",
      "outline",
      "library",
      "symbols",
    ]);
    expect(registry.sidebars.every((sidebar) => sidebar instanceof PendingSidebar)).toBe(true);
    expect(registry.sidebars.map((s) => [s.getOrientation(), s.getDefaultWidth()])).toEqual([
      ["right", 300],
      ["left", 250],
      ["left", 250],
      ["left", 250],
    ]);
  });

  it("starts the tool table with the pointer tool", () => {
    const tools = buildRegistry().tools;
    expect(tools[0]?.toolString).toBe("GPointerTool");
    expect(tools.map((t) => t.key).filter(Boolean)).toEqual([
      "V",
      "D",
      "O",
      "S",
      "P",
      "B",
      "K",
      "L",
      "R",
      "E",
      "T",
      "H",
      "Z",
    ]);
  });

  it("gives every tool a real rich tooltip config, which the tooltip plugin accepts", () => {
    const tools = buildRegistry().tools;
    for (const tool of tools) {
      expect(tool.richTooltipConfig).toBeInstanceOf(RichTooltipConfig);
      const target = { addEventListener: () => undefined, removeEventListener: () => undefined };
      expect(() => attachRichTooltip(target as never, tool.richTooltipConfig)).not.toThrow();
    }
    // JSON shows the given fields only, in the old order (toolmgr/tool-table).
    const pointer = JSON.parse(JSON.stringify(tools[0]?.richTooltipConfig)) as object;
    expect(Object.keys(pointer)).toEqual([
      "_title",
      "_description",
      "_video",
      "_middle",
      "_shortcut",
      "_learnMore",
    ]);
    const bezigon = tools.find((t) => t.toolString === "GBezigonTool");
    expect(JSON.parse(JSON.stringify(bezigon?.richTooltipConfig))._isPro).toBe(false);
  });

  it("adds a Save As entry for each image format of GDocument.FileTypes, in the old order", () => {
    setLateModules({
      "actions/file/save-as-action.ts": { SaveAsAction: fakeAction("saveas") },
      "document/file-types.ts": fileTypes,
    });
    expect(buildRegistry().actions.map((action) => action.getId())).toEqual([
      'saveas:["gvdesign"]',
      'saveas:["png"]',
      'saveas:["jpg"]',
      'saveas:["svg"]',
      'saveas:["pdf",{"dpi":72}]',
      'saveas:["pdf",{"dpi":96}]',
      'saveas:["pdf",{"dpi":150}]',
      'saveas:["pdf",{"dpi":300}]',
    ]);
  });

  it("has no annotation tool: the comments sidebar was the only way to them (DROP-009)", () => {
    const annotationTools: unknown[] = [
      ArrowAnnotationTool,
      CommentAnnotationTool,
      EllipseAnnotationTool,
      HighlighterAnnotationTool,
      PencilAnnotationTool,
      RectangleAnnotationTool,
      TextAnnotationTool,
    ];
    const tools = buildRegistry().tools;
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.filter((t) => annotationTools.includes(t.tool))).toEqual([]);
  });
});
