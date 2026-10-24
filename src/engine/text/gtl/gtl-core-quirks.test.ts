import { afterEach, describe, expect, it, vi } from "vitest";
import { Part } from "./inline.ts";
import { Per } from "./list-util.ts";
import { Measurement } from "./measurement.ts";
import { TLNode } from "./node.ts";
import { TLCore } from "./tl-core.ts";

/** A bare layout node with a fixed parent and children. */
class TreeNode extends TLNode {
  constructor(
    private readonly kids: TLNode[] = [],
    private up: TLNode | null = null,
  ) {
    super();
    for (const kid of kids) (kid as TreeNode).up = this;
  }

  override children(): TLNode[] {
    return this.kids;
  }

  override parent(): TLNode | null {
    return this.up;
  }
}

describe("Per.pulse", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits 0, 1, 2 at the interval and stops when emit returns true", () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    Per.pulse(50).forEach((value) => {
      seen.push(value);
      return value === 2;
    });
    expect(seen).toEqual([0]);
    vi.advanceTimersByTime(49);
    expect(seen).toEqual([0]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([0, 1]);
    vi.advanceTimersByTime(50);
    expect(seen).toEqual([0, 1, 2]);
    vi.advanceTimersByTime(500);
    expect(seen).toEqual([0, 1, 2]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Measurement", () => {
  it("keeps minX and maxX on the prototype like the old module", () => {
    const bare = new Measurement();
    expect(Object.keys(bare)).toEqual(["width", "height", "ascent", "descent", "minY", "maxY"]);
    expect(Object.prototype.hasOwnProperty.call(bare, "minX")).toBe(false);
    expect([bare.minX, bare.maxX]).toEqual([0, 0]);
    expect(bare.width).toBeUndefined();
    expect(JSON.stringify(new Measurement(1, 2, 3, 4, 5, 6))).toBe(
      '{"width":1,"height":2,"ascent":3,"descent":4,"minY":5,"maxY":6}',
    );
  });
});

describe("TLNode", () => {
  it("previous gives undefined when the parent's previous node has no children", () => {
    const emptyBefore = new TreeNode();
    const leaf = new TreeNode();
    const holder = new TreeNode([leaf]);
    new TreeNode([emptyBefore, holder]);
    expect(leaf.previous()).toBeUndefined();
    expect(holder.previous()).toBe(emptyBefore);
  });

  it("previous gives null without a parent or a previous node", () => {
    const leaf = new TreeNode();
    expect(leaf.previous()).toBeNull();
    new TreeNode([leaf]);
    expect(leaf.previous()).toBeNull();
  });

  it("byCoordinate throws on a node without children, like the old code", () => {
    expect(() => new TreeNode().byCoordinate(0, 0)).toThrow(TypeError);
  });
});

describe("TLCore.setText", () => {
  it("ignores a read-only text on the formatting run like the old sloppy module", () => {
    const core = new TLCore();
    const readOnly = Object.create({ fontSize: 12 }, { text: { value: "old" } }) as {
      text: string;
    };
    let loaded: unknown = null;
    Object.assign(core, {
      _fontManager: {},
      _doc: {
        load: (runs: unknown) => {
          loaded = runs;
          return true;
        },
      },
      getDocumentRange: () => ({ getFormatting: () => readOnly }),
    });
    expect(core.setText("new")).toBe(true);
    expect(loaded).toEqual([readOnly]);
    expect(readOnly.text).toBe("old");
  });
});

describe("Part.DefaultInline", () => {
  it("throws in draw on a context without fillText, after the box", () => {
    const calls: string[] = [];
    const context = {
      fillStyle: "",
      fillRect: () => calls.push("fillRect"),
      strokeRect: () => calls.push("strokeRect"),
    };
    expect(() =>
      (Part.DefaultInline.draw as (...args: unknown[]) => void)(context, 0, 10, 8, 6, 2),
    ).toThrow(TypeError);
    expect(calls).toEqual(["fillRect", "strokeRect"]);
    expect(context.fillStyle).toBe("black");
  });
});
