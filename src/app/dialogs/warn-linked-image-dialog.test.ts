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

describe("warn linked image dialog (module 1511)", () => {
  it("opens the dialog once it is built when open() comes right after new (BUG-145)", async () => {
    setContainer(fakeContainer(false) as never);
    const agree = vi.fn();
    const dialog = new WarnLinkedImageDialog(agree);
    expect(() => dialog.open()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(created).toHaveLength(1);
    expect(created[0]?.className).toBe("g-warn-linked-image-dialog");
    expect(created[0]?.open).toHaveBeenCalledWith(true);
    expect(agree).not.toHaveBeenCalled();
  });

  it("agrees at once and open() does nothing when never-remind is stored (BUG-145)", async () => {
    setContainer(fakeContainer(true) as never);
    const agree = vi.fn();
    expect(() => new WarnLinkedImageDialog(agree).open()).not.toThrow();
    await Promise.resolve();
    expect(agree).toHaveBeenCalledOnce();
    expect(created).toHaveLength(0);
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
