// The prompt dialogs of Simplify Path, Convert to Outline and
// Expand/Shrink (ADD-PATH-001..003), driven with real input: the action is
// started from its shortcut (or app.execute when it has none), the value is
// typed into the dialog's text field, and OK is clicked with the mouse.
// Each check records the dialog (message, default value, slider), the
// document afterwards, undo/redo, and any alert an invalid value opens.
// Vectorize Image and Flatten have no dialog; their results are in
// exec.spec.ts (modify.bmp2path, modify.path2bmp).
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runProbe, type Loose } from "./lib.ts";

interface PromptCheck {
  name: string;
  id: string;
  setup: string;
  keys?: string[];
  /** Text typed into the field; null keeps the default. */
  value: string | null;
  /** Click the slider track at this fraction of its width (0..1). */
  slider?: number;
  /** Press Escape / click Cancel instead of OK. */
  cancel?: boolean;
  /** Confirm with Enter in the field instead of clicking OK. */
  enter?: boolean;
  covers: string[];
}

async function runPrompt(page: Page, c: PromptCheck): Promise<string> {
  await runProbe(page, { setup: c.setup, id: c.id, phase: "setup", center: true });
  if (c.keys) for (const k of c.keys) await page.keyboard.press(k);
  else {
    await page.evaluate((id) => {
      (window as unknown as { __parity: { app: Loose } }).__parity.app.execute(id);
    }, c.id);
  }
  const dialog = page.locator(".g-dialog-container.g-prompt-dialog.visible");
  await dialog.waitFor();
  const shown = await dialog.evaluate((d) => ({
    message: ((d.querySelector(".message") as HTMLElement | null)?.innerText ?? "").trim(),
    inputs: Array.from(d.querySelectorAll("input")).map((i) => ({
      type: (i as HTMLInputElement).type,
      value: (i as HTMLInputElement).value,
      min: (i as HTMLInputElement).min,
      max: (i as HTMLInputElement).max,
      step: (i as HTMLInputElement).step,
    })),
    buttons: Array.from(d.querySelectorAll("button")).map((b) =>
      (b as HTMLElement).innerText.trim(),
    ),
  }));
  const field = dialog.locator("input[type=text], input:not([type])").first();
  if (c.value !== null) {
    await field.click();
    await page.keyboard.press("Control+KeyA");
    await page.keyboard.type(c.value);
  }
  const track = dialog.locator(".g-input-slider");
  if (c.slider !== undefined) {
    const b = await track.boundingBox();
    if (!b) throw new Error("slider not visible");
    await page.mouse.click(b.x + b.width * c.slider, b.y + b.height / 2);
  }
  const slider = (await track.count()) > 0 ? await track.first().getAttribute("value") : null;
  if (c.cancel) await dialog.locator(".g-dialog-footer button").first().click();
  else if (c.enter) await field.press("Enter");
  else await dialog.locator(".g-dialog-footer button.primary").click();
  await page.waitForTimeout(300);
  const after = JSON.parse(
    await runProbe(page, { setup: c.setup, id: c.id, phase: "after" }),
  ) as Record<string, unknown>;
  return JSON.stringify({ dialog: shown, sliderAfterTyping: slider, ...after });
}

