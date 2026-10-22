import type { Page } from "@playwright/test";
import * as ids from "./ids.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { behaviour, settle, surfaces, type SurfaceSpec } from "./lib.ts";
import * as S from "./states.ts";

const BASE = [
  "UI-INSPECT-001",
  "UI-INSPECT-002",
  "UI-INSPECT-003",
  "UI-INSPECT-006",
  "UI-INSPECT-012",
  "UI-INSPECT-013",
  "RUN-INSPECT-028",
  "UI-FIELD-163",
  "UI-FIELD-165",
];
const DIMENSION = [
  "UI-INSPECT-014",
  "UI-FIELD-001",
  "UI-FIELD-002",
  "UI-FIELD-003",
  "UI-FIELD-004",
  "UI-FIELD-005",
  "UI-FIELD-006",
  "UI-FIELD-007",
  "UI-FIELD-008",
  "UI-FIELD-166",
  "RUN-INSPECT-004",
];
const APPEARANCE = [
  "UI-INSPECT-004",
  "UI-INSPECT-005",
  "UI-INSPECT-017",
  "UI-FIELD-020",
  "UI-FIELD-021",
  "UI-FIELD-158",
  "UI-FIELD-167",
  "UI-STYLE-001",
  "UI-STYLE-002",
];
const FILLS = [
  "UI-INSPECT-028",
  "UI-FIELD-057",
  "UI-FIELD-058",
  "UI-FIELD-059",
  "UI-FIELD-060",
  "UI-COLOR-025",
  "RUN-INSPECT-006",
];
const BORDERS_EMPTY = ["UI-INSPECT-029", "RUN-INSPECT-007"];
const EFFECTS_EMPTY = ["UI-INSPECT-030", "RUN-INSPECT-008"];
const SHAPE = [...BASE, ...DIMENSION, ...APPEARANCE, ...FILLS, ...BORDERS_EMPTY, ...EFFECTS_EMPTY];

interface State {
  id: string;
  covers: string[];
  setup: (page: Page) => Promise<void>;
  open?: SurfaceSpec["open"];
  themes?: SurfaceSpec["themes"];
}

