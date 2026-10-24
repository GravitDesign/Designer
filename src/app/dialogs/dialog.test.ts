import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FakeElement,
  FakeEvent,
  fake,
  fire,
  installFakeDom,
} from "../menus/testing/fake-dom.testing.ts";

/** What the React islands of the dialog did. */
const islands = vi.hoisted(() => ({ rendered: [] as unknown[], unmounted: [] as unknown[] }));

vi.mock("../state/islands.tsx", () => ({
  renderInto: (element: unknown, content: unknown) => {
    islands.rendered.push({ element, content });
    return {
      render: (next: unknown) => islands.rendered.push({ element, content: next }),
      unmount: () => islands.unmounted.push(element),
    };
  },
}));

// The module adds its Escape listener to the document when it loads, so
// the fake document has to be there first and stay for the whole file.
const dom = installFakeDom();
(globalThis as Record<string, unknown>).HTMLElement ??= FakeElement;
const { Dialog } = await import("./dialog.ts");
type DialogType = InstanceType<typeof Dialog>;

const open: DialogType[] = [];

afterEach(() => {
  vi.useRealTimers();
  for (const dialog of open.splice(0).reverse()) dialog.options.alwaysCloseable = true;
  for (const content of [...Dialog.openContents()].reverse()) Dialog.of(content)?.close();
  dom.document.body.replaceChildren();
  islands.rendered.length = 0;
  islands.unmounted.length = 0;
});

function content(): HTMLElement {
  return dom.document.createElement("div") as unknown as HTMLElement;
}

function make(options: ConstructorParameters<typeof Dialog>[1] = {}): DialogType {
  const dialog = new Dialog(content(), options);
  open.push(dialog);
  return dialog;
}

function escape(): void {
  dom.document.dispatchEvent(new FakeEvent("keydown", { keyCode: 27 }));
}

