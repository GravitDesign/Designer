import { isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeElement, FakeEvent, installFakeDom } from "../menus/testing/fake-dom.testing.ts";
import type { Container } from "../shell/container.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";

/** The React trees the dialogs rendered, newest last. */
const islands = vi.hoisted(() => ({ rendered: [] as unknown[] }));
const mousetrap = vi.hoisted(() => ({
  bound: new Map<string, () => void>(),
  unbound: [] as string[],
}));

vi.mock("../state/islands.tsx", () => ({
  renderInto: (_element: unknown, content: unknown) => {
    islands.rendered.push(content);
    return {
      render: (next: unknown) => islands.rendered.push(next),
      unmount: () => undefined,
    };
  },
}));

vi.mock("mousetrap", () => ({
  default: {
    bind: (combo: string, callback: () => void) => mousetrap.bound.set(combo, callback),
    unbind: (combo: string) => {
      mousetrap.unbound.push(combo);
      mousetrap.bound.delete(combo);
    },
  },
}));

// dialog.ts adds its Escape listener when it loads: the fake document
// has to exist first and stays for the whole file.
const dom = installFakeDom();
(globalThis as Record<string, unknown>).HTMLElement ??= FakeElement;
(globalThis as Record<string, unknown>).HTMLInputElement ??= FakeElement;
// app/config.ts reads the host when it loads.
Object.assign(globalThis.window, { location: { host: "localhost", href: "http://localhost/" } });
const { Dialog } = await import("./dialog.ts");
const { SystemDialog } = await import("./system-dialog.ts");
const { PromptView, SpanButton, TextButton, DontShowAgainLabel } =
  await import("./system-dialog-view.tsx");

let properties: Map<string, unknown>;
let settings: Map<string, unknown>;

beforeEach(() => {
  properties = new Map();
  settings = new Map();
  setContainer({
    getProperty: (name: string) => Promise.resolve(properties.get(name)),
    setProperty: (name: string, value: unknown) => properties.set(name, value),
  } as unknown as Container);
  setDesigner({
    getSetting: (name: string, fallback: unknown) =>
      settings.has(name) ? settings.get(name) : fallback,
    setSetting: (name: string, value: unknown) => settings.set(name, value),
    stats: () => undefined,
    getToolbar: () => null,
  } as unknown as Designer);
});

afterEach(() => {
  for (const content of [...Dialog.openContents()].reverse()) {
    const dialog = Dialog.of(content);
    if (dialog) {
      dialog.options.alwaysCloseable = true;
      dialog.close();
    }
  }
  islands.rendered.length = 0;
  mousetrap.bound.clear();
  mousetrap.unbound.length = 0;
  resetGlobals();
});

/** Every element of `type` in the rendered trees, in render order. */
function find<P>(type: unknown): P[] {
  const found: P[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (isValidElement(node)) {
      const element = node as ReactElement<Record<string, unknown>>;
      if (element.type === type) found.push(element.props as P);
      for (const value of Object.values(element.props)) walk(value);
    }
  };
  islands.rendered.forEach(walk);
  return found;
}

type ButtonProps = { text?: string; label?: string; onClick: () => void };

function buttons(): ButtonProps[] {
  return [...find<ButtonProps>(TextButton), ...find<ButtonProps>(SpanButton)];
}

function key(type: string, keyCode: number): FakeEvent {
  const event = new FakeEvent(type, { keyCode });
  dom.document.dispatchEvent(event);
  return event;
}

function top() {
  const contents = Dialog.openContents();
  return Dialog.of(contents[contents.length - 1] as HTMLElement);
}

