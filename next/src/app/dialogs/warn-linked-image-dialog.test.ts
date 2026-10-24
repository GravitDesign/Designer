import { afterEach, describe, expect, it, vi } from "vitest";
import { setContainer } from "../shell/globals.ts";

const created: { open: ReturnType<typeof vi.fn>; className: string }[] = [];

vi.mock("./dialog.ts", () => ({
  Dialog: {
    create: (_content: unknown, options: { className: string }) => {
      const dialog = { open: vi.fn(), close: vi.fn(), className: options.className };
      created.push(dialog);
      return dialog;
    },
  },
}));

const { WarnLinkedImageDialog } = await import("./warn-linked-image-dialog.ts");

function fakeContainer(neverRemind: unknown) {
  return { getProperty: vi.fn(() => Promise.resolve(neverRemind)), setProperty: vi.fn() };
}

afterEach(() => {
  created.length = 0;
  setContainer(null);
});

describe("warn linked image dialog (Q-259)", () => {
  it("throws on open() right after new, and the dialog built later never opens", async () => {
    setContainer(fakeContainer(false) as never);
    const agree = vi.fn();
    const dialog = new WarnLinkedImageDialog(agree);
    expect(() => dialog.open()).toThrow(TypeError);
    await Promise.resolve();
    await Promise.resolve();
    expect(created).toHaveLength(1);
    expect(created[0]?.className).toBe("g-warn-linked-image-dialog");
    expect(created[0]?.open).not.toHaveBeenCalled();
    expect(agree).not.toHaveBeenCalled();
    // Once built, open() works.
    dialog.open();
    expect(created[0]?.open).toHaveBeenCalledWith(true);
  });

  it("agrees at once without a dialog when never-remind is stored", async () => {
    setContainer(fakeContainer(true) as never);
    const agree = vi.fn();
    new WarnLinkedImageDialog(agree);
    await Promise.resolve();
    expect(agree).toHaveBeenCalledOnce();
    expect(created).toHaveLength(0);
  });
});