describe("Dialog (module 1727)", () => {
  it("wraps the content and puts the container's classes in the old order", () => {
    const dialog = make({ className: "g-a g-b" });
    const element = fake(dialog.getElement());
    expect(element.className).toBe("g-dialog g-a g-b");
    expect(element.children[0]).toBe(fake(dialog.getContent()));
    expect(fake(dialog.getContent()).className).toBe("g-dialog-content");
    dialog.open();
    const container = fake(dialog.getContainer());
    // Old: addClass(className + "-container"), so only the last class gets the suffix.
    expect(container.className).toBe("g-dialog-container g-a g-b-container visible");
    expect(container.parentElement).toBe(dom.document.body);
    expect(Dialog.openContents()).toEqual([dialog.getContent()]);
    expect(dialog.isOpen()).toBe(true);
    expect(Dialog.isDialogOpen(".g-a")).toBe(true);
  });

  it("uses the content as .g-dialog with nowrap", () => {
    const element = content();
    element.className = "g-dialog g-own";
    const dialog = new Dialog(element, { nowrap: true });
    open.push(dialog);
    expect(dialog.getElement()).toBe(element);
    expect(fake(element).className).toBe("g-dialog g-own");
    dialog.open();
    expect(fake(dialog.getContainer()).children[0]).toBe(fake(element));
  });

  it("closes only the top dialog, and only one opened closable, on Escape", () => {
    const calls: unknown[] = [];
    const lower = make({ closeCallback: (cancelled) => calls.push(["lower", cancelled]) });
    const upper = make({ closeCallback: (cancelled) => calls.push(["upper", cancelled]) });
    lower.open(true);
    upper.open(false);
    escape();
    expect(calls).toEqual([]);
    expect(Dialog.openContents()).toEqual([lower.getContent(), upper.getContent()]);
    upper.closable = true;
    escape();
    expect(calls).toEqual([["upper", true]]);
    expect(Dialog.openContents()).toEqual([lower.getContent()]);
    escape();
    expect(calls).toEqual([
      ["upper", true],
      ["lower", true],
    ]);
  });

  it("closes the top closable dialog on a mousedown on the bare container", () => {
    const dialog = make();
    dialog.open(true);
    const container = fake(dialog.getContainer());
    fire(dialog.getElement(), "mousedown");
    expect(dialog.isOpen()).toBe(true);
    const overlay = dom.document.createElement("div");
    overlay.className = "g-overlay";
    container.append(overlay);
    fire(container, "mousedown");
    expect(dialog.isOpen()).toBe(true);
    overlay.remove();
    fire(container, "mousedown");
    expect(dialog.isOpen()).toBe(false);
  });

  it("closes a lower dialog only with alwaysCloseable, taking it out of the stack", () => {
    const calls: unknown[] = [];
    const plain = make({ closeCallback: () => calls.push("plain") });
    const always = make({ alwaysCloseable: true, closeCallback: (c) => calls.push(["always", c]) });
    const top = make();
    plain.open();
    always.open();
    top.open();
    plain.close();
    expect(calls).toEqual([]);
    always.close(false);
    expect(calls).toEqual([["always", false]]);
    expect(Dialog.openContents()).toEqual([plain.getContent(), top.getContent()]);
    expect(top.isOpen()).toBe(true);
  });

  it("removes the container on the next task by default, after 250 ms for a non-numeric closeTimeout", () => {
    vi.useFakeTimers();
    const dialog = make();
    dialog.open();
    const container = fake(dialog.getContainer());
    dialog.close();
    expect(container.className).toBe("g-dialog-container");
    expect(container.parentElement).toBe(dom.document.body);
    vi.advanceTimersByTime(0);
    expect(container.parentElement).toBeNull();
    expect(dialog.getContainer()).toBeNull();

    const slow = make({ closeTimeout: "slow" as unknown as number });
    slow.open();
    const slowContainer = fake(slow.getContainer());
    slow.close();
    vi.advanceTimersByTime(249);
    expect(slowContainer.parentElement).toBe(dom.document.body);
    vi.advanceTimersByTime(1);
    expect(slowContainer.parentElement).toBeNull();

    const given = make({ closeTimeout: 500 });
    given.open();
    const givenContainer = fake(given.getContainer());
    given.close(false, 10);
    vi.advanceTimersByTime(10);
    expect(givenContainer.parentElement).toBeNull();
  });

  it("takes a dialog reopened before the timer out of its new container", () => {
    vi.useFakeTimers();
    const dialog = make({ releaseOnClose: false, closeTimeout: 100 });
    dialog.open();
    dialog.close();
    dialog.open();
    const second = fake(dialog.getContainer());
    expect(second.children[0]).toBe(fake(dialog.getElement()));
    vi.advanceTimersByTime(100);
    expect(second.children).toEqual([]);
    expect(second.parentElement).toBe(dom.document.body);
    expect(dialog.getContainer()).toBe(second as unknown as HTMLElement);
    expect(dialog.isOpen()).toBe(true);
  });

  it("unmounts its React islands when it is released on close", () => {
    vi.useFakeTimers();
    const released = Dialog.create("content", { buttons: ["OK"], footerStart: "label" });
    open.push(released);
    expect(islands.rendered).toHaveLength(2);
    const footer = fake(released.getElement()).children[1] as FakeElement;
    expect(footer.className).toBe("g-dialog-footer");
    released.open();
    released.close();
    vi.advanceTimersByTime(0);
    expect(islands.unmounted).toEqual([footer, fake(released.getContent())]);

    const kept = Dialog.create("content", { releaseOnClose: false });
    open.push(kept);
    kept.open();
    kept.close();
    vi.advanceTimersByTime(0);
    expect(islands.unmounted).toHaveLength(2);
  });

  it("puts element buttons straight into .buttons, without a React root", () => {
    const ok = dom.document.createElement("button");
    const cancel = dom.document.createElement("button");
    const dialog = make({ buttons: [ok, cancel] as unknown as HTMLElement[] });
    const footer = fake(dialog.getElement()).children[1] as FakeElement;
    const box = footer.children[0] as FakeElement;
    expect(box.className).toBe("buttons");
    expect(box.children).toEqual([ok, cancel]);
    expect(islands.rendered).toEqual([]);
  });

  it("fires open listeners and openCallback with the dialog", () => {
    const seen: unknown[] = [];
    const dialog = make({
      openCallback(this: DialogType) {
        seen.push(["callback", this]);
      },
    });
    dialog.onOpen(() => seen.push("open"));
    dialog.open();
    expect(seen).toEqual(["open", ["callback", dialog]]);
  });
});