const STATES: State[] = [
  {
    id: "nothing",
    covers: [
      ...BASE,
      "UI-INSPECT-018",
      "UI-INSPECT-019",
      "UI-INSPECT-007",
      ...ids.UI_FIELD_23_38,
      "UI-FIELD-164",
      "RUN-INSPECT-001",
      "RUN-INSPECT-002",
      "RUN-INSPECT-026",
      "UI-INSPECT-026",
      "UI-INSPECT-010",
    ],
    setup: async () => undefined,
  },
  {
    id: "page-a4-mm",
    covers: [...BASE, "UI-INSPECT-018", "UI-FIELD-026", "UI-FIELD-033", "RUN-INSPECT-003"],
    setup: S.a4Document,
  },
  {
    id: "grid-on",
    covers: ["UI-FIELD-036", "UI-FIELD-037"],
    setup: async (page) => {
      await page.click(".sidebar-inspector .grid-mode input.grid-mode-radio >> nth=1");
      await settle(page, 300);
    },
    themes: ["light"],
  },
  {
    id: "grid-isometric",
    covers: ["UI-FIELD-036", "UI-FIELD-038"],
    setup: async (page) => {
      await page.click(".sidebar-inspector .grid-mode input.grid-mode-radio >> nth=2");
      await settle(page, 300);
    },
    themes: ["light"],
  },
  {
    id: "rectangle",
    covers: [...SHAPE, "UI-INSPECT-032", "RUN-INSPECT-005", "UI-FIELD-139"],
    setup: S.rect,
  },
  {
    id: "ellipse",
    covers: [...SHAPE, "UI-INSPECT-034", "UI-FIELD-150", "UI-FIELD-151", "RUN-INSPECT-009"],
    setup: S.ellipse,
  },
  {
    id: "polygon",
    covers: [
      ...SHAPE,
      "UI-INSPECT-033",
      "UI-FIELD-143",
      "UI-FIELD-144",
      "UI-FIELD-145",
      "RUN-INSPECT-020",
    ],
    setup: S.polygon,
  },
  { id: "star", covers: [...SHAPE, "UI-INSPECT-033", "RUN-INSPECT-022"], setup: S.star },
  { id: "triangle", covers: [...SHAPE, "UI-INSPECT-033", "RUN-INSPECT-021"], setup: S.triangle },
  {
    id: "line",
    covers: [...SHAPE, "UI-INSPECT-035", "RUN-INSPECT-019", "UI-FIELD-061", "UI-FIELD-062"],
    setup: S.line,
  },
  {
    id: "path",
    covers: [
      ...SHAPE,
      "UI-INSPECT-035",
      "UI-FIELD-152",
      "RUN-INSPECT-017",
      "RUN-INSPECT-018",
      "RUN-SHELL-038",
    ],
    setup: S.penPath,
  },
  {
    id: "text",
    covers: [
      ...SHAPE,
      "UI-INSPECT-031",
      ...ids.UI_FIELD_119_138,
      "UI-FONT-001",
      "RUN-INSPECT-010",
      "RUN-INSPECT-011",
      "RUN-INSPECT-012",
      "RUN-INSPECT-013",
      "RUN-INSPECT-014",
      "RUN-INSPECT-015",
      "RUN-INSPECT-016",
      "RUN-SHELL-041",
      "UI-I18N-009",
    ],
    setup: S.text,
  },
  {
    id: "text-editing",
    covers: ["UI-INSPECT-031", "RUN-INSPECT-010", "RUN-SHELL-041"],
    setup: S.textEditing,
  },
  {
    id: "multi",
    covers: [...SHAPE, "RUN-INSPECT-023"],
    setup: S.rectAndEllipse,
  },
  {
    id: "group",
    covers: [
      ...BASE,
      "UI-INSPECT-020",
      "UI-INSPECT-022",
      "UI-FIELD-040",
      "UI-FIELD-042",
      "RUN-INSPECT-024",
      "UI-INSPECT-009",
      "UI-FIELD-043",
    ],
    setup: S.group,
  },
  {
    id: "compound",
    covers: [...BASE, "UI-INSPECT-037"],
    setup: S.compound,
  },
  {
    id: "symbol-master",
    covers: [...BASE, "UI-INSPECT-023", "UI-FIELD-044"],
    setup: S.symbolMaster,
  },
  {
    id: "image",
    covers: [...BASE, "UI-INSPECT-036", "UI-FIELD-156", "RUN-INSPECT-025", "RUN-DIALOG-019"],
    setup: S.image,
  },
  {
    id: "slice",
    covers: [...BASE, "UI-INSPECT-024", "UI-FIELD-045", "UI-FIELD-046", "UI-FIELD-047"],
    setup: S.slice,
  },
  {
    id: "layer",
    covers: [...BASE, "UI-INSPECT-021", "UI-FIELD-041"],
    setup: async (page) => {
      await S.newLayer(page);
      await page.click("#left-sidebars .layers .layer-row >> nth=0");
      await settle(page, 300);
    },
  },
  {
    id: "transform-mode",
    covers: [
      ...BASE,
      "UI-INSPECT-008",
      "UI-INSPECT-016",
      "UI-FIELD-013",
      "UI-FIELD-014",
      "UI-FIELD-015",
      "UI-FIELD-016",
      "UI-FIELD-017",
      "UI-FIELD-018",
      "UI-FIELD-168",
    ],
    setup: async (page) => {
      await S.rect(page);
      await S.transformMode(page);
    },
  },
  {
    id: "transform-mode-multi",
    covers: [
      ...BASE,
      "UI-INSPECT-008",
      "UI-INSPECT-015",
      "UI-FIELD-008",
      "UI-FIELD-011",
      "UI-FIELD-012",
    ],
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await S.transformMode(page);
    },
  },
  {
    id: "rect-border",
    covers: ["UI-INSPECT-029", "UI-FIELD-061", "UI-FIELD-062"],
    setup: async (page) => {
      await S.rect(page);
      await S.addBorder(page);
    },
  },
  {
    id: "rect-two-fills",
    covers: ["UI-INSPECT-028", "UI-FIELD-057"],
    setup: async (page) => {
      await S.rect(page);
      await page.click('.sidebar-inspector .fill-toolbar button[data-title="Add Fill"]');
      await settle(page, 300);
    },
    themes: ["light"],
  },
  {
    id: "rect-fill-hidden",
    covers: ["UI-FIELD-059"],
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .fill-block .fill-visibility");
      await settle(page, 300);
    },
    themes: ["light"],
  },
  {
    id: "rect-accordions-collapsed",
    covers: ["UI-FIELD-165", "UI-INSPECT-005"],
    setup: async (page) => {
      await S.rect(page);
      for (const t of [".appearance-toolbar", ".fill-toolbar", ".effects-toolbar"]) {
        await page.click(`.sidebar-inspector ${t} .g-accordion`);
        await settle(page, 150);
      }
    },
    themes: ["light"],
  },
];

