/**
 * Renders the GravitDesign Next app icons from the dark avatar tile
 * (public/brand/avatar-dark.svg) with Playwright's Chromium:
 *
 *     node scripts/brand/render-icons.ts
 *
 * - public/brand/icons/icon-<size>.png: favicon, web manifest and the
 *   desktop window icon (16 to 1024 px);
 * - public/brand/icons/favicon.ico: 16, 32 and 48 px;
 * - build/icon.png (1024 px) and build/icon.ico (16 to 256 px): the
 *   electron-builder icons (build/ is its buildResources folder; it turns
 *   the 1024 PNG into the macOS and Linux icons).
 *
 * The outputs are committed; run this again only when the avatar changes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { encodeIco } from "./ico.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const avatar = path.join(root, "public", "brand", "avatar-dark.svg");
const iconsDir = path.join(root, "public", "brand", "icons");
const buildDir = path.join(root, "build");

const PNG_SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024] as const;
const FAVICON_SIZES = [16, 32, 48] as const;
const APP_ICO_SIZES = [16, 24, 32, 48, 64, 128, 256] as const;

async function render(svg: string, sizes: readonly number[]): Promise<Map<number, Buffer>> {
  const browser = await chromium.launch();
  try {
    const out = new Map<number, Buffer>();
    for (const size of sizes) {
      const page = await browser.newPage({
        viewport: { width: size, height: size },
        deviceScaleFactor: 1,
      });
      // The SVG is our own file (no scripts, no external references);
      // it is drawn as an image, scaled by the browser.
      const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
      await page.setContent(
        `<html><body style="margin:0;background:transparent">` +
          `<img src="${dataUrl}" width="${size}" height="${size}" style="display:block"></body></html>`,
      );
      await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
      out.set(size, await page.screenshot({ omitBackground: true }));
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const svg = fs.readFileSync(avatar, "utf8");
  const sizes = [...new Set([...PNG_SIZES, ...APP_ICO_SIZES])].sort((a, b) => a - b);
  const pngs = await render(svg, sizes);
  const get = (size: number): Buffer => pngs.get(size) as Buffer;
  fs.mkdirSync(iconsDir, { recursive: true });
  fs.mkdirSync(buildDir, { recursive: true });
  for (const size of PNG_SIZES)
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), get(size));
  fs.writeFileSync(
    path.join(iconsDir, "favicon.ico"),
    encodeIco(FAVICON_SIZES.map((size) => ({ size, png: get(size) }))),
  );
  fs.writeFileSync(path.join(buildDir, "icon.png"), get(1024));
  fs.writeFileSync(
    path.join(buildDir, "icon.ico"),
    encodeIco(APP_ICO_SIZES.map((size) => ({ size, png: get(size) }))),
  );
  console.log(`wrote ${PNG_SIZES.length} PNGs, favicon.ico, build/icon.png and build/icon.ico`);
}

await main();
