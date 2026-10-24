import path from "node:path";
import type { Page } from "@playwright/test";
import { NEXT_ROOT } from "../../support/env.ts";
import { openFile } from "../corpus/lib.ts";

/**
 * Input sequences as data. Both apps replay the same list through
 * Playwright input (page.mouse, page.keyboard, CDP touch events).
 *
 * Coordinates: a plain [x, y] is a scene coordinate. It is mapped to the
 * screen through app.editorTools.worldToView() (scene -> view pixels) plus
 * the client position of the .g-editor-widget element. While a mouse
 * button is held the mapping is frozen at the press, so a drag stays put
 * on screen even if the view scrolls or zooms underneath (hand tool, auto
 * pan). { view: [x, y] } is a pixel relative to the widget's top-left and
 * is never mapped (rulers, toolbars, points after a zoom).
 */
export type Pt = readonly [number, number];
export type At = Pt | { readonly view: Pt };
export type Button = "left" | "right" | "middle";

/** Scene or view rectangle [x, y, w, h] for a screenshot. */
export type Rect = readonly [number, number, number, number] | { readonly view: Rect4 };
type Rect4 = readonly [number, number, number, number];

export type Step =
  | { readonly op: "move"; readonly at: At; readonly steps?: number }
  | {
      readonly op: "down";
      readonly at?: At;
      readonly button?: Button;
      /** Don't wait the 350 ms double-click guard since the last release. */
      readonly quick?: boolean;
    }
  | { readonly op: "up"; readonly at?: At; readonly button?: Button; readonly steps?: number }
  | {
      readonly op: "dblclick";
      readonly at: At;
      readonly button?: Button;
      /** Number of clicks in the series (2 = double, 3 = triple). */
      readonly count?: number;
    }
  | { readonly op: "keyDown"; readonly key: string }
  | { readonly op: "keyUp"; readonly key: string }
  | { readonly op: "press"; readonly key: string }
  | { readonly op: "type"; readonly text: string }
  /** Text committed without key events (IME commit, paste-like input). */
  | { readonly op: "insertText"; readonly text: string }
  /** IME composition update (CDP Input.imeSetComposition), caret at the end. */
  | { readonly op: "imeCompose"; readonly text: string }
  | { readonly op: "wait"; readonly ms: number }
  | { readonly op: "wheel"; readonly dx: number; readonly dy: number }
  | {
      readonly op: "touch";
      readonly phase: "start" | "move" | "end";
      readonly points: readonly At[];
    }
  | { readonly op: "action"; readonly id: string }
  | {
      /** Real mouse click(s) at the centre of the first element matching selector. */
      readonly op: "clickElement";
      readonly selector: string;
      readonly count?: number;
    }
  | { readonly op: "tool"; readonly name: string }
  | {
      readonly op: "probe";
      readonly label: string;
      readonly doc?: boolean;
      /** Also record class and text of the first element matching this selector. */
      readonly dom?: string;
      /** Also record the tool changes since the previous one (toolChanges hook). */
      readonly toolChanges?: boolean;
    }
  | { readonly op: "freezeCaret" }
  /**
   * Pins Date.now() and new Date() to `time` (ms) from now on, while
   * timers keep running (page.clock.setFixedTime). Tools that compare wall
   * clock times (the freehand tool's 500 ms continue window) then see
   * exactly the gaps the case sets, whatever the machine load.
   */
  | { readonly op: "fixTime"; readonly time: number }
  /**
   * Replaces the page's timers and clock with Playwright's fake clock and
   * pauses it (page.clock.install + pauseAt), so timed phases (the 750 ms
   * re-render after a wheel zoom) only advance through "runClock". While
   * the clock is paused no animation frame runs, so steps don't wait for
   * one.
   */
  | { readonly op: "pauseClock" }
  /** Advances the paused fake clock by `ms`, firing due timers and frames. */
  | { readonly op: "runClock"; readonly ms: number }
  /**
   * Opens a file (path from the repo root) through File > Open Local File and
   * waits until its document is ready (corpus openFile).
   */
  | { readonly op: "openFile"; readonly file: string }
  /** Full canvas repaint (app.editorTools.repaint). */
  | { readonly op: "repaint" }
  | {
      readonly op: "shot";
      readonly rect: Rect;
      /**
       * Send the last pointer position again after the full repaint, so
       * the active tool paints its transient overlays (snap lines,
       * distance guides) once more; the full repaint drops them. Only for
       * shots of those overlays: the extra partial repaint can change edge
       * antialiasing elsewhere from run to run.
       */
      readonly guides?: boolean;
    };

