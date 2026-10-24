import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT, LEGACY_ROOT, NEXT_ROOT } from "./env.ts";
import { OLD_VARIANTS, patchBundle } from "./old-variants.ts";
import {
  applyRemoval,
  checkJsonRemoval,
  checkPngRemoval,
  rulesFor,
  storedJson,
  type PngRemoval,
  type RemovalRule,
} from "./removed.ts";

const persona = {
  tag: "div",
  cls: ["section", "persona"],
  children: [{ tag: "div", cls: ["g-persona-bar"], children: [{ tag: "div" }] }],
};
const exportButton = { tag: "div", cls: ["toolbar-button", "pro", "dropdown"], text: "Export" };
const old = [{ tag: "div", cls: ["header"], children: [persona, exportButton] }];

describe("applyRemoval", () => {
  it("drops matching nodes with their subtree", () => {
    const out = applyRemoval(old, [{ dropNode: { cls: "g-persona-bar" } }]);
    expect(out).toEqual([
      {
        tag: "div",
        cls: ["header"],
        children: [{ tag: "div", cls: ["section", "persona"] }, exportButton],
      },
    ]);
  });

  it("drops a class token and keeps the order of the others", () => {
    const out = applyRemoval(old, [{ dropClass: "pro" }]) as typeof old;
    expect(out[0]?.children[1]).toEqual({
      tag: "div",
      cls: ["toolbar-button", "dropdown"],
      text: "Export",
    });
  });

  it("drops the cls key when no class is left", () => {
    expect(applyRemoval({ tag: "span", cls: ["pro"] }, [{ dropClass: "pro" }])).toEqual({
      tag: "span",
    });
  });

  it("drops class tokens from menu item class lists and keeps them empty", () => {
    expect(
      applyRemoval(
        [{ caption: "Add Fonts...", classes: ["legacy-feature", "pro"] }],
        [{ dropClass: "pro" }, { dropClass: "legacy-feature" }],
      ),
    ).toEqual([{ caption: "Add Fonts...", classes: [] }]);
  });

  it("drops an attribute only where the node and its parent match", () => {
    const tree = [
      {
        tag: "div",
        cls: ["pattern-chooser"],
        children: [{ tag: "div", cls: ["toolbar"], attrs: { style: "" } }],
      },
      { tag: "div", cls: ["toolbar"], attrs: { style: "", title: "x" } },
    ];
    expect(
      applyRemoval(tree, [
        {
          dropAttr: {
            node: { cls: "toolbar", parent: { cls: "pattern-chooser" } },
            attr: "style",
            value: "",
          },
        },
      ]),
    ).toEqual([
      { tag: "div", cls: ["pattern-chooser"], children: [{ tag: "div", cls: ["toolbar"] }] },
      tree[1],
    ]);
  });

  it("moves a length in the inline style of matching nodes", () => {
    const overlay = (top: string) => ({
      tag: "div",
      cls: ["g-overlay"],
      attrs: { style: `position: absolute; top: ${top}; left: 1315px;` },
    });
    expect(
      applyRemoval(
        [overlay("518px"), { tag: "div", attrs: { style: "top: 518px;" } }],
        [{ moveStyle: { node: { cls: "g-overlay" }, property: "top", by: -32 } }],
      ),
    ).toEqual([overlay("486px"), { tag: "div", attrs: { style: "top: 518px;" } }]);
  });

  it("matches a node by its child", () => {
    const item = (caption: string) => ({
      tag: "li",
      cls: ["g-menu-item"],
      children: [{ tag: "span", cls: ["g-menu-item-caption"], text: caption }],
    });
    expect(
      applyRemoval(
        [item("New Design..."), item("New Design from Template...")],
        [{ dropNode: { tag: "li", child: { text: "New Design from Template..." } } }],
      ),
    ).toEqual([item("New Design...")]);
  });

  it("matches empty nodes only with empty", () => {
    const list = [
      { tag: "span", cls: ["pro"] },
      { tag: "span", cls: ["pro"], text: "Team" },
    ];
    expect(applyRemoval(list, [{ dropNode: { tag: "span", cls: "pro", empty: true } }])).toEqual([
      list[1],
    ]);
  });

  it("matches nodes by attribute", () => {
    const list = [
      { tag: "li", attrs: { "data-action": "view.comments" } },
      { tag: "li", attrs: { "data-action": "view.zoom" } },
    ];
    expect(
      applyRemoval(list, [{ dropNode: { tag: "li", attrs: { "data-action": "view.comments" } } }]),
    ).toEqual([list[1]]);
  });

  it("drops values and objects by key", () => {
    const value = {
      ids: ["file.new", "file.open-template", "file.save"],
      actions: [
        { id: "file.new", pro: false },
        { id: "file.open-template", pro: false },
      ],
    };
    expect(
      applyRemoval(value, [
        { dropValue: "file.open-template" },
        { dropWhere: { key: "id", values: ["file.open-template"] } },
      ]),
    ).toEqual({ ids: ["file.new", "file.save"], actions: [{ id: "file.new", pro: false }] });
  });

  it("replaces a value under a key", () => {
    expect(
      applyRemoval(
        [
          { id: "a", pro: true },
          { id: "b", pro: false },
        ],
        [{ replace: { key: "pro", from: true, to: false } }],
      ),
    ).toEqual([
      { id: "a", pro: false },
      { id: "b", pro: false },
    ]);
  });
});