describe("SystemDialog.confirm (module 44)", () => {
  it("confirms on Enter in the capture phase, only while on top, then stops listening", async () => {
    const done: boolean[] = [];
    const before = dom.document.listenerCount("keydown");
    await SystemDialog.confirm("Sure?", (ok) => done.push(ok), null, null, false, true, true);
    expect(dom.document.listenerCount("keydown")).toBe(before + 1);
    const confirm = top();
    const other = new Dialog(dom.document.createElement("div") as unknown as HTMLElement);
    other.open();
    expect(key("keydown", 13).defaultPrevented).toBe(false);
    expect(done).toEqual([]);
    other.close();
    const event = key("keydown", 13);
    expect(event.defaultPrevented).toBe(true);
    expect(event.immediateStopped).toBe(true);
    expect(done).toEqual([true]);
    expect(confirm?.isOpen()).toBe(false);
    expect(dom.document.listenerCount("keydown")).toBe(before);
  });

  it("cancels on Escape with escapeCancels, and keeps listening when closed another way", async () => {
    const done: boolean[] = [];
    const before = dom.document.listenerCount("keydown");
    await SystemDialog.confirm("Sure?", (ok) => done.push(ok), null, null, true, false, true);
    key("keydown", 27);
    expect(done).toEqual([false]);
    expect(dom.document.listenerCount("keydown")).toBe(before);

    await SystemDialog.confirm("Again?", (ok) => done.push(ok), null, null, true, true, false);
    // Escape (no escapeCancels) reaches the dialog stack, which closes
    // the closable dialog without calling done or removing the listener.
    key("keydown", 27);
    expect(Dialog.openContents()).toEqual([]);
    expect(done).toEqual([false]);
    expect(dom.document.listenerCount("keydown")).toBe(before + 1);
  });

  it("answers with the buttons, and a disabled OK does nothing", async () => {
    const done: boolean[] = [];
    await SystemDialog.confirm("Sure?", (ok) => done.push(ok), "No", {
      text: "Go",
      disabled: true,
    });
    const [cancel, ok] = buttons();
    expect([cancel?.text, ok?.text]).toEqual(["No", "Go"]);
    ok?.onClick();
    expect(done).toEqual([]);
    cancel?.onClick();
    expect(done).toEqual([false]);
  });

  it("skips the dialog when the stored setting is true, and its box stores the choice", async () => {
    properties.set("never-ask", true);
    const done: boolean[] = [];
    await SystemDialog.confirm(
      "Sure?",
      (ok) => done.push(ok),
      null,
      null,
      false,
      false,
      false,
      "never-ask",
    );
    expect(Dialog.openContents()).toEqual([]);
    expect(done).toEqual([]);

    properties.set("never-ask", false);
    await SystemDialog.confirm(
      "Sure?",
      (ok) => done.push(ok),
      null,
      null,
      false,
      false,
      false,
      "never-ask",
    );
    expect(fakeOf(top()?.getElement()).className).toBe(
      "g-dialog g-system-dialog g-confirm-dialog g-onetime-dialog",
    );
    const [box] = find<{ onChange: (checked: boolean) => void }>(DontShowAgainLabel);
    box?.onChange(true);
    expect(properties.get("never-ask")).toBe(true);
  });
});

function fakeOf(element: unknown): FakeElement {
  return element as FakeElement;
}

describe("SystemDialog.prompt", () => {
  type PromptProps = { onKeyPress: (event: unknown, element: unknown) => void };

  it("gives the typed value on Enter and nothing on Escape", () => {
    const values: unknown[] = [];
    SystemDialog.prompt("Name?", (value) => values.push(value), "abc");
    const [view] = find<PromptProps>(PromptView);
    view?.onKeyPress({ keyCode: 13, key: "Enter" }, { value: "typed" });
    expect(values).toEqual(["typed"]);
    expect(Dialog.openContents()).toEqual([]);

    SystemDialog.prompt("Name?", (value) => values.push(value), "abc");
    find<PromptProps>(PromptView)[1]?.onKeyPress({ keyCode: 27, key: "Escape" }, { value: "x" });
    expect(values).toEqual(["typed", undefined]);
  });

  it("gives true for a custom element, from OK and from Enter", () => {
    const values: unknown[] = [];
    const custom = dom.document.createElement("select") as unknown as HTMLElement;
    SystemDialog.prompt("Pick", (value) => values.push(value), custom, null, null, "g-pick");
    expect(fakeOf(top()?.getElement()).className).toBe(
      "g-dialog g-system-dialog g-prompt-dialog g-pick",
    );
    const [, ok] = buttons();
    ok?.onClick();
    expect(values).toEqual([true]);
    expect(Dialog.openContents()).toEqual([]);
  });

  it("gets an undefined class without a class name, as before", () => {
    SystemDialog.prompt("Name?", null);
    expect(fakeOf(top()?.getElement()).className).toBe(
      "g-dialog g-system-dialog g-prompt-dialog undefined",
    );
  });
});

