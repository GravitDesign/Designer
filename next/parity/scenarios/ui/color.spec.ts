import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { behaviour, settle, surfaces, type SurfaceSpec } from "./lib.ts";
import * as S from "./states.ts";

const CHOOSER = [".g-overlay"];

/** Opens the fill color chooser of the selected rectangle. */
async function openFillChooser(page: Page): Promise<void> {
  await S.rect(page);
  await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview");
}

const BASE = [
  "UI-COLOR-001",
  "UI-COLOR-002",
  "UI-COLOR-004",
  "UI-COLOR-005",
  "UI-COLOR-018",
  "UI-COLOR-019",
  "UI-COLOR-025",
  "UI-DIALOG-002",
];

const TYPES: { value: string; covers: string[] }[] = [
  {
    value: "Color Fill",
    covers: [
      "UI-COLOR-003",
      "UI-COLOR-006",
      "UI-COLOR-007",
      "UI-COLOR-008",
      "UI-COLOR-009",
      "UI-COLOR-010",
      "UI-COLOR-011",
      "UI-COLOR-020",
      "UI-COLOR-023",
      "UI-COLOR-024",
    ],
  },
  {
    value: "Linear Gradient",
    covers: ["UI-COLOR-003", "UI-COLOR-012", "UI-COLOR-013", "UI-COLOR-014"],
  },
  { value: "Radial Gradient", covers: ["UI-COLOR-003", "UI-COLOR-012", "UI-COLOR-014"] },
  { value: "Angular Gradient", covers: ["UI-COLOR-003", "UI-COLOR-012", "UI-COLOR-014"] },
  { value: "Texture Fill", covers: ["UI-COLOR-003", "UI-COLOR-015", "UI-COLOR-016"] },
  { value: "Noise", covers: ["UI-COLOR-003", "UI-COLOR-017"] },
  { value: "Background Fill", covers: ["UI-COLOR-003"] },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const list: SurfaceSpec[] = [];
for (const t of TYPES) {
  list.push({
    id: `color/fill-${slug(t.value)}`,
    covers: [...BASE, ...t.covers],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      if (t.value !== "Color Fill") {
        await page.selectOption(".g-overlay .pattern-type-select", t.value);
        await settle(page, 400);
      }
    },
    shot: CHOOSER,
  });
}
for (const mode of ["HSB", "CMYK"]) {
  list.push({
    id: `color/mode-${mode.toLowerCase()}`,
    covers: [...BASE, "UI-COLOR-004", "UI-COLOR-010"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.selectOption(".g-overlay .colormode-selector", mode);
      await settle(page, 400);
    },
    shot: CHOOSER,
  });
}
for (const palette of ["used", "mixer", "swatches"]) {
  list.push({
    id: `color/palette-${palette}`,
    covers: [
      ...BASE,
      palette === "used" ? "UI-COLOR-022" : palette === "mixer" ? "UI-COLOR-021" : "UI-SWATCH-001",
      ...(palette === "swatches" ? ["UI-SWATCH-002", "UI-SWATCH-003"] : []),
    ],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.click(`.g-overlay button[data-palette="${palette}"]`);
      await settle(page, 400);
    },
    shot: CHOOSER,
  });
}
list.push(
  {
    id: "color/swatch-added",
    covers: ["UI-SWATCH-001", "UI-SWATCH-003"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.click('.g-overlay button[data-palette="swatches"]');
      await settle(page, 300);
      await page.locator(".g-overlay .swatches-palette.document .swatch-button").first().click();
      await settle(page, 400);
    },
    shot: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/swatch-hover",
    covers: ["UI-COLOR-023"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.hover(".g-overlay .colors-palette .swatch >> nth=14");
      await page.waitForTimeout(1200);
    },
    shot: [...CHOOSER, ".g-tooltip"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "color/picked-red",
    covers: ["UI-COLOR-023", "UI-COLOR-008", "UI-COLOR-009", "UI-COLOR-010"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.click(".g-overlay .colors-palette .swatch >> nth=13");
      await settle(page, 400);
    },
    shot: [...CHOOSER, ".sidebar-inspector .fill-properties-panel"],
    dom: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/map-dragged",
    covers: ["UI-COLOR-006", "UI-COLOR-007"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      const map = await page.locator(".g-overlay .color-map").first().boundingBox();
      if (!map) throw new Error("no color map");
      await page.mouse.move(map.x + 10, map.y + 10);
      await page.mouse.down();
      await page.mouse.move(map.x + map.width * 0.7, map.y + map.height * 0.3, { steps: 6 });
      await page.mouse.up();
      await settle(page, 300);
    },
    shot: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/gradient-stop-added",
    covers: ["UI-COLOR-012", "UI-COLOR-013"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      await page.selectOption(".g-overlay .pattern-type-select", "Linear Gradient");
      await settle(page, 300);
      const bar = await page.locator(".g-overlay .gradient-editor .stops").first().boundingBox();
      if (!bar) throw new Error("no gradient bar");
      await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2);
      await settle(page, 300);
    },
    shot: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/hex-typed",
    covers: ["UI-COLOR-009"],
    viewport: S.TALL,
    setup: async (page) => {
      await openFillChooser(page);
      const hex = page.locator(".g-overlay .color-components input").first();
      await hex.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type("3366cc");
      await page.keyboard.press("Enter");
      await settle(page, 300);
    },
    shot: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/border-chooser",
    covers: ["UI-COLOR-001", "UI-COLOR-025", "UI-FIELD-061"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      await S.addBorder(page);
      await S.openChooser(page, ".sidebar-inspector .border-block .g-pattern-chooser .preview", 10);
    },
    shot: CHOOSER,
  },
  {
    id: "color/page-background-chooser",
    covers: ["UI-COLOR-001", "UI-FIELD-023"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.openChooser(
        page,
        ".sidebar-inspector .page-properties-panel .g-pattern-chooser .preview",
        10,
      );
    },
    shot: CHOOSER,
  },
  {
    id: "color/text-color-chooser",
    covers: ["UI-COLOR-001", "UI-FIELD-119"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.text(page);
      await S.openChooser(
        page,
        ".sidebar-inspector .text-properties-panel .g-pattern-chooser .preview",
        10,
      );
    },
    shot: CHOOSER,
    themes: ["light"],
  },
  {
    id: "color/eyedropper",
    covers: ["UI-COLOR-029", "UI-COLOR-024"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .fill-block .eyedropper");
      await settle(page, 300);
      await page.mouse.move(600, 400, { steps: 4 });
      await settle(page, 500);
    },
    shot: [".g-eye-dropper-picker"],
    dom: [".g-eye-dropper-picker"],
    themes: ["light"],
  },
);

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("color/escape-closes-chooser", ["UI-COLOR-001", "UI-DIALOG-002"], async (page) => {
    await openFillChooser(page);
    const open = await page.locator(".g-overlay:visible").count();
    await page.keyboard.press("Escape");
    await settle(page, 300);
    const afterEscape = await page.locator(".g-overlay:visible").count();
    return { open, afterEscape };
  }),
  behaviour("color/pick-applies-fill", ["UI-COLOR-023", "UI-COLOR-020"], async (page) => {
    await openFillChooser(page);
    await page.click(".g-overlay .colors-palette .swatch >> nth=13");
    await settle(page, 300);
    return page.evaluate(() => {
      const { app } = (
        window as unknown as {
          __parity: {
            app: {
              selection(): {
                getPaintLayers(): {
                  getFirstChild(): { getProperty(k: string): { toString(): string } };
                };
              }[];
            };
          };
        }
      ).__parity;
      const fill = app.selection()[0]?.getPaintLayers().getFirstChild();
      return fill ? fill.getProperty("_pt").toString() : null;
    });
  }),
];

paritySuite("ui color", scenarios, { newApp: false });