describe("rulesFor", () => {
  it("keeps the rules without a scope and those scoped to the scenario", () => {
    const rules: RemovalRule[] = [
      { dropClass: "pro" },
      { dropClass: "trial", only: ["ui/context/"] },
      { dropClass: "g-pro", only: ["ui/menu/"] },
    ];
    expect(rulesFor("ui/context/fill-row.dom", rules)).toEqual([rules[0], rules[1]]);
  });
});

describe("checkJsonRemoval", () => {
  const rules: RemovalRule[] = [{ dropNode: { cls: "g-persona-bar" } }, { dropClass: "pro" }];
  const oldText = storedJson(old);
  const fixed = applyRemoval(old, rules) as typeof old;

  it("accepts the old output minus the removal", () => {
    expect(checkJsonRemoval(oldText, storedJson(fixed), rules)).toBeNull();
  });

  it("flags any other difference", () => {
    const other = structuredClone(fixed);
    (other[0]?.children[1] as { text: string }).text = "Export…";
    expect(checkJsonRemoval(oldText, storedJson(other), rules)).toMatch(/first difference/);
  });

  it("flags a removal that was not made", () => {
    expect(checkJsonRemoval(oldText, oldText, rules)).toMatch(/first difference/);
  });

  it("flags a removal that went too far", () => {
    const more = applyRemoval(old, [...rules, { dropNode: { cls: "persona" } }]);
    expect(checkJsonRemoval(oldText, storedJson(more), rules)).toMatch(/first difference/);
  });

  it("flags rules that remove nothing", () => {
    expect(checkJsonRemoval(oldText, oldText, [{ dropClass: "absent" }])).toMatch(/remove nothing/);
  });

  it("flags a different serialization of the same values", () => {
    expect(checkJsonRemoval(oldText, JSON.stringify(fixed), rules)).not.toBeNull();
  });
});

/** A 20x20 image: a gradient with a 4 px "tab row" at y 2..5 in columns 10..19. */
function shot(withRow: boolean): PNG {
  const png = new PNG({ width: 20, height: 20 });
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const i = (y * 20 + x) * 4;
      png.data[i] = x * 10;
      png.data[i + 1] = y * 10;
      png.data[i + 2] = 100;
      png.data[i + 3] = 255;
    }
  }
  if (!withRow) {
    // The new shot: the panel below the row moved up by 4 px, the last
    // 4 rows show something new.
    for (let y = 2; y < 20; y++) {
      for (let x = 10; x < 20; x++) {
        const i = (y * 20 + x) * 4;
        const sy = y + 4;
        png.data[i + 1] = sy < 20 ? sy * 10 : 7;
      }
    }
  } else {
    for (let y = 2; y < 6; y++) {
      for (let x = 10; x < 20; x++) png.data[(y * 20 + x) * 4 + 2] = 0;
    }
  }
  return png;
}

const OLD_SHOT = PNG.sync.write(shot(true));
const NEW_SHOT = PNG.sync.write(shot(false));
const SHIFT: PngRemoval = {
  moved: [{ x: 10, y: 2, w: 10, h: 14, dy: 4 }],
  free: [{ x: 10, y: 16, w: 10, h: 4 }],
};

describe("checkPngRemoval", () => {
  it("accepts a region moved by the removed row", () => {
    expect(checkPngRemoval(OLD_SHOT, NEW_SHOT, SHIFT)).toBeNull();
  });

  it("flags a pixel that differs outside the removal", () => {
    const changed = shot(false);
    changed.data[(1 * 20 + 1) * 4] = 11;
    expect(checkPngRemoval(OLD_SHOT, PNG.sync.write(changed), SHIFT)).toMatch(/1 pixels differ/);
  });

  it("flags a pixel that differs inside the moved region", () => {
    const changed = shot(false);
    changed.data[(8 * 20 + 12) * 4 + 3] = 254;
    expect(checkPngRemoval(OLD_SHOT, PNG.sync.write(changed), SHIFT)).toMatch(/1 pixels differ/);
  });

  it("flags the wrong offset", () => {
    const wrong: PngRemoval = { ...SHIFT, moved: [{ x: 10, y: 2, w: 10, h: 14, dy: 3 }] };
    expect(checkPngRemoval(OLD_SHOT, NEW_SHOT, wrong)).toMatch(/pixels differ/);
  });

  it("accepts a shot that shrank by the removed rows when the height says so", () => {
    // Old: 20 rows; new: rows 6.. of the old moved up by 4, 16 rows high.
    const old = shot(false);
    const small = new PNG({ width: 20, height: 16 });
    for (let y = 0; y < 16; y++) {
      const sy = y < 2 ? y : y + 4;
      old.data.copy(small.data, y * 20 * 4, sy * 20 * 4, (sy + 1) * 20 * 4);
    }
    const spec: PngRemoval = { moved: [{ x: 0, y: 2, w: 20, h: 14, dy: 4 }], height: 16 };
    const oldPng = PNG.sync.write(old);
    expect(checkPngRemoval(oldPng, PNG.sync.write(small), spec)).toBeNull();
    expect(checkPngRemoval(oldPng, PNG.sync.write(small), { ...spec, height: 15 })).toMatch(
      /sizes differ/,
    );
    small.data[(10 * 20 + 3) * 4] = 1;
    expect(checkPngRemoval(oldPng, PNG.sync.write(small), spec)).toMatch(/1 pixels differ/);
  });

  it("flags identical shots and different sizes", () => {
    expect(checkPngRemoval(OLD_SHOT, OLD_SHOT, SHIFT)).toMatch(/identical/);
    expect(checkPngRemoval(OLD_SHOT, PNG.sync.write(new PNG({ width: 2, height: 2 })), {})).toMatch(
      /sizes differ/,
    );
  });
});