// Constructors, so case files read like input scripts.
export const move = (x: number, y: number, steps?: number): Step => ({
  op: "move",
  at: [x, y],
  steps,
});
export const moveView = (x: number, y: number, steps?: number): Step => ({
  op: "move",
  at: { view: [x, y] },
  steps,
});
export const down = (x?: number, y?: number, button?: Button, quick?: boolean): Step =>
  x === undefined || y === undefined
    ? { op: "down", button, quick }
    : { op: "down", at: [x, y], button, quick };
export const up = (x?: number, y?: number, button?: Button): Step =>
  x === undefined || y === undefined ? { op: "up", button } : { op: "up", at: [x, y], button };
export const click = (x: number, y: number, button?: Button): Step[] => [
  down(x, y, button),
  up(undefined, undefined, button),
];
export const dblclick = (x: number, y: number, button?: Button): Step => ({
  op: "dblclick",
  at: [x, y],
  button,
});
export const tripleclick = (x: number, y: number): Step => ({
  op: "dblclick",
  at: [x, y],
  count: 3,
});
/** Press at `from`, move through `path` and release at its last point. */
export const drag = (from: Pt, path: readonly Pt[], button?: Button): Step[] => {
  const steps: Step[] = [down(from[0], from[1], button)];
  for (const p of path) steps.push(move(p[0], p[1]));
  steps.push(up(undefined, undefined, button));
  return steps;
};
export const keyDown = (key: string): Step => ({ op: "keyDown", key });
export const keyUp = (key: string): Step => ({ op: "keyUp", key });
export const press = (key: string): Step => ({ op: "press", key });
export const type = (text: string): Step => ({ op: "type", text });
export const wait = (ms: number): Step => ({ op: "wait", ms });
export const insertText = (text: string): Step => ({ op: "insertText", text });
export const imeCompose = (text: string): Step => ({ op: "imeCompose", text });
export const wheel = (dx: number, dy: number): Step => ({ op: "wheel", dx, dy });
export const action = (id: string): Step => ({ op: "action", id });
export const clickElement = (selector: string, count?: number): Step => ({
  op: "clickElement",
  selector,
  count,
});
export const tool = (name: string): Step => ({ op: "tool", name });
export const probe = (label: string, doc?: boolean): Step => ({ op: "probe", label, doc });
export const probeDom = (label: string, dom: string): Step => ({ op: "probe", label, dom });
export const probeToolChanges = (label: string): Step => ({
  op: "probe",
  label,
  toolChanges: true,
});
export const freezeCaret = (): Step => ({ op: "freezeCaret" });
export const fixTime = (time: number): Step => ({ op: "fixTime", time });
export const openFileStep = (file: string): Step => ({ op: "openFile", file });
export const pauseClock = (): Step => ({ op: "pauseClock" });
export const runClock = (ms: number): Step => ({ op: "runClock", ms });
export const repaint = (): Step => ({ op: "repaint" });
export const shot = (x: number, y: number, w: number, h: number): Step => ({
  op: "shot",
  rect: [x, y, w, h],
});
/** A shot that shows the tool's transient guides (see the shot step). */
export const shotGuides = (x: number, y: number, w: number, h: number): Step => ({
  op: "shot",
  rect: [x, y, w, h],
  guides: true,
});
export const shotView = (x: number, y: number, w: number, h: number): Step => ({
  op: "shot",
  rect: { view: [x, y, w, h] },
});
export const touch = (phase: "start" | "move" | "end", ...points: Pt[]): Step => ({
  op: "touch",
  phase,
  points,
});

