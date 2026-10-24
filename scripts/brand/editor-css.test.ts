// Checks public/brand/editor.css, the editor in the GravitDesign Next look
// (CHANGES.md CHG-002): it only applies in that look, only restyles
// (no rule may move or resize anything), keeps the rules the restyle is
// made of, defines its colours for both themes and meets the contrast it
// promises. The brand scenarios (parity/scenarios/brand) check the pixels.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss, splitSelectors, type StyleRule } from "./accent-css.ts";

const FILE = path.resolve(import.meta.dirname, "../../public/brand/editor.css");
const SCOPE = 'html[data-branding="next"]';
const DARK = 'html[data-branding="next"][data-gd-theme="dark"]';

const rules = parseCss(fs.readFileSync(FILE, "utf8")).filter(
  (item): item is StyleRule => item.kind === "rule",
);
const clean = (s: string): string => s.replace(/\s+/g, " ").trim();

/** The custom properties a rule with exactly this selector defines. */
function tokens(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of rules)
    if (clean(rule.selector) === selector)
      for (const d of rule.declarations) if (d.prop.startsWith("--")) out.set(d.prop, d.value);
  return out;
}
const light = tokens(SCOPE);
const dark = new Map([...light, ...tokens(DARK)]);

/**
 * Properties that change how something looks without changing where it
 * is or how big it is. Borders only change colour (their widths stay the
 * old ones); outlines, box-shadows and radius take no space.
 */
const LOOK_ONLY = new Set([
  "color",
  "background",
  "background-color",
  "background-image",
  "background-repeat",
  "background-position",
  "background-size",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "box-shadow",
  "text-shadow",
  "outline",
  "outline-offset",
  "font-family",
  "font-weight",
  "letter-spacing",
  "fill",
  "stroke",
]);

/**
 * The deliberate exceptions, each with the reason it can't move anything
 * that matters. [selector part, property, value]
 */
const LAYOUT_EXCEPTIONS: [string, string, string][] = [
  // The mark takes the menu section's own left padding; the header keeps 36 px.
  ["#header > .section.menu", "padding-left", "40px"],
  // Document tab titles 12 px instead of 11 px (never smaller than before);
  // the tab keeps its height, only the tab row on the right grows a little.
  ["#header > .section.windows > .tabs > .tab", "font-size", "12px"],
];