const checks: PromptCheck[] = [
  // Simplify Path: Ctrl+Alt+S, slider 0-100 synced with the text field.
  {
    name: "simplify-default",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: null,
    covers: ["ADD-PATH-001", "ACT-PATH-009"],
  },
  {
    name: "simplify-slider-60",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0.6,
    covers: ["ADD-PATH-001", "ACT-PATH-009"],
  },
  {
    name: "simplify-slider-100",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0.98,
    covers: ["ADD-PATH-001", "ACT-PATH-009"],
  },
  {
    name: "simplify-slider-0-invalid",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0,
    covers: ["ADD-PATH-001"],
  },
  // Typing into the % field does not reach the slider (its change handler
  // looks for the slider inside the field's own span), so OK still uses 10.
  {
    name: "simplify-typed-40",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: "40",
    covers: ["ADD-PATH-001"],
  },
  {
    name: "simplify-typed-0",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: "0",
    covers: ["ADD-PATH-001"],
  },
  {
    name: "simplify-ellipse-and-rect",
    id: "modify.simplify",
    setup: "overlap",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0.6,
    covers: ["ADD-PATH-001", "ACT-PATH-009"],
  },
  {
    name: "simplify-rect",
    id: "modify.simplify",
    setup: "rect",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0.5,
    covers: ["ADD-PATH-001"],
  },
  {
    name: "simplify-cancel",
    id: "modify.simplify",
    setup: "path-many",
    keys: ["Control+Alt+KeyS"],
    value: null,
    slider: 0.6,
    cancel: true,
    covers: ["ADD-PATH-001"],
  },
  // Convert to Outline: F5.
  {
    name: "outline-default",
    id: "modify.ouline",
    setup: "path-open",
    keys: ["F5"],
    value: null,
    covers: ["ADD-PATH-002", "ACT-PATH-005"],
  },
  {
    name: "outline-6",
    id: "modify.ouline",
    setup: "path-open",
    keys: ["F5"],
    value: "6",
    covers: ["ADD-PATH-002", "ACT-PATH-005"],
  },
  {
    name: "outline-negative",
    id: "modify.ouline",
    setup: "rect-border",
    keys: ["F5"],
    value: "-4",
    covers: ["ADD-PATH-002"],
  },
  {
    name: "outline-0-invalid",
    id: "modify.ouline",
    setup: "path-open",
    keys: ["F5"],
    value: "0",
    covers: ["ADD-PATH-002"],
  },
  {
    name: "outline-enter",
    id: "modify.ouline",
    setup: "path-closed",
    keys: ["F5"],
    value: "3",
    enter: true,
    covers: ["ADD-PATH-002"],
  },
  // Expand/Shrink: no shortcut.
  {
    name: "offset-default",
    id: "modify.offset",
    setup: "path-closed",
    value: null,
    covers: ["ADD-PATH-003", "ACT-PATH-006"],
  },
  {
    name: "offset-10",
    id: "modify.offset",
    setup: "path-closed",
    value: "10",
    covers: ["ADD-PATH-003", "ACT-PATH-006"],
  },
  {
    name: "offset-minus-10",
    id: "modify.offset",
    setup: "path-closed",
    value: "-10",
    covers: ["ADD-PATH-003", "ACT-PATH-006"],
  },
  {
    name: "offset-invalid",
    id: "modify.offset",
    setup: "rect",
    value: "x",
    covers: ["ADD-PATH-003"],
  },
  {
    name: "offset-reversed-path",
    id: "modify.offset",
    setup: "path-closed-ccw",
    value: "10",
    covers: ["ADD-PATH-003"],
  },
  // Create Symbol's name prompt: F8.
  {
    name: "create-symbol-f8",
    id: "modify.createsymbol",
    setup: "symbol",
    keys: ["F8"],
    value: "Typed Name",
    covers: ["EDT-SYMBOL-001", "ACT-MODIFY-013"],
  },
  {
    name: "create-symbol-two-shapes",
    id: "modify.createsymbol",
    setup: "rects2",
    keys: ["F8"],
    value: null,
    covers: ["EDT-SYMBOL-001"],
  },
  {
    name: "create-symbol-from-instance",
    id: "modify.createsymbol",
    setup: "symbol-instance",
    keys: ["F8"],
    value: "Promoted",
    covers: ["EDT-SYMBOL-001"],
  },
];

const scenarios: Scenario[] = checks.map((c) => ({
  id: `editor-actions/path-dialogs/${c.name}`,
  covers: c.covers,
  kind: "document",
  driver: ({ page }) => runPrompt(page, c),
}));

paritySuite("editor-actions path dialogs", defineScenarios(scenarios), { newApp: false });