describe("SystemDialog.alert", () => {
  it("closes on an Enter keypress while on top, once", () => {
    let calls = 0;
    const before = dom.document.listenerCount("keypress");
    SystemDialog.alert("Hi", () => ++calls);
    expect(dom.document.listenerCount("keypress")).toBe(before + 1);
    key("keypress", 13);
    expect(calls).toBe(1);
    expect(dom.document.listenerCount("keypress")).toBe(before);
    key("keypress", 13);
    expect(calls).toBe(1);
  });

  it("ignores Enter with closeByEnter false", () => {
    let calls = 0;
    SystemDialog.alert("Hi", () => ++calls, { closeByEnter: false, className: "g-x" });
    key("keypress", 13);
    expect(calls).toBe(0);
    expect(fakeOf(top()?.getElement()).className).toBe(
      "g-dialog g-system-dialog g-alert-dialog g-x",
    );
    buttons()[0]?.onClick();
    expect(calls).toBe(1);
  });
});

describe("SystemDialog._dialogV1", () => {
  /** Answers the selectors the close callback asks the content for. */
  function answer(found: Record<string, unknown>): void {
    const content = top()?.getContent() as unknown as { querySelector: (s: string) => unknown };
    content.querySelector = (selector: string) => found[selector] ?? null;
  }

  it("rejects when cancelled", async () => {
    const promise = SystemDialog.warning({ title: "T" });
    buttons()[0]?.onClick();
    await expect(promise).rejects.toBeUndefined();
  });

  it("resolves with the checked option's index and stores the setting box", async () => {
    const promise = SystemDialog.warning({
      setting: "skip",
      options: { values: ["a", "b", "c"] },
    });
    answer({
      'input[data-property="skip"]': { checked: true },
      'input[name="options"]:checked': { value: "2" },
    });
    buttons()[1]?.onClick();
    await expect(promise).resolves.toBe(2);
    expect(settings.get("skip")).toBe(true);
  });

  it("resolves with 0 when nothing is checked, and undefined without options", async () => {
    const withOptions = SystemDialog.warning({ setting: "skip", options: { values: ["a"] } });
    answer({});
    buttons()[1]?.onClick();
    await expect(withOptions).resolves.toBe(0);
    expect(settings.get("skip")).toBe(false);
    islands.rendered.length = 0;
    const plain = SystemDialog.info({});
    buttons()[0]?.onClick();
    await expect(plain).resolves.toBeUndefined();
  });
});

describe("SystemDialog.custom and advanced", () => {
  it("custom closes before onclick, advanced runs onclick before close(false)", () => {
    const order: string[] = [];
    SystemDialog.custom({
      closeCallback: (cancelled) => order.push("custom closed " + cancelled),
      buttons: [{ label: "A", closeOnClick: true, onclick: () => order.push("custom onclick") }],
    });
    buttons()[0]?.onClick();
    expect(order).toEqual(["custom closed undefined", "custom onclick"]);
    order.length = 0;
    islands.rendered.length = 0;
    SystemDialog.advanced({
      closeCallback: (cancelled) => order.push("advanced closed " + cancelled),
      buttons: [{ label: "B", closeOnClick: true, onclick: () => order.push("advanced onclick") }],
    });
    buttons()[0]?.onClick();
    expect(order).toEqual(["advanced onclick", "advanced closed false"]);
  });

  it("runs a button once, and unbinds the combos on click and on close", () => {
    let runs = 0;
    SystemDialog.custom({
      buttons: [
        { label: "OK", shortcut: "enter", onclick: () => ++runs },
        { label: "Cancel", shortcut: "esc" },
      ],
    });
    expect([...mousetrap.bound.keys()]).toEqual(["enter", "esc"]);
    mousetrap.bound.get("enter")?.();
    buttons()[0]?.onClick();
    expect(runs).toBe(1);
    expect(mousetrap.unbound).toEqual(["enter", "esc"]);

    mousetrap.unbound.length = 0;
    islands.rendered.length = 0;
    const dialog = SystemDialog.advanced({ buttons: [{ label: "X", shortcut: "x" }] });
    dialog.close(true);
    expect(mousetrap.unbound).toEqual(["x"]);
  });
});
