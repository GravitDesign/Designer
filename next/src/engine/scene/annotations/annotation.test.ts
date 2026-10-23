import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GDate } from "../../core/date.ts";
import { Transform } from "../../math/transform.ts";
import { Node } from "../node.ts";
import { Path } from "../path.ts";
import { Annotation } from "./annotation.ts";
import { ArrowAnnotation } from "./arrow-annotation.ts";
import { Comment } from "./comment.ts";
import { EllipseAnnotation } from "./ellipse-annotation.ts";
import { HighlighterAnnotation } from "./highlighter-annotation.ts";
import { PencilAnnotation } from "./pencil-annotation.ts";
import { RectangleAnnotation } from "./rectangle-annotation.ts";

const NOW = 1_700_000_000_000;

function store(node: Node, options: Record<string, unknown> = {}): Record<string, unknown> {
  return JSON.parse(JSON.stringify(Node.store(node, options))) as Record<string, unknown>;
}

beforeEach(() => {
  vi.spyOn(GDate, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GAnnotation", () => {
  it("is a registered mixin with the old statics", () => {
    const node = new RectangleAnnotation();
    expect(node.hasMixin(Annotation)).toBe(true);
    expect(new Path().hasMixin(Annotation)).toBe(false);
    expect(Annotation.Flag["Hidden"]).toBe(1 << 21);
    expect(Object.keys(Annotation.MetaProperties)).toEqual([
      "vis",
      "name",
      "text",
      "img",
      "uid",
      "email",
      "time",
      "mtime",
      "seq",
      "loc",
      "typ",
      "rsv",
      "rmd",
      "sid",
      "read",
      "asgn",
      "Guid",
      "atp",
    ]);
    expect(Node.getName(node)).toBe("anr");
    expect(Node.getName(new EllipseAnnotation())).toBe("ane");
    expect(Node.getName(new ArrowAnnotation())).toBe("anarr");
    expect(Node.getName(new PencilAnnotation())).toBe("anp");
    expect(Node.getName(new HighlighterAnnotation())).toBe("anh");
  });

  it("stamps mtime on every change unless mtime is set in the same call", () => {
    const node = new RectangleAnnotation();
    expect(node.getProperty("mtime")).toBe(0);
    node.setProperty("text", "note");
    expect(node.getProperty("mtime")).toBe(NOW);
    node.setProperties(["text", "mtime"], ["other", 5]);
    expect(node.getProperty("mtime")).toBe(5);
  });

  it("doesn't stamp custom, temporary or lock-only changes", () => {
    const node = new RectangleAnnotation();
    node.setProperty("x", 1, true);
    node.setProperty("text", "t", false, false, true);
    node.setProperties(["plkt", "lkt"], [2, "P"]);
    expect(node.getProperty("mtime")).toBe(0);
    node.setProperties(["plkt", "name"], [3, "N"]);
    expect(node.getProperty("mtime")).toBe(NOW);
  });

  it("adds a new uid to read, and throws when read isn't an array", () => {
    const node = new RectangleAnnotation();
    node.setProperty("uid", "u1");
    node.setProperty("uid", "u2");
    node.setProperty("uid", "u1");
    expect(node.getProperty("read")).toEqual(["u1", "u2"]);
    const broken = new RectangleAnnotation();
    broken.setProperty("read", "x");
    expect(() => broken.setProperty("uid", "u1")).toThrow(TypeError);
  });

  it("adds comments numbered after the last child", () => {
    const node = new EllipseAnnotation();
    const first = node.addComment("first", "u1", "Ann", "a.png", "a@example.com");
    const second = node.addComment("second", "u2", "Bob", null, null, Comment.Type.Close);
    expect(node.getChildren()).toEqual([first, second]);
    expect(first.getProperties(["seq", "type", "rmd", "read", "time"])).toEqual([
      0,
      Comment.Type.User,
      false,
      ["u1"],
      NOW,
    ]);
    expect(second.getProperties(["seq", "type", "name"])).toEqual([1, 2, "Bob"]);
    expect(node.getNextAnnotationSequence()).toBe(2);
    // The comment sets mtime itself, so the annotation isn't stamped.
    expect(node.getProperty("mtime")).toBe(0);
  });

  it("is stamped by a change below it that doesn't set mtime", () => {
    const node = new RectangleAnnotation();
    const child = new Path();
    node.appendChild(child);
    child.setProperty("closed", true);
    expect(node.getProperty("mtime")).toBe(NOW);
  });

  it("stores copies with fresh times, no cloud ids and unresolved", () => {
    const node = new RectangleAnnotation();
    node.setProperties(["uid", "Guid", "sid", "rsv", "time", "mtime"], ["u", "g", "s", true, 5, 6]);
    const plain = store(node);
    expect([plain["Guid"], plain["sid"], plain["rsv"], plain["time"], plain["mtime"]]).toEqual([
      "g",
      "s",
      true,
      5,
      6,
    ]);
    const copy = store(node, { copy: true });
    expect([copy["Guid"], copy["sid"], copy["rsv"], copy["time"], copy["mtime"]]).toEqual([
      undefined,
      undefined,
      false,
      NOW,
      NOW,
    ]);
  });

  it("diffs against the recorded values inside a recorded transaction", () => {
    const node = new RectangleAnnotation();
    node.setProperty("text", "x");
    expect(store(node)["text"]).toBe("x");
    const recorded = store(node, {
      recordedTransaction: true,
      recordedProperties: { text: "x", seq: 7 },
    });
    expect(recorded["text"]).toBeUndefined();
    expect(recorded["seq"]).toBe(0);
  });

  it("puts the rest of a separately saved blob in own, with the box for strokes", () => {
    const rect = store(new RectangleAnnotation(), { separateSaving: true });
    expect(Object.keys(rect)).toEqual(["@", "@id", "own"]);
    expect((rect["own"] as Record<string, unknown>)["@"]).toBe("anr");
    expect((rect["own"] as Record<string, unknown>)["uf"]).toBe(true);
    expect(Object.hasOwn(rect["own"] as object, "bbox")).toBe(false);
    const stroke = new HighlighterAnnotation();
    expect(store(stroke, { separateSaving: true })["own"]).toMatchObject({
      "@": "anh",
      bbox: null,
    });
  });

  it("restores the meta properties; copies get fresh times", () => {
    const blob = JSON.stringify({ "@": "anr", text: "T", uid: "u9", seq: 4, rsv: true, time: 3 });
    const node = Node.deserialize(blob) as RectangleAnnotation;
    expect(node.getProperties(["text", "uid", "seq", "rsv", "time", "read"])).toEqual([
      "T",
      "u9",
      4,
      true,
      3,
      ["u9"],
    ]);
    // Restoring doesn't stamp.
    expect(node.getProperty("mtime")).toBe(0);
    expect(node.restoreAction({ options: { copy: true } }, "rsv", true)).toBe(false);
    expect(node.restoreAction({ options: { copy: true } }, "time", 1)).toBe(NOW);
    expect(node.restoreAction(null, "time", 1)).toBe(1);
  });

  it("only goes into an annotations list", () => {
    const node = new RectangleAnnotation();
    expect(node.validateInsertion(new Path() as never)).toBe(false);
    const comment = new Comment();
    expect(comment.validateInsertion(node)).toBe(true);
    expect(comment.validateInsertion(new Path())).toBe(false);
  });

  it("grows arrow markers a bit faster than path markers", () => {
    const arrow = new ArrowAnnotation();
    expect(arrow._calculateMarkerVerticeBorderScale(4)).toBe(2.16);
    expect(arrow._calculateMarkerVerticeBorderScale(0.25)).toBe(0.5025);
    expect(new Path()._calculateMarkerVerticeBorderScale(4)).toBe(2);
  });

  it("is shown only while the configuration shows unresolved annotations", () => {
    const node = new RectangleAnnotation();
    node.setProperty("trf", new Transform(10, 0, 0, 10, 0, 0));
    const hidden = { configuration: { isElementAnnotationsVisible: () => false } };
    expect(node.isPaintable(hidden as never)).toBe(false);
  });
});
