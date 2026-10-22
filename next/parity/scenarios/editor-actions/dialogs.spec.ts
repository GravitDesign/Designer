// Actions whose effect is a dialog, a native file picker, a download, a
// browser error or fullscreen. Each check runs in its own page: it builds a
// small document, triggers the action through app.execute or its keyboard
// shortcut (real key presses, Windows/Linux mapping) and records the
// visible dialogs with their text, file chooser and download events,
// fullscreen state and page errors.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { ACTION_ITEMS } from "./action-items.ts";
import { platform } from "./keys.ts";
import { runProbe, type Loose } from "./lib.ts";

interface DialogCheck {
  name: string;
  id: string;
  /** Keys to press instead of app.execute(id). */
  keys?: string[];
  setup?: string;
  /** Selector whose innerText is recorded in full (otherwise only the first line of each dialog). */
  fullText?: string;
  covers?: string[];
}

async function visibleDialogs(page: Page, fullText?: string): Promise<unknown> {
  return page.evaluate((full) => {
    const out: { className: string; text: string }[] = [];
    for (const d of Array.from(document.querySelectorAll(".g-dialog-container"))) {
      const el = d as HTMLElement;
      if (!el.classList.contains("visible")) continue;
      const text = el.innerText.trim();
      const keep = full && el.matches(full) ? text : (text.split("\n")[0] ?? "");
      out.push({ className: el.className.replace(/\s*\bvisible\b/, ""), text: keep });
    }
    return out;
  }, fullText ?? null);
}

async function runDialogCheck(page: Page, c: DialogCheck): Promise<string> {
  const events: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("filechooser", (fc) => {
    events.push(`filechooser multiple=${fc.isMultiple()}`);
  });
  page.on("download", (d) => {
    // Print downloads its PDF under a random UUID name; keep only the
    // fact that it is a UUID and the extension.
    const name = d
      .suggestedFilename()
      .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "<uuid>");
    events.push(`download ${name}`);
  });
  page.on("popup", (p) => {
    events.push(`popup ${p.url()}`);
  });
  await runProbe(page, { setup: c.setup ?? "rect", id: c.id, phase: "setup" });
  // The service worker registration fails on the test server; that error is
  // not caused by the action.
  errors.length = 0;
  const info = await page.evaluate(
    (id) =>
      (window as unknown as { __parity: { app: Loose } }).__parity.app.editorActions.actionInfo(id),
    c.id,
  );
  if (c.keys) {
    for (const k of c.keys) await page.keyboard.press(k);
  } else {
    await page.evaluate((id) => {
      (window as unknown as { __parity: { app: Loose } }).__parity.app.execute(id);
    }, c.id);
  }
  await page.waitForTimeout(1500);
  const accept = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[type=file]")).map((i) => ({
      accept: (i as HTMLInputElement).accept,
      multiple: (i as HTMLInputElement).multiple,
    })),
  );
  const result = {
    platform: await platform(page),
    trigger: c.keys ?? "execute",
    info,
    dialogs: await visibleDialogs(page, c.fullText),
    events: events.sort(),
    fileInputs: events.some((e) => e.startsWith("filechooser")) ? accept : undefined,
    fullscreen: await page.evaluate(() => !!document.fullscreenElement),
    // Which parts of the shell (header, toolbar, sidebars, ...) are shown.
    parts: await page.evaluate(() =>
      Array.from(document.querySelectorAll(".frame > *")).map((e) => ({
        className: (e as HTMLElement).className,
        shown: (e as HTMLElement).offsetParent !== null,
      })),
    ),
    pageErrors: errors.filter((e) => !e.includes("ServiceWorker")),
  };
  return JSON.stringify(result);
}

const checks: DialogCheck[] = [
  { name: "file.new", id: "file.new" },
  { name: "file.new--alt-n", id: "file.new", keys: ["Alt+KeyN"] },
  { name: "file.new--ctrl-n", id: "file.new", keys: ["Control+KeyN"] },
  { name: "open-welcome-screen", id: "open-welcome-screen" },
  { name: "file.open", id: "file.open" },
  { name: "file.open--ctrl-o", id: "file.open", keys: ["Control+KeyO"] },
  { name: "file.place-import", id: "file.place-import" },
  { name: "file.place-import--alt-p", id: "file.place-import", keys: ["Alt+KeyP"] },
  { name: "font.import", id: "font.import" },
  { name: "file.save", id: "file.save" },
  { name: "file.save--ctrl-s", id: "file.save", keys: ["Control+KeyS"] },
  { name: "file.save-as.gvdesign", id: "file.save-as.gvdesign" },
  {
    name: "file.save-as.gvdesign--keys",
    id: "file.save-as.gvdesign",
    keys: ["Control+Shift+Alt+KeyS"],
  },
  { name: "file.save-as.png", id: "file.save-as.png" },
  { name: "file.save-as.jpg", id: "file.save-as.jpg" },
  { name: "file.save-as.svg", id: "file.save-as.svg" },
  { name: "file.save-as.pdf", id: "file.save-as.pdf" },
  { name: "file.save-as.pdf.96", id: "file.save-as.pdf.96" },
  { name: "file.save-as.pdf.150", id: "file.save-as.pdf.150" },
  { name: "file.save-as.pdf.300", id: "file.save-as.pdf.300" },
  { name: "file.export", id: "file.export" },
  { name: "file.export--keys", id: "file.export", keys: ["Control+Shift+KeyE"] },
  { name: "file.export--empty", id: "file.export", setup: "empty" },
  { name: "file.export.pdf", id: "file.export.pdf" },
  { name: "file.print", id: "file.print" },
  { name: "file.print--ctrl-p", id: "file.print", keys: ["Control+KeyP"] },
  { name: "edit.settings", id: "edit.settings" },
  {
    name: "help.shortcuts",
    id: "help.shortcuts",
    fullText: ".g-shortcuts-dialog",
    covers: ["ACT-KEY-037", "ACT-KEY-026", "ACT-KEY-027"],
  },
  { name: "help.open-quick-help", id: "help.open-quick-help" },
  { name: "view.play", id: "view.play", setup: "pages3" },
  { name: "view.play--keys", id: "view.play", setup: "pages3", keys: ["Control+Alt+Enter"] },
  { name: "view.fullscreen", id: "view.fullscreen" },
  { name: "view.fullscreen--alt-enter", id: "view.fullscreen", keys: ["Alt+Enter"] },
];

const scenarios: Scenario[] = checks.map((c) => ({
  id: `editor-actions/dialogs/${c.name}`,
  covers: [ACTION_ITEMS[c.id] ?? c.id, ...(c.keys ? ["ACT-KEY-025"] : []), ...(c.covers ?? [])],
  kind: "json",
  driver: ({ page }) => runDialogCheck(page, c).then((s) => JSON.parse(s) as unknown),
}));

paritySuite("editor-actions dialogs", defineScenarios(scenarios), { newApp: false });