/** Holds `key` for `ms` milliseconds (spring-loaded tool keys). */
export const hold = (key: string, ms: number, during: readonly Step[] = []): Step[] => [
  keyDown(key),
  ...during,
  wait(ms),
  keyUp(key),
];

type Matrix = readonly number[];

export interface Probe {
  label: string;
  state: unknown;
  cursor: CursorInfo;
  hint: HintInfo | null;
  /**
   * The focused element (tag, id and classes), so a key that "did
   * nothing" can be told apart from a key that went into a text field.
   */
  focus: string | null;
  doc?: unknown;
  dom?: { cls: string; text: string } | null;
  toolChanges?: unknown[];
}

export interface CursorInfo {
  /** The g-cursor-* class on the editor widget, or null. */
  cls: string | null;
  /** Computed CSS cursor with the page origin removed from URLs. */
  css: string;
}

/** The inline hint (coordinates, size, angle) shown next to the cursor. */
export interface HintInfo {
  /** innerHTML of the hint; line breaks are <br>. */
  html: string;
  /** CSS left and top the tool placed it at, in view pixels. */
  left: string;
  top: string;
}

export interface ReplayResult {
  probes: Probe[];
  shot?: Buffer;
}

const MOUSE_BUTTONS: Record<Button, "left" | "right" | "middle"> = {
  left: "left",
  right: "right",
  middle: "middle",
};

/** Lets queued events, setTimeout(0) work and one frame run. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      }),
  );
}

async function worldToView(page: Page): Promise<Matrix> {
  return page.evaluate(() =>
    (
      window as unknown as { __parity: { app: { editorTools: { worldToView(): number[] } } } }
    ).__parity.app.editorTools.worldToView(),
  );
}

async function widgetOrigin(page: Page): Promise<Pt> {
  const box = await page.locator(".g-editor-widget").first().boundingBox();
  if (!box) throw new Error("no .g-editor-widget on the page");
  return [box.x, box.y];
}

export async function readCursor(page: Page): Promise<CursorInfo> {
  return page.evaluate(() => {
    const el = document.querySelector(".g-editor-widget");
    if (!el) return { cls: null, css: "" };
    const cls = [...el.classList].find((c) => c.startsWith("g-cursor-")) ?? null;
    const css = getComputedStyle(el).cursor.split(location.origin).join("");
    return { cls, css };
  });
}

async function readHint(page: Page): Promise<HintInfo | null> {
  return page.evaluate(() => {
    const el = document.querySelector(".g-editor-widget .inline-hint") as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || el.offsetParent === null) {
      return null;
    }
    return { html: el.innerHTML, left: el.style.left, top: el.style.top };
  });
}

async function readFocus(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const id = el.id ? `#${el.id}` : "";
    const cls = [...el.classList].map((c) => `.${c}`).join("");
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  });
}

async function readState(page: Page, withDoc: boolean): Promise<{ state: unknown; doc?: unknown }> {
  return page.evaluate((d) => {
    const hooks = (
      window as unknown as {
        __parity: { app: { editorTools: { state(): unknown; document(): unknown } } };
      }
    ).__parity.app.editorTools;
    return d ? { state: hooks.state(), doc: hooks.document() } : { state: hooks.state() };
  }, withDoc);
}

/**
 * Screenshot of a clip once two consecutive captures are identical, so
 * asynchronous scene rendering has finished.
 */