// Every DROP-NNN entry: each scenario's .fixed file is the old output
// minus the removal its entries describe (REMOVED.md).

interface DropFile {
  bug: string;
  scenarios: string[];
  removed?: { rules?: RemovalRule[]; png?: Record<string, PngRemoval>; oldVariant?: string };
}

const EXCEPTIONS_DIR = path.join(NEXT_ROOT, "parity", "exceptions");
const drops: DropFile[] = fs
  .readdirSync(EXCEPTIONS_DIR)
  .filter((f) => /^DROP-\d+\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(EXCEPTIONS_DIR, f), "utf8")) as DropFile);

/** The old and .fixed expected files of a scenario. */
function expectedFiles(id: string): { old: string; fixed: string; ext: string } {
  const base = path.join(EXPECTED_ROOT, id);
  const dir = path.dirname(base);
  const name = path.basename(base);
  const fixed = fs.readdirSync(dir).find((f) => f.startsWith(`${name}.fixed.`));
  if (!fixed) throw new Error(`${id}: no .fixed file`);
  const ext = fixed.slice(`${name}.fixed`.length);
  return { old: path.join(dir, `${name}${ext}`), fixed: path.join(dir, fixed), ext };
}

const cases = drops.flatMap((d) => d.scenarios.map((id) => ({ bug: d.bug, id })));

describe("DROP exceptions", () => {
  it.each(cases)("$bug $id differs from the old output only in the removed part", ({ id }) => {
    const entries = drops.filter((d) => d.scenarios.includes(id));
    const rules = rulesFor(
      id,
      entries.flatMap((d) => d.removed?.rules ?? []),
    );
    const files = expectedFiles(id);
    expect(fs.existsSync(files.old), `${id}: no old expected file`).toBe(true);
    const variant = entries.find((d) => d.removed?.oldVariant)?.removed?.oldVariant;
    if (variant) {
      // A feature the old app can switch off is compared with the old app
      // variant itself (suite.ts, "old app variants"), which renders the
      // layout change the removal causes; the other entries' rules are
      // applied to the variant's output there.
      expect(OLD_VARIANTS[variant], `${id}: unknown old app variant`).toBeDefined();
      expect(fs.readFileSync(files.fixed).equals(fs.readFileSync(files.old))).toBe(false);
      return;
    }
    if (files.ext === ".png") {
      const specs = entries.flatMap((d) => (d.removed?.png?.[id] ? [d.removed.png[id]] : []));
      expect(specs, `${id}: one png removal`).toHaveLength(1);
      expect(
        checkPngRemoval(
          fs.readFileSync(files.old),
          fs.readFileSync(files.fixed),
          specs[0] as PngRemoval,
        ),
      ).toBeNull();
      return;
    }
    expect(
      checkJsonRemoval(
        fs.readFileSync(files.old, "utf8"),
        fs.readFileSync(files.fixed, "utf8"),
        rules,
      ),
    ).toBeNull();
  });
});

describe("patchBundle", () => {
  const variant = { file: "x.js", title: "t", replace: [["A = !0", "A = !1"]] as const };

  it("replaces the switch", () => {
    expect(patchBundle("x; A = !0; y", variant)).toBe("x; A = !1; y");
  });

  it("refuses a switch that is missing or not unique", () => {
    expect(() => patchBundle("x", variant)).toThrow(/exactly once/);
    expect(() => patchBundle("A = !0; A = !0", variant)).toThrow(/exactly once/);
  });

  it("finds every variant's switch exactly once in the old bundle", () => {
    for (const v of Object.values(OLD_VARIANTS)) {
      const file = path.join(LEGACY_ROOT, "public", v.file);
      expect(fs.existsSync(file), file).toBe(true);
      expect(() => patchBundle(fs.readFileSync(file, "utf8"), v)).not.toThrow();
    }
  });
});