const list: SurfaceSpec[] = STATES.map((s) => ({
  id: `inspector/${s.id}`,
  covers: s.covers,
  viewport: S.TALL,
  setup: s.setup,
  shot: S.INSPECTOR,
  dom: S.INSPECTOR_DOM,
  ...(s.themes ? { themes: s.themes } : {}),
}));

// Popups opened from the inspector.
const EDITORS: { id: string; covers: string[]; setup: (page: Page) => Promise<void> }[] = [
  {
    id: "fill-advanced",
    covers: ["UI-INSPECT-028", "UI-FIELD-056", "UI-DIALOG-002"],
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .fill-toolbar .fill-settings");
    },
  },
  {
    id: "border-advanced",
    covers: ["UI-INSPECT-029", ...ids.UI_FIELD_63_72],
    setup: async (page) => {
      await S.rect(page);
      await S.addBorder(page);
      await page.click(".sidebar-inspector .border-toolbar button:has(.gravit-icon-settings)");
    },
  },
  {
    id: "border-advanced-line",
    covers: ["UI-FIELD-068", "UI-FIELD-069", "UI-FIELD-070", "UI-FIELD-071"],
    setup: async (page) => {
      await S.line(page);
      await page.click(".sidebar-inspector .border-toolbar button:has(.gravit-icon-settings)");
    },
  },
  {
    id: "rectangle-corners",
    covers: ["UI-INSPECT-032", "UI-FIELD-139", "UI-FIELD-140", "UI-FIELD-141", "UI-FIELD-142"],
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .g-advanced-setting:visible");
    },
  },
  {
    id: "polygon-advanced",
    covers: ["UI-INSPECT-033", "UI-FIELD-146", "UI-FIELD-147", "UI-FIELD-148", "UI-FIELD-149"],
    setup: async (page) => {
      await S.polygon(page);
      await page.click(".sidebar-inspector .g-advanced-setting:visible");
    },
  },
  {
    id: "transform-settings",
    covers: ["UI-INSPECT-016", "UI-FIELD-013"],
    setup: async (page) => {
      await S.rect(page);
      await S.transformMode(page);
      await page.click(".sidebar-inspector .advanced-transform-toolbar button");
    },
  },

  {
    id: "style-picker",
    covers: ["UI-STYLE-001", "UI-STYLE-003"],
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .g-styles-field");
    },
  },
  {
    id: "font-list",
    covers: ["UI-FONT-001", "UI-FONT-002", "UI-FONT-004", "UI-FONT-006"],
    setup: async (page) => {
      await S.text(page);
      await page.locator(".sidebar-inspector .text-properties-panel input").first().click();
    },
  },
  {
    id: "text-advanced",
    covers: [
      "UI-INSPECT-031",
      "UI-FIELD-132",
      "UI-FIELD-133",
      "UI-FIELD-134",
      "UI-FIELD-136",
      "UI-FIELD-137",
    ],
    setup: async (page) => {
      await S.text(page);
      await page.click(".sidebar-inspector .appearance-toolbar button.pro");
    },
  },
];
for (const e of EDITORS) {
  list.push({
    id: `editor/${e.id}`,
    covers: e.covers,
    viewport: S.TALL,
    setup: async (page) => {
      await e.setup(page);
      await settle(page, 400);
    },
    shot: [...S.OVERLAY, "ul.g-menu:not(.g-menu-root)"],
    dom: [...S.OVERLAY, "ul.g-menu:not(.g-menu-root)"],
  });
}