async function stableShot(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
): Promise<Buffer> {
  let last = await page.screenshot({ clip });
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(120);
    const next = await page.screenshot({ clip });
    if (next.equals(last)) return next;
    last = next;
  }
  throw new Error("canvas did not settle within 5 s");
}

export interface ReplayOptions {
  /** Default interpolation steps for mouse moves. */
  moveSteps?: number;
}

/** Replays `steps`; stops at the first "shot" step and returns its PNG. */
export async function replay(
  page: Page,
  steps: readonly Step[],
  options: ReplayOptions = {},
): Promise<ReplayResult> {
  const probes: Probe[] = [];
  const origin = await widgetOrigin(page);
  let frozen: Matrix | null = null;
  const held = new Set<Button>();
  let lastRelease = 0;
  /** Last mouse position sent, in client pixels. */
  let cur: Pt | null = null;
  let cdp: Awaited<ReturnType<ReturnType<Page["context"]>["newCDPSession"]>> | null = null;
  /** Fake clock paused: animation frames don't run, so don't wait for one. */
  let clockPaused = false;
  const frame = async (): Promise<void> => {
    if (!clockPaused) await settle(page);
  };

  const toClient = async (at: At): Promise<Pt> => {
    if ("view" in at) return [origin[0] + at.view[0], origin[1] + at.view[1]];
    const m = frozen ?? (await worldToView(page));
    const [a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0] = m;
    const [x, y] = at;
    return [origin[0] + a * x + c * y + tx, origin[1] + b * x + d * y + ty];
  };

  const guardDoubleClick = async (quick?: boolean): Promise<void> => {
    if (quick) return;
    const since = Date.now() - lastRelease;
    if (since < 350) await page.waitForTimeout(350 - since);
  };

  for (const step of steps) {
    switch (step.op) {
      case "move": {
        const [x, y] = await toClient(step.at);
        // Interpolate like page.mouse.move(steps), but let a frame pass after
        // each event: Chromium coalesces mouse moves that arrive within one
        // frame, so under load fewer positions would reach the app.
        const n = cur ? (step.steps ?? options.moveSteps ?? 5) : 1;
        const [fx, fy] = cur ?? [x, y];
        for (let i = 1; i <= n; i++) {
          await page.mouse.move(fx + ((x - fx) * i) / n, fy + ((y - fy) * i) / n);
          if (i < n) await frame();
        }
        cur = [x, y];
        break;
      }
      case "down": {
        if (step.at) {
          const [x, y] = await toClient(step.at);
          await page.mouse.move(x, y, { steps: 1 });
          cur = [x, y];
        }
        await guardDoubleClick(step.quick);
        if (held.size === 0) frozen = await worldToView(page);
        const button = step.button ?? "left";
        held.add(button);
        await page.mouse.down({ button: MOUSE_BUTTONS[button] });
        break;
      }
      case "up": {
        if (step.at) {
          const [x, y] = await toClient(step.at);
          await page.mouse.move(x, y, { steps: 1 });
          cur = [x, y];
        }
        const button = step.button ?? "left";
        await page.mouse.up({ button: MOUSE_BUTTONS[button] });
        held.delete(button);
        if (held.size === 0) frozen = null;
        lastRelease = Date.now();
        break;
      }
      case "dblclick": {
        const [x, y] = await toClient(step.at);
        await guardDoubleClick(false);
        await page.mouse.move(x, y, { steps: 1 });
        cur = [x, y];
        const button = MOUSE_BUTTONS[step.button ?? "left"];
        // A real series: press/release with a growing click count, the way
        // the browser reports a double or triple click.
        for (let i = 1; i <= (step.count ?? 2); i++) {
          await page.mouse.down({ button, clickCount: i });
          await page.mouse.up({ button, clickCount: i });
        }
        lastRelease = Date.now();
        break;
      }
      case "keyDown":
        await page.keyboard.down(step.key);
        break;
      case "keyUp":
        await page.keyboard.up(step.key);
        break;
      case "press":
        await page.keyboard.press(step.key);
        break;
      case "type":
        await page.keyboard.type(step.text, { delay: 20 });
        break;
      case "wait":
        await page.waitForTimeout(step.ms);
        break;
      case "insertText":
        await page.keyboard.insertText(step.text);
        break;
      case "imeCompose":
        cdp ??= await page.context().newCDPSession(page);
        await cdp.send("Input.imeSetComposition", {
          text: step.text,
          selectionStart: step.text.length,
          selectionEnd: step.text.length,
        });
        break;
      case "wheel":
        await page.mouse.wheel(step.dx, step.dy);
        // Wheel events are dispatched asynchronously.
        await page.waitForTimeout(50);
        break;
      case "touch": {
        cdp ??= await page.context().newCDPSession(page);
        const touchPoints = [];
        if (step.phase !== "end") {
          for (const [i, p] of step.points.entries()) {
            const [x, y] = await toClient(p);
            touchPoints.push({ x, y, id: i + 1 });
          }
        }
        const type =
          step.phase === "start" ? "touchStart" : step.phase === "move" ? "touchMove" : "touchEnd";
        await cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
        break;
      }
      case "action":
        await page.evaluate(
          (id) =>
            (
              window as unknown as { __parity: { app: { execute(id: string): unknown } } }
            ).__parity.app.execute(id),
          step.id,
        );
        break;
      case "clickElement": {
        const box = await page.locator(step.selector).first().boundingBox();
        if (!box) throw new Error(`no visible element ${step.selector}`);
        await guardDoubleClick(false);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 1 });
        cur = [box.x + box.width / 2, box.y + box.height / 2];
        for (let i = 1; i <= (step.count ?? 1); i++) {
          await page.mouse.down({ clickCount: i });
          await page.mouse.up({ clickCount: i });
        }
        lastRelease = Date.now();
        break;
      }
      case "tool": {
        const activated = await page.evaluate(
          (name) =>
            (
              window as unknown as { __parity: { app: { activateTool(n: string): boolean } } }
            ).__parity.app.activateTool(name),
          step.name,
        );
        if (!activated) throw new Error(`activateTool(${step.name}) found no such tool`);
        break;
      }
      case "fixTime":
        await page.clock.setFixedTime(step.time);
        break;
      case "pauseClock":
        await page.clock.install();
        await page.clock.pauseAt(Date.now() + 1000);
        clockPaused = true;
        break;
      case "runClock":
        if (!clockPaused) throw new Error("runClock needs pauseClock first");
        await page.clock.runFor(step.ms);
        break;
      case "openFile":
        await openFile(page, path.join(NEXT_ROOT, step.file));
        break;
      case "repaint":
        await page.evaluate(() =>
          (
            window as unknown as { __parity: { app: { editorTools: { repaint(): void } } } }
          ).__parity.app.editorTools.repaint(),
        );
        break;
      case "freezeCaret":
        await page.evaluate(() =>
          (
            window as unknown as { __parity: { app: { editorTools: { freezeCaret(): boolean } } } }
          ).__parity.app.editorTools.freezeCaret(),
        );
        break;
      case "probe": {
        await frame();
        const { state, doc } = await readState(page, !!step.doc);
        const probe: Probe = {
          label: step.label,
          state,
          cursor: await readCursor(page),
          hint: await readHint(page),
          focus: await readFocus(page),
        };
        if (step.doc) probe.doc = doc;
        if (step.dom) {
          probe.dom = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? { cls: el.className, text: (el as HTMLElement).innerText } : null;
          }, step.dom);
        }
        if (step.toolChanges) {
          probe.toolChanges = await page.evaluate(() =>
            (
              window as unknown as {
                __parity: { app: { editorTools: { toolChanges(): unknown[] } } };
              }
            ).__parity.app.editorTools.toolChanges(),
          );
        }
        probes.push(probe);
        break;
      }
      case "shot": {
        // Let pending work finish first (corpus settle: no repaint or tile
        // render queued for ten frames), so no late partial repaint of a
        // hover or selection change lands after the full repaint below.
        // Comparing two captures alone can't tell a finished render from
        // one that paused under load.
        const idle = async (): Promise<void> => {
          if (clockPaused) return;
          await page.evaluate(() =>
            (
              window as unknown as {
                __parity: { app: { corpus: { settle(): Promise<void> } } };
              }
            ).__parity.app.corpus.settle(),
          );
        };
        await idle();
        // A full repaint: incremental repaints of dirty areas can leave
        // edge antialiasing that depends on the order areas were painted,
        // and the old editors pick their adaptive outline colour from the
        // bottom-right pixel of the canvas being painted, so a partial
        // repaint can tint handles and outlines. Twice, because the first
        // can itself cause partial repaints (handle icons that load on
        // first use) at a load-dependent moment.
        for (let i = 0; i < 2; i++) {
          await page.evaluate(() =>
            (
              window as unknown as { __parity: { app: { editorTools: { repaint(): void } } } }
            ).__parity.app.editorTools.repaint(),
          );
          await frame();
          await idle();
        }
        // The full repaint drops what tools paint only into the areas they
        // invalidate on a pointer move (snap lines, distance guides and
        // their labels). Sending the last pointer position again makes the
        // active tool paint them once more.
        if (step.guides && cur) {
          await page.mouse.move(cur[0], cur[1], { steps: 1 });
          await frame();
          await idle();
        }
        let rect: Rect4;
        if ("view" in step.rect) {
          const [x, y, w, h] = step.rect.view;
          rect = [origin[0] + x, origin[1] + y, w, h];
        } else {
          const [x, y, w, h] = step.rect;
          const [cx, cy] = await toClient([x, y]);
          const [cx2, cy2] = await toClient([x + w, y + h]);
          rect = [Math.min(cx, cx2), Math.min(cy, cy2), Math.abs(cx2 - cx), Math.abs(cy2 - cy)];
        }
        const shotBuffer = await stableShot(page, {
          x: Math.round(rect[0]),
          y: Math.round(rect[1]),
          width: Math.round(rect[2]),
          height: Math.round(rect[3]),
        });
        return { probes, shot: shotBuffer };
      }
    }
    // Touch sequences are timing sensitive (double tap within 300 ms), so
    // they don't wait for a frame after every event.
    if (step.op !== "touch") await frame();
  }
  return { probes };
}