/** The rules the restyle is made of: [what, selector part, property, value part]. */
const REQUIRED: [string, string, string, string][] = [
  ["the mark in the menu bar", "#header > .section.menu", "background-image", "var(--rd-mark)"],
  [
    "calm menu bar captions",
    ".g-menu-bar > .g-menu > .g-menu-item",
    "font-family",
    "var(--rd-font-ui)",
  ],
  [
    "the active document tab's yellow marker",
    ".tabs > .tab.g-active",
    "box-shadow",
    "var(--rd-marker)",
  ],
  [
    "the toolbar's short group dividers",
    "#toolbar > div.section:not(:last-child)",
    "background-image",
    "var(--rd-divider-strong)",
  ],
  [
    "toolbar button hover",
    ".action-button:not(.g-disabled):hover",
    "background",
    "var(--rd-bg-hover)",
  ],
  [
    "the active tool filled with the accent",
    ".action-button:not(.g-disabled).g-active",
    "background",
    "var(--rd-accent)",
  ],
  [
    "the active tool's icon in white on the accent",
    ".action-button:not(.g-disabled).g-active > span",
    "color",
    "#ffffff",
  ],
  [
    "the active sidebar tab underline",
    ".sidebar-selector > .sidebar-option.active",
    "box-shadow",
    "var(--rd-accent-fg)",
  ],
  ["section headers", ".sidebar-inspector .panels .toolbar", "background", "var(--rd-bg-sunken)"],
  [
    "section header labels in Manrope",
    ".sidebar-container .toolbar > label",
    "font-family",
    "var(--rd-font-ui)",
  ],
  ["the selected layer row", "div.layer-row.g-selected", "background", "var(--rd-accent-tint)"],
  [
    "the selected layer row's marker",
    "div.layer-row.g-selected",
    "box-shadow",
    "var(--rd-accent-fg)",
  ],
  ["the active page row", "div.page-row.g-active", "background", "var(--rd-accent-tint)"],
  ["the selected fill row", ".fill-block.g-selected", "background-color", "var(--rd-accent-tint)"],
  [
    "text fields with a 3:1 frame",
    'input[type="text"]',
    "border-color",
    "var(--rd-control-border)",
  ],
  ["selects with a 3:1 frame", "select", "border-color", "var(--rd-control-border)"],
  ["the select arrow", "select", "background-image", "var(--rd-select-arrow)"],
  ["buttons with a 3:1 frame", ".g-button", "border-color", "var(--rd-control-border)"],
  [
    "pressed segment buttons in the accent",
    ".g-button.g-active:not(.g-disabled)",
    "background-color",
    "var(--rd-accent-tint)",
  ],
  [
    "checkboxes with a 3:1 frame",
    'input[type="checkbox"]',
    "border-color",
    "var(--rd-control-border)",
  ],
  ["checked checkboxes", 'input[type="checkbox"]:checked', "background-color", "var(--rd-accent)"],
  ["switch tracks", ".g-switch > div", "background-color", "var(--rd-switch-track)"],
  ["slider tracks", ".g-input-slider.generic", "background", "var(--rd-divider-strong)"],
  ["a focus ring on fields", 'input[type="text"]:focus', "box-shadow", "var(--rd-focus)"],
  ["a focus ring on buttons", "button:focus-visible", "outline", "var(--rd-focus)"],
  ["the yellow selection hint", "input::selection", "background", "var(--rd-marker)"],
  ["menu surfaces", ".g-menu:not(.g-menu-root)", "border-radius", "var(--rd-radius-popover)"],
  ["menu shadows", ".g-menu:not(.g-menu-root)", "box-shadow", "var(--rd-shadow-popover)"],
  ["menu hover", ".g-menu-item.g-hover:not(.g-disabled)", "background", "var(--rd-bg-hover)"],
  [
    "dropdown and chooser surfaces",
    ".g-overlay:not(.g-tooltip-content-overlay)",
    "border-radius",
    "var(--rd-radius-popover)",
  ],
  ["tooltips", ".g-tooltip", "border-radius", "var(--rd-radius-popover)"],
  ["the chooser's palette tabs", ".chooser button.g-active", "box-shadow", "var(--rd-accent-fg)"],
  [
    "dialog surfaces",
    ".g-dialog:not(.g-new-document-dialog)",
    "box-shadow",
    "var(--rd-shadow-dialog)",
  ],
  [
    "the dialog scrim",
    ".g-dialog-container:not(.g-new-document-dialog-container)",
    "background-color",
    "var(--rd-scrim)",
  ],
  ["quiet secondary buttons", ".g-dialog-footer button", "background-color", "transparent"],
  [
    "the magenta primary button",
    ".g-dialog-footer button.primary",
    "background",
    "var(--rd-accent)",
  ],
  ["the canvas background", "#windows", "background", "var(--rd-canvas)"],
  ["the rulers", ".g-ruler-widget", "color", "var(--rd-ruler)"],
];

/** Tokens that are the same in both themes (the brand colours, sizes and the font). */
const SHARED = new Set([
  "--rd-font-ui",
  "--rd-accent",
  "--rd-accent-hover",
  "--rd-accent-pressed",
  "--rd-marker",
  "--rd-radius-control",
  "--rd-radius-button",
  "--rd-radius-popover",
  "--rd-radius-dialog",
]);

function hex(theme: Map<string, string>, name: string): string {
  const value = theme.get(name);
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is not a #rrggbb colour`);
  return value;
}

