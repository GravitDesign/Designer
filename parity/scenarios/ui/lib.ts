// Shared driver code for the UI surface scenarios.
//
// Every surface is recorded as element screenshots (kind "png", cropped to
// the surface) in the light and dark theme, plus a DOM structure snapshot
// (kind "json") of the same subtree. Everything here only uses real input
// and the old CSS class names, so the same drivers run against the new app.
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { PARITY_CONTEXT, openApp, type OpenOptions } from "../../support/apps.ts";
import type { Scenario, ScenarioContext } from "../../support/scenario.ts";

/**
 * Injected identically into both apps: no transitions, animations or caret.
 * HIDE_SCROLLBARS_CSS also hides the scrollbars for most scenarios, so a
 * scroll position or overlay scrollbar fading on its own timer can't reach
 * the shot; ui/shell/scrollbars records the app's scrollbar styles.
 */
export const FREEZE_CSS =
  "*,*::before,*::after{transition:none!important;animation:none!important;" +
  "caret-color:transparent!important}";
export const HIDE_SCROLLBARS_CSS =
  "*,*::before,*::after{scrollbar-width:none!important}" +
  "::-webkit-scrollbar{display:none!important}";

/** A spot over the empty right part of the toolbar: hovers nothing. */
export const NEUTRAL = { x: 1590, y: 66 } as const;

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"];

/** Language settings recorded to prove the UI is the same (QUESTIONS.md Q-001). */
export const LOCALES: readonly string[] = ["en", "de-DE", "ja-JP", "zh-CN"];

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Waits until the stylesheet for the current theme is loaded; with
 * `theme`, until that theme's stylesheet is the one in use (index.html
 * links the light one, and the app swaps it after boot).
 */
export async function waitForTheme(page: Page, theme?: Theme): Promise<void> {
  await page.waitForFunction((want) => {
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
    const app = links.find((l) => /designer\.browser\.(light|dark)\.css$/.test(l.href));
    if (want && app && !app.href.endsWith(`designer.browser.${want}.css`)) return false;
    if (
      want &&
      links.some((l) => l !== app && /designer\.browser\.(light|dark)\.css$/.test(l.href))
    ) {
      return false;
    }
    if (!app || !app.sheet) return false;
    try {
      if (app.sheet.cssRules.length === 0) return false;
    } catch {
      return false;
    }
    // The app keeps #mainframe hidden until init (and a theme load) is done.
    const frame = document.getElementById("mainframe");
    return !frame || getComputedStyle(frame).display !== "none";
  }, theme);
}

/** The shell has its normal layout: menu bar on top, canvas below the toolbar. */
async function laidOut(page: Page): Promise<string> {
  return page.evaluate(() => {
    const bar = document.querySelector("nav.g-menu-bar")?.getBoundingClientRect();
    const windows = document.getElementById("windows")?.getBoundingClientRect();
    const ok = !!bar && !!windows && bar.top < 10 && bar.height < 60 && windows.top < 200;
    return ok
      ? ""
      : `menu bar ${bar ? `${bar.top}+${bar.height}` : "-"}, windows ${windows ? windows.top : "-"}`;
  });
}

/**
 * Waits until the main panels stop moving: the app lays itself out again
 * after its stylesheet loads and after a window resize (debounced), and a
 * click during that lands on whatever is passing by.
 */
export async function waitForLayout(page: Page): Promise<void> {
  const boxes = () =>
    page.evaluate(() =>
      ["#windows", "#left-sidebars", "#right-sidebars", "#header", "#toolbar"]
        .map((sel) => {
          const r = document.querySelector(sel)?.getBoundingClientRect();
          return r ? `${r.x},${r.y},${r.width},${r.height}` : "-";
        })
        .join(" "),
    );
  let last = await boxes();
  for (let stable = 0, i = 0; stable < 3 && i < 100; i++) {
    await page.waitForTimeout(200);
    const now = await boxes();
    stable = now === last ? stable + 1 : 0;
    last = now;
  }
}