/**
 * What this area's output needs beyond the shared normalizer
 * (support/normalize.ts), which runs on it afterwards:
 *
 * - Paths graphs keep their anchors, edges and facets as JSON text whose
 *   elements carry random 32-character ids the shared normalizer doesn't
 *   know: the first item of a GPGAnchor, GPGEdge or GPGFacet "props"
 *   array, the two anchor references at props[2] and props[3] of an edge,
 *   and the "euid" edge reference of a facet. These are renamed to
 *   "pgid<n>" in order of first appearance, wherever the same string
 *   occurs; inside JSON text the renaming is textual, so the text itself
 *   is still compared.
 * - Text on a path keeps a JSON copy of its path (atPath) inside the JSON
 *   copy of its text (reftxt), two string levels deep. The shared
 *   normalizer renames ids one level deep only, so ids found two or more
 *   levels deep (under @id, #, &, _effId, _layId or after a "#" marker)
 *   are renamed to "nid<n>" here, everywhere they occur, escaped or not.
 * - Annotations stamp their creation and change times (time, mtime) with
 *   Date.now(). On annotation nodes (nodes with "@" and "uid") a number
 *   between `since` and now becomes "<time>". Any other value, or a time
 *   outside the run, stays as it is and shows up as a difference.
 */
const PATHS_GRAPH_ITEMS: ReadonlySet<string> = new Set(["GPGAnchor", "GPGEdge", "GPGFacet"]);
const PATHS_GRAPH_ID = /^[A-Za-z0-9]{32}$/;
const ANNOTATION_TIME_KEYS: ReadonlySet<string> = new Set(["time", "mtime"]);