function luminance(color: string): number {
  const channel = (i: number): number => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground token or #colour, background token, minimum]: AA text 4.5, UI borders and focus 3. */
const CONTRAST: [string, string, number][] = [
  ["--rd-text", "--rd-bg", 4.5],
  ["--rd-text", "--rd-bg-sunken", 4.5],
  ["--rd-text", "--rd-bg-input", 4.5],
  ["--rd-text", "--rd-surface", 4.5],
  ["--rd-text", "--rd-accent-tint", 4.5],
  ["--rd-text-muted", "--rd-bg", 4.5],
  ["--rd-text-muted", "--rd-bg-sunken", 4.5],
  ["--rd-text-muted", "--rd-bg-hover", 4.5],
  ["--rd-text-placeholder", "--rd-bg-input", 4.5],
  ["--rd-accent-text", "--rd-bg", 4.5],
  ["--rd-accent-text", "--rd-accent-tint", 4.5],
  ["#ffffff", "--rd-accent", 4.5],
  ["#ffffff", "--rd-accent-hover", 4.5],
  ["#1b1b24", "--rd-marker", 4.5],
  ["--rd-icon", "--rd-bg", 3],
  ["--rd-icon", "--rd-bg-sunken", 3],
  ["--rd-control-border", "--rd-bg", 3],
  ["--rd-control-border", "--rd-bg-sunken", 3],
  ["--rd-control-border", "--rd-bg-input", 3],
  ["--rd-control-border", "--rd-surface", 3],
  ["--rd-focus", "--rd-bg", 3],
  ["--rd-focus", "--rd-bg-sunken", 3],
  ["--rd-focus", "--rd-bg-input", 3],
  ["--rd-focus", "--rd-surface", 3],
  // Magenta as a mark: the active tool's icon, underlines and row markers.
  ["--rd-accent-fg", "--rd-accent-tint", 3],
  ["--rd-accent-fg", "--rd-bg", 3],
  ["--rd-accent-fg", "--rd-bg-hover", 3],
  // Magenta as a fill next to the panel: checked boxes, switches.
  ["--rd-accent", "--rd-bg", 3],
];

describe("public/brand/editor.css", () => {
  it("only applies in the next look", () => {
    expect(rules.length).toBeGreaterThan(100);
    for (const rule of rules) {
      expect(rule.context, clean(rule.selector)).toEqual([]);
      for (const selector of splitSelectors(rule.selector))
        expect(clean(selector).startsWith(SCOPE), clean(selector)).toBe(true);
    }
  });

  it("changes how things look, never where they are or how big", () => {
    for (const rule of rules)
      for (const d of rule.declarations) {
        if (d.prop.startsWith("--") || LOOK_ONLY.has(d.prop)) continue;
        const allowed = LAYOUT_EXCEPTIONS.some(
          ([part, prop, value]) =>
            prop === d.prop && value === d.value && clean(rule.selector).includes(part),
        );
        expect(allowed, `${clean(rule.selector)} { ${d.prop}: ${d.value} }`).toBe(true);
      }
  });

  it("leaves the open menu without the yellow marker", () => {
    const marked = rules.filter(
      (rule) =>
        splitSelectors(rule.selector).some((s) => clean(s).includes(".g-menu-item.g-active")) &&
        rule.declarations.some((d) => d.value.includes("var(--rd-marker)")),
    );
    expect(marked.map((rule) => clean(rule.selector))).toEqual([]);
  });

  it.each(REQUIRED)("keeps %s", (_what, part, prop, value) => {
    const found = rules.some(
      (rule) =>
        splitSelectors(rule.selector).some((s) => clean(s).includes(part)) &&
        rule.declarations.some((d) => d.prop === prop && d.value.includes(value)),
    );
    expect(found, `no rule for ${part} { ${prop}: ...${value}... }`).toBe(true);
  });

  it("defines every token it uses, and every colour token for the dark theme too", () => {
    const used = new Set<string>();
    for (const rule of rules)
      for (const d of rule.declarations)
        for (const m of d.value.matchAll(/var\((--rd-[a-z0-9-]+)\)/g)) used.add(m[1] as string);
    expect([...used].filter((name) => !light.has(name))).toEqual([]);
    const darkOwn = tokens(DARK);
    expect([...darkOwn.keys()].filter((name) => !light.has(name))).toEqual([]);
    expect([...light.keys()].filter((name) => !darkOwn.has(name) && !SHARED.has(name))).toEqual([]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("meets AA for text and 3:1 for borders and focus rings (%s)", (_theme, theme) => {
    const color = (name: string): string => (name.startsWith("#") ? name : hex(theme, name));
    const failing = CONTRAST.map(([fg, bg, min]) => ({
      pair: `${fg} on ${bg}`,
      ratio: Math.round(contrast(color(fg), color(bg)) * 100) / 100,
      min,
    })).filter((c) => c.ratio < c.min);
    expect(failing).toEqual([]);
  });
});