/** Fonts loaded, two frames painted and a short quiet period. */
export async function settle(page: Page, ms = 150): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
  await page.waitForTimeout(ms);
}

/** Every <img> in the page finished loading or failed (library tiles fail). */
export async function waitForImages(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, {
    timeout: 20_000,
  });
}

/**
 * Common start of every UI driver. Scrollbars are hidden unless
 * `scrollbars` is set (ui/shell/scrollbars records them).
 */
export async function prepare(page: Page, options: { scrollbars?: boolean } = {}): Promise<void> {
  // Fail fast when a selector or event never shows up.
  page.setDefaultTimeout(30_000);
  await page.addStyleTag({ content: FREEZE_CSS });
  if (!options.scrollbars) await page.addStyleTag({ content: HIDE_SCROLLBARS_CSS });
  // The stored theme's stylesheet, not index.html's light one before the swap.
  // No theme chosen ("default") means light in the classic look and the
  // device's theme in the next look, as in themes/theme.ts.
  const theme = await page.evaluate(() => {
    const stored = (
      JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as {
        theme?: string;
      }
    ).theme;
    if (stored && stored !== "default") return stored as "light" | "dark";
    const next = document.documentElement.getAttribute("data-branding") === "next";
    return next && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  await waitForTheme(page, theme);
  await waitForImages(page);
  await waitForLayout(page);
  // Remember where the mouse is, so a repaint can restore hover states.
  await page.evaluate(() => {
    window.addEventListener(
      "mousemove",
      (e) => {
        (window as unknown as { __uiMouse?: [number, number] }).__uiMouse = [e.clientX, e.clientY];
      },
      true,
    );
  });
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await rerender(page);
  await settle(page, 300);
}

/**
 * Drops every compositor layer and paints the page again from scratch.
 * Incremental repaints (and layers created while startup transitions ran)
 * leave +-1 colour steps on edges at fractional positions that differ from
 * run to run; hiding the whole document and showing it again makes the
 * result the same every time.
 *
 * With `keepState`, focus, text selection and hover survive: focus events
 * are swallowed while the document is hidden, the focused element and its
 * selection are restored, and the mouse is nudged so :hover is recomputed.
 */
export async function rerender(page: Page, keepState = false): Promise<void> {
  const tips = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll(".g-tooltip, .g-rich-tooltip-container")].filter((t) => {
          const r = t.getBoundingClientRect();
          return r.width > 0 && getComputedStyle(t).display !== "none";
        }).length,
    );
  const tipsBefore = keepState ? await tips() : 0;
  await page.evaluate(async (hide) => {
    const frames = () =>
      new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const swallow = (e: Event) => e.stopImmediatePropagation();
    const kinds = ["blur", "focus", "focusin", "focusout"];
    for (const k of kinds) window.addEventListener(k, swallow, true);
    const active = document.activeElement as HTMLElement | null;
    let inputSel: [number | null, number | null] | null = null;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      try {
        inputSel = [active.selectionStart, active.selectionEnd];
      } catch {
        inputSel = null;
      }
    }
    const sel = window.getSelection();
    const ranges = sel ? [...Array(sel.rangeCount).keys()].map((n) => sel.getRangeAt(n)) : [];
    const root = document.documentElement;
    // display:none would fire the app's relayout (menus reposition while
    // everything measures 0); visibility keeps every box where it is.
    const prop = hide ? "display" : "visibility";
    root.style.setProperty(prop, hide ? "none" : "hidden");
    void document.body.offsetHeight;
    await frames();
    root.style.removeProperty(prop);
    void document.body.offsetHeight;
    if (active && active !== document.body && active.isConnected) {
      active.focus({ preventScroll: true });
      if (
        inputSel &&
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
      ) {
        try {
          active.setSelectionRange(inputSel[0], inputSel[1]);
        } catch {
          // Not a text input.
        }
      }
    }
    if (sel && ranges.length && !inputSel) {
      sel.removeAllRanges();
      for (const r of ranges) sel.addRange(r);
    }
    await frames();
    for (const k of kinds) window.removeEventListener(k, swallow, true);
  }, !keepState);
  if (keepState) {
    const at = await page.evaluate(
      () => (window as unknown as { __uiMouse?: [number, number] }).__uiMouse ?? null,
    );
    if (at) {
      await page.mouse.move(at[0] + 1, at[1]);
      await page.mouse.move(at[0], at[1]);
    }
    // The nudge can hide a simple tooltip; it comes back after its delay.
    for (let i = 0; i < 30 && (await tips()) < tipsBefore; i++) await page.waitForTimeout(100);
    await settle(page, 100);
  }
}

