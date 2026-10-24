// Document states the inspector, color picker and context menu scenarios
// start from. Elements are made through the G namespace or real tool input.
import type { Page } from "@playwright/test";
import { action, clickMenu, drawWith, insertShapes, placeImage, settle, tool } from "./lib.ts";

interface SelWindow {
  __parity: {
    app: {
      scene(): { queryAll(q: string): unknown[]; querySingle(q: string): unknown };
      editor(): { updateSelection(toggle: boolean, nodes: unknown[]): void };
    };
  };
}

/** Selects every node matching a scene query (e.g. "text", "rectangle"). */
export async function selectQuery(page: Page, query: string): Promise<void> {
  await page.evaluate((q) => {
    const { app } = (window as unknown as SelWindow).__parity;
    app.editor().updateSelection(false, app.scene().queryAll(q));
  }, query);
  await settle(page);
}

export const rect = (page: Page) =>
  insertShapes(page, [{ type: "GRectangle", x: 500, y: 340, w: 200, h: 120 }]);
export const ellipse = (page: Page) =>
  insertShapes(page, [{ type: "GEllipse", x: 500, y: 340, w: 160, h: 160 }]);
export const rectAndEllipse = (page: Page) =>
  insertShapes(page, [
    { type: "GRectangle", x: 500, y: 340, w: 200, h: 120 },
    { type: "GEllipse", x: 620, y: 400, w: 160, h: 160 },
  ]);

export async function polygon(page: Page): Promise<void> {
  await drawWith(page, "GPolygonTool", [600, 400], [700, 500]);
}
export async function star(page: Page): Promise<void> {
  await drawWith(page, "GStarTool", [600, 400], [700, 500]);
}
export async function triangle(page: Page): Promise<void> {
  await drawWith(page, "GTriangleTool", [600, 400], [700, 500]);
}
export async function line(page: Page): Promise<void> {
  await drawWith(page, "GLineTool", [500, 400], [700, 500]);
}
export async function slice(page: Page): Promise<void> {
  await drawWith(page, "GSliceTool", [500, 340], [700, 460]);
}

export async function penPath(page: Page): Promise<void> {
  await tool(page, "GPenTool");
  for (const [x, y] of [
    [500, 400],
    [600, 550],
    [700, 400],
  ] as const) {
    // Separate moves and a pause, so no two clicks merge into a double-click.
    await page.mouse.move(x, y, { steps: 3 });
    await page.mouse.down();
    await page.mouse.up();
    await settle(page, 600);
  }
  await page.keyboard.press("Enter");
  await settle(page);
  await tool(page, "GPointerTool");
  await selectQuery(page, "path");
}

/** Starts typing a text with the text tool and leaves the editor open. */
export async function textEditing(page: Page): Promise<void> {
  await tool(page, "GTextTool");
  await page.mouse.click(500, 300);
  await settle(page, 300);
  await page.keyboard.type("Hello Gravit");
  await settle(page, 300);
}

export async function text(page: Page): Promise<void> {
  await textEditing(page);
  await page.keyboard.press("Escape");
  await settle(page, 300);
  await tool(page, "GPointerTool");
  await selectQuery(page, "text");
}

export async function group(page: Page): Promise<void> {
  await rectAndEllipse(page);
  await action(page, "modify.group");
}

export async function compound(page: Page): Promise<void> {
  await rectAndEllipse(page);
  await action(page, "modify.merge.union");
}

export async function symbolMaster(page: Page): Promise<void> {
  await rect(page);
  await action(page, "modify.createsymbol");
  // The app asks for a name first; keep the default.
  await page.locator(".g-prompt-dialog input").waitFor();
  await page.keyboard.press("Enter");
  await settle(page, 400);
}

export async function image(page: Page): Promise<void> {
  await placeImage(page);
}

/** Types a value into an inspector dimension box (x, y, w, h, rotate). */
export async function typeDimension(page: Page, dimension: string, value: string): Promise<void> {
  const box = page
    .locator(`.sidebar-inspector input[data-dimension="${dimension}"]:visible`)
    .first();
  await box.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(value);
  await page.keyboard.press("Enter");
  await settle(page);
}

/**
 * Places the test image and moves it through the inspector to x 500, y
 * 300, so it lies on the visible canvas (it is placed at the origin, under
 * the left sidebar). It then covers (500, 300) - (620, 380) on screen.
 */
export async function imageOnCanvas(page: Page): Promise<void> {
  await placeImage(page);
  await typeDimension(page, "x", "500");
  await typeDimension(page, "y", "300");
}

export async function newLayer(page: Page): Promise<void> {
  await page.click("#left-sidebars .layer-toolbar button:has(.gravit-icon-addlayer)");
  await settle(page, 300);
}

export async function transformMode(page: Page): Promise<void> {
  await page.click(".sidebar-inspector .transform-button");
  await settle(page, 300);
}

/** A fixed-size A4 page in millimetres, made through the welcome dialog. */
export async function a4Document(page: Page): Promise<void> {
  await clickMenu(page, ["File", "New Design..."]);
  const inputs = page.locator(".g-new-document-dialog .custom-size input");
  await inputs.nth(0).click();
  await page.keyboard.type("210");
  await inputs.nth(1).click();
  await page.keyboard.type("297");
  await page.selectOption(".g-new-document-dialog select[name=unit]", "mm");
  await page.click(".g-new-document-dialog .cloud-button");
  // The dialog's backdrop stays up for a moment after the click.
  await page.locator(".g-new-document-dialog-container").waitFor({ state: "hidden" });
  await settle(page, 500);
}

export async function addBorder(page: Page): Promise<void> {
  await page.click('.sidebar-inspector .border-toolbar button[data-title="Add Border"]');
  await settle(page, 300);
}

/** Adds an effect through the inspector's effects panel. */
export async function addEffect(page: Page, category: string, caption: string): Promise<void> {
  await page.click(".sidebar-inspector .effects-toolbar button:has(.gravit-icon-plus)");
  await settle(page, 300);
  await page.selectOption(".g-effects-select", category);
  await settle(page, 200);
  await page
    .locator(".g-effects-button", {
      has: page.locator(`.g-effects-button-caption:text-is("${caption}")`),
    })
    .click();
  await settle(page, 400);
}

export const INSPECTOR = [".sidebar-container.sidebar-inspector .scrolling-panels > *"];
export const INSPECTOR_DOM = [".sidebar-container.sidebar-inspector .scrolling-panels"];
export const OVERLAY = [".g-overlay"];
export const TALL = { width: 1600, height: 1600 };

/**
 * Opens the color chooser of a swatch button (g-pattern-chooser preview),
 * clicking away from its eyedropper corner; retries once when a late
 * relayout moved the swatch under the first click.
 */
export async function openChooser(page: Page, swatch: string, inset = 10): Promise<void> {
  await settle(page, 300);
  for (let attempt = 0; attempt < 3; attempt++) {
    const box = await page.locator(swatch).first().boundingBox();
    if (!box) throw new Error(`no swatch ${swatch}`);
    await page.mouse.click(box.x + inset, box.y + inset);
    const opened = await page
      .locator(".g-overlay .pattern-type-select, .g-overlay .colormode-selector")
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
  }
  await settle(page, 400);
}
