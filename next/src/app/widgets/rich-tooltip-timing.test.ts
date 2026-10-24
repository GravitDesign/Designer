import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import type { Container } from "../shell/container.ts";
import { resetGlobals, setContainer } from "../shell/globals.ts";

/** What the tooltip overlays and the data-title marks saw. */
const log = vi.hoisted(() => ({
  opened: [] as { element: unknown; target: unknown; options: Record<string, unknown> }[],
  closed: [] as unknown[],
  rendered: [] as { props: Record<string, unknown> }[],
  marks: [] as string[],
}));

vi.mock("../dialogs/dialog-container.ts", () => ({
  Overlay: class {
    constructor(
      private readonly element: unknown,
      private readonly options: Record<string, unknown>,
    ) {}
    open(target: unknown) {
      log.opened.push({ element: this.element, target, options: this.options });
    }
    close() {
      log.closed.push(this.element);
    }
    getElement() {
      return this.element;
    }
  },
}));

vi.mock("../state/islands.tsx", () => ({
  renderInto: (_element: unknown, content: { props: Record<string, unknown> }) => {
    log.rendered.push(content);
    return { render: () => undefined, unmount: () => undefined };
  },
}));

vi.mock("../shell/tooltip-position.ts", () => ({
  markRichTooltip: (element: { id: string }) => log.marks.push("mark " + element.id),
  unmarkRichTooltip: (element: { id: string }) => log.marks.push("unmark " + element.id),
}));

const { attachRichTooltip, closeRichTooltip, ENHANCED_TOOLTIPS_PROPERTY } =
  await import("./rich-tooltip.ts");
const { RichTooltipConfig } = await import("./rich-tooltip-config.ts");

let dom: FakeDomHandle;
let enhanced: unknown;
let asked: string[];

beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  enhanced = true;
  asked = [];
  setContainer({
    getProperty: (name: string) => {
      asked.push(name);
      return Promise.resolve(enhanced);
    },
  } as unknown as Container);
});

afterEach(() => {
  closeRichTooltip();
  vi.clearAllTimers();
  vi.useRealTimers();
  log.opened.length = 0;
  log.closed.length = 0;
  log.rendered.length = 0;
  log.marks.length = 0;
  resetGlobals();
  dom.uninstall();
});

function target(id: string, title = id): { element: FakeElement; detach: () => void } {
  const element = dom.document.createElement("button");
  element.setAttribute("id", id);
  Object.assign(element, { id });
  dom.document.body.append(element);
  const detach = attachRichTooltip(
    element as unknown as HTMLElement,
    RichTooltipConfig.from({ title }),
  );
  return { element, detach };
}

/** Runs the timers up to `ms` and lets the stored-setting promise answer. */
async function wait(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

function shownTitles(): unknown[] {
  return log.rendered.map((content) => content.props.title);
}

describe("rich tooltip timing (UI-TOOLTIP-002)", () => {
  it("opens after 500 ms over the element, below it", async () => {
    const { element } = target("a");
    fire(element, "mouseover");
    await wait(499);
    expect(log.opened).toEqual([]);
    await wait(1);
    expect(log.opened).toHaveLength(1);
    expect(log.opened[0]?.target).toBe(element);
    expect(asked).toEqual([ENHANCED_TOOLTIPS_PROPERTY]);
    expect((log.opened[0]?.element as FakeElement).className).toBe("g-rich-tooltip-container");
  });

  it("switches at once while another tooltip is up", async () => {
    const a = target("a");
    const b = target("b");
    fire(a.element, "mouseover");
    await wait(500);
    fire(a.element, "mouseout");
    fire(b.element, "mouseover");
    await wait(0);
    expect(shownTitles()).toEqual(["a", "b"]);
    expect(log.closed).toEqual([log.opened[0]?.element]);
  });

  it("keeps the same tooltip when its element is hovered again", async () => {
    const { element } = target("a");
    fire(element, "mouseover");
    await wait(500);
    fire(element, "mouseout");
    fire(element, "mouseover");
    await wait(500);
    expect(log.opened).toHaveLength(1);
    expect(log.closed).toEqual([]);
  });

  it("hides 100 ms after leaving, unless the pointer moved onto the tooltip", async () => {
    const { element } = target("a");
    fire(element, "mouseover");
    await wait(500);
    const tooltip = log.opened[0]?.element as FakeElement;
    fire(element, "mouseout");
    await wait(50);
    fire(tooltip, "mouseover");
    await wait(100);
    expect(log.closed).toEqual([]);
    fire(tooltip, "mouseout");
    await wait(99);
    expect(log.closed).toEqual([]);
    await wait(1);
    expect(log.closed).toEqual([tooltip]);
  });

  it("cancels a pending show on mousedown", async () => {
    const { element } = target("a");
    fire(element, "mouseover");
    await wait(300);
    fire(element, "mousedown");
    await wait(500);
    expect(log.opened).toEqual([]);
  });

  it("closes on a click on the tooltip", async () => {
    const { element } = target("a");
    fire(element, "mouseover");
    await wait(500);
    const tooltip = log.opened[0]?.element as FakeElement;
    fire(tooltip, "click");
    expect(log.closed).toEqual([tooltip]);
  });

  it("reads the enhanced setting: false turns it off, anything not boolean counts as on", async () => {
    const { element } = target("a");
    enhanced = false;
    fire(element, "mouseover");
    await wait(500);
    // Never stored: undefined, so on.
    enhanced = undefined;
    closeRichTooltip();
    fire(element, "mouseover");
    await wait(500);
    enhanced = "no";
    closeRichTooltip();
    fire(element, "mouseover");
    await wait(500);
    expect(log.rendered.map((content) => content.props.enhanced)).toEqual([false, true, true]);
  });

  it("marks the element for the data-title tooltips and unmarks it on detach", async () => {
    const { element, detach } = target("a");
    expect(log.marks).toEqual(["mark a"]);
    detach();
    expect(log.marks).toEqual(["mark a", "unmark a"]);
    fire(element, "mouseover");
    await wait(500);
    expect(log.opened).toEqual([]);
  });
});