// Effects panel per category, and every effect's settings.
const CATEGORIES = ["Most Used", "Adjust", "Artistic", "Blur", "Distortion", "Other", "Shadow"];
for (const c of CATEGORIES) {
  list.push({
    id: `effects/panel-${c.toLowerCase().replace(/ /g, "-")}`,
    covers: ["UI-FIELD-074", "UI-FIELD-117", "UI-FIELD-118"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .effects-toolbar button:has(.gravit-icon-plus)");
      await settle(page, 300);
      await page.selectOption(".g-effects-select", c);
      await settle(page, 300);
    },
    shot: S.OVERLAY,
    themes: c === "Most Used" ? ["light", "dark"] : ["light"],
  });
}
list.push({
  id: "effects/panel-hover",
  covers: ["UI-FIELD-118"],
  viewport: S.TALL,
  setup: async (page) => {
    await S.rect(page);
    await page.click(".sidebar-inspector .effects-toolbar button:has(.gravit-icon-plus)");
    await settle(page, 300);
    await page.hover(".g-effects-button >> nth=2");
  },
  shot: S.OVERLAY,
  dom: false,
});

const EFFECTS: [string, string, string][] = [
  ["Shadow", "Drop Shadow", "UI-FIELD-076"],
  ["Shadow", "Inner Shadow", "UI-FIELD-077"],
  ["Shadow", "Curved Shadow", "UI-FIELD-078"],
  ["Shadow", "Contact Shadow", "UI-FIELD-079"],
  ["Shadow", "Long Shadow", "UI-FIELD-080"],
  ["Blur", "Blur", "UI-FIELD-081"],
  ["Adjust", "Overlay", "UI-FIELD-082"],
  ["Adjust", "Color Grading", "UI-FIELD-083"],
  ["Other", "Mirror", "UI-FIELD-084"],
  ["Adjust", "Color Adjust", "UI-FIELD-085"],
  ["Adjust", "Recolor", "UI-FIELD-086"],
  ["Artistic", "Vignette", "UI-FIELD-087"],
  ["Distortion", "Bulge", "UI-FIELD-088"],
  ["Adjust", "Halftone", "UI-FIELD-089"],
  ["Artistic", "Dot screen", "UI-FIELD-090"],
  ["Distortion", "Fisheye", "UI-FIELD-092"],
  ["Distortion", "Bend", "UI-FIELD-093"],
  ["Adjust", "Denoise", "UI-FIELD-094"],
  ["Artistic", "Edge work", "UI-FIELD-095"],
  ["Artistic", "Hexagonal", "UI-FIELD-096"],
  ["Artistic", "Ink", "UI-FIELD-099"],
  ["Blur", "Lens blur", "UI-FIELD-100"],
  ["Adjust", "Noise", "UI-FIELD-101"],
  ["Adjust", "Sepia", "UI-FIELD-102"],
  ["Distortion", "Swirl", "UI-FIELD-103"],
  ["Blur", "Tilt shift", "UI-FIELD-104"],
  ["Artistic", "Alcohol", "UI-FIELD-105"],
  ["Adjust", "Unsharp mask", "UI-FIELD-106"],
  ["Adjust", "Vibrance", "UI-FIELD-107"],
  ["Adjust", "Bloom", "UI-FIELD-108"],
  ["Artistic", "Sketch", "UI-FIELD-109"],
  ["Artistic", "Toon", "UI-FIELD-110"],
  ["Blur", "Zoom blur", "UI-FIELD-111"],
  ["Other", "Stroke", "UI-FIELD-112"],
  ["Other", "Inner Glow", "UI-FIELD-113"],
  ["Other", "Outer Glow", "UI-FIELD-114"],
];
for (const [category, caption, id] of EFFECTS) {
  list.push({
    id: `effects/settings-${caption.toLowerCase().replace(/ /g, "-")}`,
    covers: ["UI-INSPECT-030", "UI-FIELD-073", "UI-FIELD-075", "UI-FIELD-116", id],
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      await S.addEffect(page, category, caption);
    },
    shot: [".sidebar-inspector .effects-toolbar", ".sidebar-inspector .effects-properties-panel"],
    dom: [".sidebar-inspector .effects-properties-panel"],
    themes: ["Drop Shadow", "Blur", "Color Adjust"].includes(caption)
      ? ["light", "dark"]
      : ["light"],
  });
}
list.push({
  id: "effects/two-effects-collapsed",
  covers: ["UI-FIELD-073"],
  viewport: S.TALL,
  setup: async (page) => {
    await S.rect(page);
    await S.addEffect(page, "Shadow", "Drop Shadow");
    await S.addEffect(page, "Blur", "Blur");
    await page
      .click(".sidebar-inspector .effect-header .g-accordion >> nth=0")
      .catch(() => undefined);
    await settle(page, 300);
  },
  shot: [".sidebar-inspector .effects-toolbar", ".sidebar-inspector .effects-properties-panel"],
  dom: [".sidebar-inspector .effects-properties-panel"],
  themes: ["light"],
});
list.push({
  id: "effects/quick-add-drop-shadow",
  covers: ["UI-INSPECT-030", "RUN-INSPECT-008"],
  viewport: S.TALL,
  setup: async (page) => {
    await S.rect(page);
    await page.click(".sidebar-inspector .effects-default >> nth=2");
    await settle(page, 300);
  },
  shot: [".sidebar-inspector .effects-toolbar", ".sidebar-inspector .effects-properties-panel"],
  dom: [".sidebar-inspector .effects-properties-panel"],
  themes: ["light"],
});

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour(
    "inspector/typed-size-moves-rect",
    ["UI-FIELD-001", "UI-FIELD-002", "UI-FIELD-159"],
    async (page) => {
      await S.rect(page);
      const box = page
        .locator(
          '.sidebar-inspector input[data-dimension="w"], .sidebar-inspector [data-dimension="w"] input',
        )
        .first();
      await box.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type("250");
      await page.keyboard.press("Enter");
      await settle(page);
      const x = page
        .locator(
          '.sidebar-inspector input[data-dimension="x"], .sidebar-inspector [data-dimension="x"] input',
        )
        .first();
      await x.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type("100+20");
      await page.keyboard.press("Enter");
      await settle(page);
      await page.keyboard.press("ArrowUp");
      await settle(page);
      return page.evaluate(() => {
        const { app } = (
          window as unknown as {
            __parity: {
              app: {
                selection(): {
                  getGeometryBBox(): {
                    getX(): number;
                    getY(): number;
                    getWidth(): number;
                    getHeight(): number;
                  };
                }[];
              };
            };
          }
        ).__parity;
        const b = app.selection()[0]?.getGeometryBBox();
        return b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null;
      });
    },
  ),
];

paritySuite("ui inspector", scenarios, { newApp: false });