/** Union of the boxes of every visible element matching one of the selectors. */
export async function clipOf(
  page: Page,
  selectors: readonly string[],
  pad = 0,
  clipToWindow = false,
): Promise<Clip> {
  const box = await page.evaluate(
    ({ selectors: sels, pad: p }) => {
      let x1 = Infinity;
      let y1 = Infinity;
      let x2 = -Infinity;
      let y2 = -Infinity;
      for (const sel of sels) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          // Fully transparent or hidden boxes (a faded-out tooltip left in
          // place) don't count.
          const visible = el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
          if (r.width === 0 || r.height === 0 || !visible) continue;
          x1 = Math.min(x1, r.left);
          y1 = Math.min(y1, r.top);
          x2 = Math.max(x2, r.right);
          y2 = Math.max(y2, r.bottom);
        }
      }
      if (x1 === Infinity) return null;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.floor(x1 - p);
      const top = Math.floor(y1 - p);
      const right = Math.ceil(x2 + p);
      const bottom = Math.ceil(y2 + p);
      // Padding may reach past the window edge; the surface itself may not,
      // or part of it would silently be left out of the shot.
      // Sub-pixel overhang from fractional layout is not cut content.
      const outside = x1 < -1 || y1 < -1 || x2 > vw + 1 || y2 > vh + 1;
      return {
        x: Math.max(0, left),
        y: Math.max(0, top),
        width: Math.min(vw, right) - Math.max(0, left),
        height: Math.min(vh, bottom) - Math.max(0, top),
        outside: outside ? `${x1},${y1} - ${x2},${y2} in ${vw}x${vh}` : "",
      };
    },
    { selectors, pad },
  );
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error(`nothing visible for ${selectors.join(", ")}`);
  }
  if (box.outside && !clipToWindow) {
    throw new Error(`${selectors.join(", ")} reaches outside the window (${box.outside})`);
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

/**
 * Screenshots the clip until two consecutive shots are identical, so a
 * late repaint (canvas, images, fonts) can't slip into the recording.
 */
export async function stableShot(page: Page, clip: Clip): Promise<Buffer> {
  let previous: Buffer | undefined;
  for (let i = 0; i < 40; i++) {
    const shot = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
    if (previous && previous.equals(shot)) return shot;
    previous = shot;
    await page.waitForTimeout(100);
  }
  throw new Error("screenshot never became stable");
}

export async function shoot(
  page: Page,
  selectors: readonly string[],
  pad = 0,
  clipToWindow = false,
): Promise<Buffer> {
  await settle(page);
  await rerender(page, true);
  return stableShot(page, await clipOf(page, selectors, pad, clipToWindow));
}

export interface DomNode {
  tag: string;
  cls?: string[];
  id?: string;
  text?: string;
  attrs?: Record<string, string>;
  props?: Record<string, string | boolean>;
  hidden?: true;
  children?: DomNode[];
}

/**
 * Structure of the visible subtrees matching the selectors: tag, classes,
 * direct text, the attributes that matter (with inline styles and aria-*)
 * and form state. Generated ids are numbered in order of appearance, canvas
 * content is left out, and hidden subtrees are reported as hidden without
 * children.
 */
export async function domOf(page: Page, selectors: readonly string[]): Promise<DomNode[]> {
  await settle(page);
  return page.evaluate((sels) => {
    const ATTRS = [
      "title",
      "data-title",
      "data-action",
      "data-property",
      "data-setting",
      "data-mode",
      "data-value",
      "data-panel-id",
      "data-dimension",
      "data-op",
      "data-palette",
      "data-ratio",
      "data-dist",
      "data-property-row",
      "data-drag-mode",
      "data-long-press-delay",
      "data-g-touch-tool",
      "g-touch-tool",
      "data-wrap",
      "type",
      "name",
      "placeholder",
      "for",
      "href",
      "src",
      "accept",
      "multiple",
      "readonly",
      "draggable",
      "colspan",
      "label",
      "min",
      "max",
      "step",
      "maxlength",
      "role",
      "tabindex",
      "contenteditable",
      "style",
    ];
    // Ids with digits are generated (a counter per widget); they are kept
    // as the order they first appear in, so a label's `for` still names
    // the same input.
    const volatileId = /\d/;
    const idNames = new Map<string, string>();
    const idName = (id: string): string => {
      if (!volatileId.test(id)) return id;
      let name = idNames.get(id);
      if (!name) {
        name = `<id${idNames.size + 1}>`;
        idNames.set(id, name);
      }
      return name;
    };
    const isHidden = (el: Element): boolean => {
      const st = getComputedStyle(el);
      return st.display === "none" || st.visibility === "hidden";
    };
    const snap = (el: Element): DomNodeLike => {
      const node: DomNodeLike = { tag: el.tagName.toLowerCase() };
      const cls = [...el.classList];
      if (cls.length) node.cls = cls;
      if (el.id) node.id = idName(el.id);
      const attrs: Record<string, string> = {};
      const names = [
        ...ATTRS,
        ...el.getAttributeNames().filter((n) => n.startsWith("aria-") && !ATTRS.includes(n)),
      ];
      for (const a of names) {
        const v = el.getAttribute(a);
        if (v === null) continue;
        if (a === "for" || a === "aria-labelledby" || a === "aria-describedby") {
          attrs[a] = v.split(" ").map(idName).join(" ");
        } else if (a === "style") {
          // Inline data URIs (swatch previews, icons) are kept as their length.
          attrs[a] = v
            .replace(/url\("?data:[^)]*\)/g, (m) => `url(data:(${m.length} chars))`)
            .replace(/https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/g, "");
        } else if ((a === "src" || a === "href") && v.startsWith("data:")) {
          attrs[a] = `data:(${v.length} chars)`;
        } else if (a === "src" || a === "href") {
          // Absolute URLs differ by port between the apps; keep the path.
          attrs[a] = v.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, "");
        } else attrs[a] = v;
      }
      if (Object.keys(attrs).length) node.attrs = attrs;
      const props: Record<string, string | boolean> = {};
      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox" || el.type === "radio") props.checked = el.checked;
        else if (el.type !== "file") props.value = el.value;
        if (el.disabled) props.disabled = true;
      } else if (el instanceof HTMLSelectElement) {
        props.value = el.value;
        if (el.disabled) props.disabled = true;
      } else if (el instanceof HTMLTextAreaElement) {
        props.value = el.value;
      } else if (el instanceof HTMLButtonElement || el instanceof HTMLOptionElement) {
        if (el.disabled) props.disabled = true;
        if (el instanceof HTMLOptionElement && el.selected) props.selected = true;
      }
      if (Object.keys(props).length) node.props = props;
      if (isHidden(el)) {
        node.hidden = true;
        return node;
      }
      let text = "";
      for (const c of el.childNodes) {
        if (c.nodeType === Node.TEXT_NODE) text += c.textContent ?? "";
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text) node.text = text;
      const tag = node.tag;
      if (tag === "canvas" || tag === "svg" || tag === "script" || tag === "style") return node;
      const children = [...el.children].map(snap);
      if (children.length) node.children = children;
      return node;
    };
    interface DomNodeLike {
      tag: string;
      cls?: string[];
      id?: string;
      text?: string;
      attrs?: Record<string, string>;
      props?: Record<string, string | boolean>;
      hidden?: true;
      children?: DomNodeLike[];
    }
    const out: DomNodeLike[] = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        out.push(snap(el));
      }
    }
    return out;
  }, selectors);
}

