import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GDate } from "../../core/date.ts";
import { Node } from "../node.ts";
import { Comment } from "./comment.ts";

const NOW = 1_700_000_000_000;

beforeEach(() => {
  vi.spyOn(GDate, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GComment", () => {
  it("records who read it and stamps non-custom changes", () => {
    const comment = new Comment();
    comment.setProperties(["uid", "read"], ["u1", ["a"]]);
    comment.setProperty("uid", "u2");
    comment.setProperty("uid", "u1");
    expect(comment.getProperty("read")).toEqual(["a", "u1", "u2"]);
    expect(comment.getProperty("mtime")).toBe(NOW);
    const custom = new Comment();
    custom.setProperty("note", 1, true);
    expect(custom.getProperty("mtime")).toBe(0);
    custom.setProperties(["text", "mtime"], ["t", 9]);
    expect(custom.getProperty("mtime")).toBe(9);
  });

  it("throws when uid is set while read isn't an array", () => {
    const comment = new Comment();
    comment.setProperty("read", 5);
    expect(() => comment.setProperty("uid", "u1")).toThrow(TypeError);
  });

  it("stores only what differs, and copies get fresh times and no cloud ids", () => {
    const comment = new Comment();
    comment.setProperties(["text", "time", "mtime", "Guid", "sid"], ["hi", 1, 2, "g", "s"]);
    const plain = JSON.parse(Node.serialize(comment) as string) as Record<string, unknown>;
    expect(plain).toMatchObject({ "@": "cmt", text: "hi", time: 1, mtime: 2, Guid: "g", sid: "s" });
    const copy = JSON.parse(Node.serialize(comment, { copy: true }) as string) as Record<
      string,
      unknown
    >;
    expect([copy["time"], copy["mtime"], copy["Guid"], copy["sid"]]).toEqual([
      NOW,
      NOW,
      undefined,
      undefined,
    ]);
    const restored = Node.deserialize(Node.serialize(comment) as string) as Comment;
    expect(restored.getProperties(["text", "time", "mtime", "Guid"])).toEqual(["hi", 1, 2, "g"]);
    expect([Comment.Type.User, Comment.Type.Open, Comment.Type.Close]).toEqual([0, 1, 2]);
    expect(comment.isFillingCompleted()).toBe(true);
    expect(new Comment().isFillingCompleted()).toBe(false);
  });
});
