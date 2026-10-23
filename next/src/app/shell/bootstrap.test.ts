import { afterEach, describe, expect, it } from "vitest";
import { buildRegistry, pendingRegistrations } from "./bootstrap.ts";
import { setLateModules } from "./late.ts";
import { PendingSidebar } from "./pending-sidebar.ts";

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
});