// ---------------------------------------------------------------------------
// Input helpers

const SUBMENUS = "ul.g-menu:not(.g-menu-root):visible";

/** Waits until exactly `count` submenus are open. */
async function waitForMenus(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (n) =>
      [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].filter((m) => {
        const r = m.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(m).visibility !== "hidden";
      }).length === n,
    count,
  );
}

/** Clicks a top-level menu and hovers down a path of submenu captions. */
export async function openMenu(page: Page, path: readonly string[]): Promise<void> {
  const [top, ...rest] = path;
  if (!top) throw new Error("empty menu path");
  await page
    .locator("nav.g-menu-bar ul.g-menu-root > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${top}")`),
    })
    .click();
  await waitForMenus(page, 1);
  await settle(page);
  for (let depth = 0; depth < rest.length; depth++) {
    const caption = rest[depth] ?? "";
    await hoverMenuItem(page, caption, depth);
    // Items with a submenu open it on hover; the last item may be a leaf.
    const hasSub = await page
      .locator(SUBMENUS)
      .nth(depth)
      .locator(":scope > li.g-menu-item", {
        has: page.locator(`:scope > .g-menu-item-caption:text-is("${caption}")`),
      })
      .first()
      .evaluate((li) => li.classList.contains("g-menu-item-menu"));
    if (hasSub) await waitForMenus(page, depth + 2);
    await settle(page);
  }
}

/** Hovers the item with this caption in the open (non-root) menu at depth. */
export async function hoverMenuItem(page: Page, caption: string, depth = -1): Promise<void> {
  const menus = page.locator(SUBMENUS);
  const n = await menus.count();
  const menu = depth < 0 ? menus.nth(n - 1) : menus.nth(depth);
  const item = menu
    .locator(":scope > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${caption}")`),
    })
    .first();
  await item.hover();
}