export function normalizeIds(value: unknown, since: number): unknown {
  const ids = new Map<string, string>();
  const now = Date.now() + 1000;
  const add = (id: unknown): void => {
    if (typeof id !== "string") return;
    if (!PATHS_GRAPH_ID.test(id))
      throw new Error(`unexpected paths graph id ${JSON.stringify(id)}`);
    if (!ids.has(id)) ids.set(id, `pgid${ids.size + 1}`);
  };
  const looksLikeJson = (v: string): boolean =>
    (v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"));
  const collect = (v: unknown): void => {
    if (typeof v === "string") {
      if (!looksLikeJson(v)) return;
      try {
        collect(JSON.parse(v) as unknown);
      } catch {
        // Not JSON after all.
      }
    } else if (Array.isArray(v)) {
      v.forEach(collect);
    } else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const props = o.props;
      if (typeof o["@"] === "string" && PATHS_GRAPH_ITEMS.has(o["@"]) && Array.isArray(props)) {
        add(props[0]);
        if (o["@"] === "GPGEdge") {
          add(props[2]);
          add(props[3]);
        }
      }
      if (typeof o.euid === "string") add(o.euid);
      Object.values(o).forEach(collect);
    }
  };
  // Ids at least two JSON string levels deep.
  const deep = new Map<string, string>();
  const DEEP_KEYS = new Set(["@id", "#", "&", "_effId", "_layId"]);
  const collectDeep = (v: unknown, depth: number): void => {
    if (typeof v === "string") {
      if (!looksLikeJson(v)) return;
      try {
        collectDeep(JSON.parse(v) as unknown, depth + 1);
      } catch {
        // Not JSON after all.
      }
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (depth >= 2 && item === "#" && typeof v[i + 1] === "string") addDeep(v[i + 1]);
        collectDeep(item, depth);
      });
    } else if (v && typeof v === "object") {
      for (const [k, child] of Object.entries(v)) {
        if (depth >= 2 && DEEP_KEYS.has(k) && typeof child === "string") addDeep(child);
        collectDeep(child, depth);
      }
    }
  };
  const addDeep = (id: string): void => {
    if (!/^[A-Za-z0-9]{6,32}$/.test(id))
      throw new Error(`unexpected nested id ${JSON.stringify(id)}`);
    if (!deep.has(id)) deep.set(id, `nid${deep.size + 1}`);
  };
  const renameDeep = (text: string): string => {
    let out = text;
    for (const [id, name] of deep)
      out = out.replace(new RegExp(`(?<=")${id}(?=\\\\|")`, "g"), name);
    return out;
  };
  const renameText = (text: string): string =>
    text.replace(/"([A-Za-z0-9]{32})"/g, (token, inner: string) => {
      const renamed = ids.get(inner);
      return renamed === undefined ? token : `"${renamed}"`;
    });
  const rename = (v: unknown): unknown => {
    if (typeof v === "string") {
      const renamed = ids.get(v) ?? deep.get(v);
      if (renamed !== undefined) return renamed;
      return looksLikeJson(v) ? renameDeep(renameText(v)) : v;
    }
    if (Array.isArray(v)) return v.map(rename);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const annotation = typeof o["@"] === "string" && "uid" in o;
      const out: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(o)) {
        out[k] =
          annotation &&
          ANNOTATION_TIME_KEYS.has(k) &&
          typeof child === "number" &&
          child >= since &&
          child <= now
            ? "<time>"
            : rename(child);
      }
      return out;
    }
    return v;
  };
  collect(value);
  collectDeep(value, 0);
  return rename(value);
}