/** Opens a menu path and clicks its last item; waits until the menu closed. */
export async function clickMenu(page: Page, path: readonly string[]): Promise<void> {
  await openMenu(page, path);
  const last = path[path.length - 1] ?? "";
  const menus = page.locator(SUBMENUS);
  await menus
    .nth((await menus.count()) - 1)
    .locator(":scope > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${last}")`),
    })
    .first()
    .click();
  await waitForMenus(page, 0);
  await settle(page);
}

export const OPEN_MENUS = ["ul.g-menu:not(.g-menu-root)"] as const;

/** Inserts shapes through the G namespace; returns nothing (state lives in the page). */
export async function insertShapes(page: Page, shapes: readonly ShapeSpec[]): Promise<void> {
  await page.evaluate((list) => {
    const p = (window as unknown as { __parity: { G: GLike; app: AppLike } }).__parity;
    interface GLike {
      [k: string]: new () => NodeLike;
    }
    interface NodeLike {
      setProperty(k: string, v: unknown): void;
    }
    interface AppLike {
      editor(): {
        insertElements(e: NodeLike[]): void;
        updateSelection(t: boolean, e: NodeLike[]): void;
        clearSelection(): void;
      };
    }
    const G = p.G as unknown as Record<string, new (...a: unknown[]) => NodeLike>;
    const made: NodeLike[] = [];
    for (const s of list) {
      const Ctor = G[s.type];
      if (!Ctor) throw new Error(`no ${s.type}`);
      const n = new Ctor();
      const T = G.GTransform as unknown as new (...a: number[]) => unknown;
      n.setProperty("trf", new T(s.w / 2, 0, 0, s.h / 2, s.x + s.w / 2, s.y + s.h / 2));
      if (s.name) n.setProperty("name", s.name);
      p.app.editor().insertElements([n]);
      made.push(n);
    }
    const sel = list.map((s, i) => (s.select === false ? null : made[i])).filter(Boolean);
    if (sel.length) p.app.editor().updateSelection(false, sel as NodeLike[]);
    else p.app.editor().clearSelection();
  }, shapes);
  await settle(page);
}

export interface ShapeSpec {
  type: "GRectangle" | "GEllipse" | "GPolygon" | "GText";
  x: number;
  y: number;
  w: number;
  h: number;
  name?: string;
  select?: boolean;
}

// ---------------------------------------------------------------------------
// Scenario builders

export interface SurfaceSpec {
  /** Scenario id below "ui/", e.g. "welcome/dialog". */
  id: string;
  covers: readonly string[];
  /** Open options (theme and language are set per variant). */
  open?: Omit<OpenOptions, "theme" | "language">;
  viewport?: { width: number; height: number };
  /** Drives the app into the state to record. */
  setup?: (page: Page) => Promise<void>;
  /** Selectors whose union box is screenshotted. */
  shot: readonly string[];
  /** Pixels around the union box. */
  pad?: number;
  /** Selectors whose subtrees go into the DOM snapshot; defaults to shot. */
  dom?: readonly string[] | false;
  /** Themes to screenshot; default both. */
  themes?: readonly Theme[];
  /** Also record png + DOM with these browser locales (light theme). */
  locales?: readonly string[];
  /** Also record png + DOM with these language settings (light theme). */
  languages?: readonly string[];
  /**
   * The surface reaches past the window and that is the recorded state
   * (an old layout bug); shoot the part inside the window instead of
   * failing.
   */
  clipToWindow?: boolean;
  /** Keep the scrollbars (FREEZE_CSS hides them by default). */
  scrollbars?: boolean;
  timeout?: number;
  /**
   * The surface belongs to a feature the new app removes (REMOVED.md):
   * for the new app, every variant runs the setup and then this check,
   * which throws if the surface is still there.
   */
  removedInNewApp?: (page: Page) => Promise<void>;
}

/**
 * The browser locale every scenario runs with by default. PARITY_CONTEXT
 * already pins the context to it, so the page the harness opened can be
 * used as it is.
 */
export const DEFAULT_LOCALE = PARITY_CONTEXT.locale;

/** Browser locales recorded for the main surfaces. */
export const BROWSER_LOCALES: readonly string[] = ["de-DE", "ja-JP", "zh-CN"];

/**
 * Gets the page the harness opened ready for a UI driver. The engine's
 * strings follow navigator.language (German, Japanese ... tables exist in
 * chunk.vendor.js), so for another `locale` the app is loaded again with
 * navigator.language / navigator.languages reporting it; `reload` does the
 * same for a page whose viewport was changed before the app booted. The
 * reload goes through openApp, so every other open option is kept.
 */
export async function start(
  { page, kind }: ScenarioContext,
  open: OpenOptions,
  locale: string = DEFAULT_LOCALE,
  options: { reload?: boolean; scrollbars?: boolean } = {},
): Promise<void> {
  if (locale !== DEFAULT_LOCALE) {
    await page.addInitScript((lang) => {
      Object.defineProperty(Navigator.prototype, "language", { get: () => lang });
      Object.defineProperty(Navigator.prototype, "languages", { get: () => [lang] });
    }, locale);
  }
  if (locale !== DEFAULT_LOCALE || options.reload) await openApp(page, kind, open);
  await prepare(page, { scrollbars: options.scrollbars });
  const broken = await laidOut(page);
  if (broken) {
    // Under load a stylesheet request occasionally fails and the app comes
    // up unstyled (the menu bar spread over the page). That is not a state
    // any scenario records, so the app is loaded once more.
    console.warn(`[parity] the app came up without its layout (${broken}), loading it again`);
    await openApp(page, kind, open);
    await prepare(page, { scrollbars: options.scrollbars });
    const again = await laidOut(page);
    if (again) throw new Error(`the app came up without its layout twice (${again})`);
  }
}

function runner(
  spec: SurfaceSpec,
  output: "png" | "dom",
  open: OpenOptions,
  locale?: string,
): (ctx: ScenarioContext) => Promise<unknown> {
  return async (ctx) => {
    const { page } = ctx;
    // The app lays itself out for the window size it boots in, so a
    // scenario with its own viewport boots again at that size. A first
    // boot in the dark theme or another language lays out before that
    // stylesheet or string table is in the cache, which leaves panels at
    // positions that vary from run to run; those boot a second time too.
    if (spec.viewport) await page.setViewportSize(spec.viewport);
    const reload = !!spec.viewport || open.theme === "dark" || !!open.language;
    await start(ctx, open, locale, { reload, scrollbars: spec.scrollbars });
    if (spec.setup) await spec.setup(page);
    await settle(page);
    if (output === "png") return shoot(page, spec.shot, spec.pad ?? 0, spec.clipToWindow);
    const roots = spec.dom === false ? spec.shot : (spec.dom ?? spec.shot);
    return domOf(page, roots);
  };
}

/** The removedInNewApp check of a surface's variant: its setup, then the spec's check. */
function removed(
  spec: SurfaceSpec,
  open: OpenOptions,
  locale?: string,
): Pick<Scenario, "removedInNewApp"> {
  const check = spec.removedInNewApp;
  if (!check) return {};
  return {
    removedInNewApp: async (ctx) => {
      if (spec.viewport) await ctx.page.setViewportSize(spec.viewport);
      const reload = !!spec.viewport || open.theme === "dark" || !!open.language;
      await start(ctx, open, locale, { reload, scrollbars: spec.scrollbars });
      if (spec.setup) await spec.setup(ctx.page);
      await settle(ctx.page);
      await check(ctx.page);
    },
  };
}

/**
 * Expands surface specs into scenarios: a png per theme, a DOM snapshot,
 * and png + DOM per browser locale (`locales`) and per language setting
 * (`languages`).
 */
export function surfaces(list: readonly SurfaceSpec[]): Scenario[] {
  const out: Scenario[] = [];
  for (const spec of list) {
    const base = { covers: spec.covers, timeout: spec.timeout ?? 120_000 };
    const variant = (
      suffix: string,
      open: OpenOptions,
      locale: string | undefined,
      withPng: boolean,
    ): void => {
      const full = { newDocument: true, ...spec.open, ...open };
      if (withPng) {
        out.push({
          ...base,
          id: `ui/${spec.id}.${suffix}`,
          kind: "png",
          open: full,
          driver: runner(spec, "png", full, locale),
          ...removed(spec, full, locale),
        });
      }
    };
    for (const theme of spec.themes ?? THEMES) variant(theme, { theme }, undefined, true);
    const domVariant = (suffix: string, open: OpenOptions, locale?: string): void => {
      if (spec.dom === false) return;
      const full = { newDocument: true, ...spec.open, ...open };
      out.push({
        ...base,
        id: `ui/${spec.id}.${suffix}`,
        kind: "json",
        open: full,
        driver: runner(spec, "dom", full, locale),
        ...removed(spec, full, locale),
      });
    };
    domVariant("dom", { theme: "light" });
    for (const locale of spec.locales ?? []) {
      variant(`locale-${locale}`, { theme: "light" }, locale, true);
      domVariant(`locale-${locale}.dom`, { theme: "light" }, locale);
    }
    for (const language of spec.languages ?? []) {
      variant(`lang-${language}`, { theme: "light", language }, undefined, true);
      domVariant(`lang-${language}.dom`, { theme: "light", language });
    }
  }
  return out;
}

/** A behaviour scenario: drives the app and returns JSON. */
export function behaviour(
  id: string,
  covers: readonly string[],
  run: (page: Page, ctx: ScenarioContext) => Promise<unknown>,
  open?: OpenOptions,
  locale?: string,
  viewport?: { width: number; height: number },
): Scenario {
  const full: OpenOptions = { newDocument: true, theme: "light", ...open };
  return {
    id: `ui/${id}`,
    covers,
    kind: "json",
    open: full,
    driver: async (ctx) => {
      if (viewport) await ctx.page.setViewportSize(viewport);
      await start(ctx, full, locale, { reload: !!viewport });
      return run(ctx.page, ctx);
    },
  };
}

// ---------------------------------------------------------------------------
// App hooks used by the drivers (documented in support/old-harness.js)

interface HookWindow {
  __parity: {
    app: {
      execute(id: string, args?: unknown[]): unknown;
      activateTool(name: string): boolean;
      editor(): { clearSelection(): void };
    };
  };
}

/** Runs an action by id, as a menu item or shortcut would. */
export async function action(page: Page, id: string): Promise<void> {
  await page.evaluate((a) => {
    (window as unknown as HookWindow).__parity.app.execute(a);
  }, id);
  await settle(page);
}

export async function tool(page: Page, name: string): Promise<void> {
  const ok = await page.evaluate(
    (n) => (window as unknown as HookWindow).__parity.app.activateTool(n),
    name,
  );
  if (!ok) throw new Error(`no tool ${name}`);
  await settle(page, 100);
}

export async function clearSelection(page: Page): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as HookWindow).__parity.app.editor().clearSelection(),
  );
  await settle(page);
}

/** Drags with real mouse input in steps. */
export async function drag(
  page: Page,
  from: readonly [number, number],
  to: readonly [number, number],
  options: { steps?: number; release?: boolean } = {},
): Promise<void> {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps: options.steps ?? 8 });
  if (options.release !== false) await page.mouse.up();
  await settle(page);
}

/** Draws a shape with a tool, then goes back to the pointer. */
export async function drawWith(
  page: Page,
  toolName: string,
  from: readonly [number, number],
  to: readonly [number, number],
): Promise<void> {
  await tool(page, toolName);
  await drag(page, from, to);
  await tool(page, "GPointerTool");
}

/** Hovers an element and waits past the 500 ms tooltip delay. */
export async function hoverLong(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().hover();
  await page.waitForTimeout(700);
  // Wait for a tooltip if one comes; some elements have none.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll(".g-tooltip, .g-rich-tooltip-container")].some((t) => {
          const r = t.getBoundingClientRect();
          return r.width > 0 && getComputedStyle(t).display !== "none";
        }),
      null,
      { timeout: 3000 },
    )
    .catch(() => undefined);
  await settle(page, 400);
}

/** Right-clicks at a point and waits for the context menu. */
export async function rightClick(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y, { button: "right" });
  await settle(page, 300);
}

/** A tiny PNG made in Node, for the image file pickers. */
export function testPng(width = 120, height = 80): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      png.data[i] = (x * 2) & 255;
      png.data[i + 1] = (y * 3) & 255;
      png.data[i + 2] = 180;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

/** Places the test PNG through File > Import > Place Image... (file input fallback). */
export async function placeImage(page: Page): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await action(page, "file.place-import");
  const fc = await chooser;
  await fc.setFiles({ name: "test-image.png", mimeType: "image/png", buffer: testPng() });
  await page.waitForFunction(() => {
    const w = window as unknown as {
      __parity: { app: { selection(): { getNodeName(): string }[] } };
    };
    return w.__parity.app.selection().some((n) => n.getNodeName() === "image");
  });
  await settle(page, 500);
}
