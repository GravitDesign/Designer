// Clipboard behaviour (EDT-CLIP). Two paths:
// - keyboard: real Ctrl+C/X/V presses. The old app focuses a hidden
//   textarea so the browser's copy/cut/paste events fire and carry the
//   data; Playwright's headless Chromium keeps its own clipboard per
//   browser, so no permission is needed. Each check copies before it
//   pastes so it never depends on an earlier check.
// - paste events: a ClipboardEvent with a DataTransfer dispatched on the
//   document, which is what the browser delivers for content copied in
//   another program (SVG, text, images, Gravit XML).
// The menu path (app.execute without clipboard permission, which falls back
// to the internal clipboard and shows an alert) is in exec.spec.ts.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { runKeyChecks, type KeyCheck } from "./keys.ts";
import { probe, type ProbeArgs, type Loose } from "./lib.ts";

const CLIP = { clipboard: true } as const;

interface PasteData {
  /** MIME type -> string data. */
  strings?: Record<string, string>;
  /** Files added as DataTransfer items: an SVG string or a generated PNG. */
  files?: { name: string; type: string; svg?: string; png?: [number, number] }[];
  /** Wrap the current selection as Gravit XML; restricted to this file id ("false" = none). */
  gravitXml?: string;
}

/** Dispatches a paste event with the given data on the document. */
function pasteEvent(data: PasteData): (page: Page) => Promise<unknown> {
  return (page) =>
    page.evaluate(async (d) => {
      const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
      const dt = new DataTransfer();
      for (const [type, value] of Object.entries(d.strings ?? {})) dt.setData(type, value);
      if (d.gravitXml !== undefined) {
        const json = P.G.GNode.serialize(P.app.selection());
        const esc = json
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        dt.setData(
          "text/xml",
          `<gravit mimeType="application/gravit+node" restricted="${d.gravitXml}">${esc}</gravit>`,
        );
        P.app.editor().clearSelection();
      }
      for (const f of d.files ?? []) {
        let blob: Blob;
        if (f.svg) blob = new Blob([f.svg], { type: f.type });
        else {
          const c = document.createElement("canvas");
          c.width = (f.png as [number, number])[0];
          c.height = (f.png as [number, number])[1];
          const x = c.getContext("2d") as CanvasRenderingContext2D;
          x.fillStyle = "#00ff00";
          x.fillRect(0, 0, c.width, c.height);
          blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b as Blob), "image/png"));
        }
        dt.items.add(new File([blob], f.name, { type: f.type }));
      }
      const ev = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(ev);
      return { defaultPrevented: ev.defaultPrevented };
    }, data);
}

/** Waits until the active document has finished loading pasted images. */
async function waitImages(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
    let pending = false;
    P.app.scene().acceptChildren(function v(n: Loose): void {
      if (n instanceof P.G.GImage && n.getStatus()) pending = true;
      if (n.acceptChildren) n.acceptChildren(v);
    });
    return !pending;
  });
}

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#ff0000"/></svg>';

const keyChecks: KeyCheck[] = [
  { name: "copy", setup: "rects2", id: "edit.copy", keys: ["Control+KeyC"], wait: 300, args: CLIP },
  {
    name: "copy-group-child-and-parent",
    setup: "group",
    id: "edit.copy",
    keys: ["Control+KeyC"],
    wait: 300,
    args: { ...CLIP, options: { selectGroupAndChild: true } },
  },
  { name: "cut", setup: "rects2", id: "edit.cut", keys: ["Control+KeyX"], wait: 300, args: CLIP },
  {
    name: "copy-paste",
    setup: "rects2",
    id: "paste.paste",
    keys: ["Control+KeyC", "Control+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "copy-paste-fixed-page",
    setup: "fixed-page",
    id: "paste.paste",
    keys: ["Control+KeyC", "Control+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "cut-paste",
    setup: "rects2",
    id: "paste.paste",
    keys: ["Control+KeyX", "Control+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "paste-in-place",
    setup: "rects3-one",
    id: "edit.paste.in-place",
    keys: ["Control+KeyC", "Control+KeyA", "Control+Shift+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "paste-replace",
    setup: "rects3-one",
    id: "edit.paste.replace",
    keys: ["Control+KeyC", "Control+KeyA", "Control+Alt+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "paste-inside",
    setup: "rects3-one",
    id: "edit.paste.inside",
    keys: ["Control+KeyC", "Control+Alt+Shift+KeyV"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "paste-style",
    setup: "styled",
    id: "edit.paste.style",
    keys: ["Control+KeyC", "Control+KeyA", "F4"],
    wait: 500,
    args: CLIP,
  },
  {
    name: "new-from-clipboard",
    setup: "rects2",
    id: "file.new.clipboard",
    keys: ["Control+KeyC", "Control+Shift+Alt+KeyN"],
    wait: 500,
    args: { ...CLIP, shell: true },
  },
  {
    name: "duplicate-step-and-repeat",
    setup: "rect",
    id: "edit.duplicate",
    // Duplicate, move the copy with the arrow keys, duplicate again: the
    // second copy repeats the offset.
    keys: ["Control+KeyD", "Shift+ArrowRight", "Shift+ArrowDown", "Control+KeyD"],
    gap: 100,
    wait: 300,
  },
];

const pasteChecks: KeyCheck[] = [
  {
    name: "svg-as-xml",
    setup: "rect",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ strings: { "text/xml": SVG } }),
    wait: 1000,
  },
  {
    name: "svg-file",
    setup: "rect",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ files: [{ name: "a.svg", type: "image/svg+xml", svg: SVG }] }),
    wait: 1000,
  },
  {
    name: "png-file",
    setup: "rect",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ files: [{ name: "a.png", type: "image/png", png: [30, 10] }] }),
    wait: 1000,
  },
  {
    name: "plain-text",
    setup: "rect",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ strings: { "text/plain": "Pasted text" } }),
    wait: 1000,
  },
  {
    name: "gravit-xml",
    setup: "rects2",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ gravitXml: "false" }),
    wait: 500,
  },
  {
    name: "gravit-xml-restricted",
    setup: "rects2",
    id: "paste.paste",
    keys: [],
    act: pasteEvent({ gravitXml: "someOtherFile" }),
    wait: 500,
  },
  {
    name: "annotations-sidebar-blocks-paste",
    setup: "rect",
    id: "paste.paste",
    keys: [],
    act: async (page) => {
      await page.evaluate(() =>
        (window as unknown as { __parity: { app: Loose } }).__parity.app.execute(
          "view.toggle-sidebar.annotations",
        ),
      );
      return pasteEvent({ strings: { "text/plain": "Blocked" } })(page);
    },
    wait: 500,
    args: { shell: true },
  },
];

/** Copies a range of a text being edited inline and pastes it into a textarea to read it. */
async function inlineTextCopy(page: Page): Promise<unknown> {
  await page.evaluate(() => {
    const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
    P.app.newInfiniteDocument();
  });
  await page.evaluate(
    `(${probe.toString()})(window.__parity, ${JSON.stringify({ setup: "text", phase: "setup", center: true } satisfies ProbeArgs)})`,
  );
  // Edit Selection opens the inline text editor on the selected text.
  await page.evaluate(() => {
    (window as unknown as { __parity: { app: Loose } }).__parity.app.execute("edit.edit");
  });
  await page.waitForTimeout(300);
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Control+KeyC");
  await page.waitForTimeout(200);
  const inline = await page.evaluate(() => {
    const P = (window as unknown as { __parity: { app: Loose } }).__parity;
    return { inline: !!P.app.editor().isInlineEditing(), tool: P.app.activeTool() };
  });
  // Paste the copied range at the end of the text being edited.
  await page.keyboard.press("End");
  await page.keyboard.press("Control+KeyV");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const textAfter = await page.evaluate(() => {
    const P = (window as unknown as { __parity: { G: Loose; app: Loose } }).__parity;
    const t = P.app.scene().queryAll("text")[0];
    return { plain: t.getPlainText(), texts: P.app.scene().queryAll("text").length };
  });
  await page.evaluate(() => {
    const ta = document.createElement("textarea");
    ta.id = "__ea_paste_target";
    document.body.appendChild(ta);
    ta.focus();
  });
  await page.keyboard.press("Control+KeyV");
  await page.waitForTimeout(200);
  const pasted = await page.evaluate(() => {
    const ta = document.getElementById("__ea_paste_target") as HTMLTextAreaElement;
    const v = ta.value;
    ta.remove();
    return v;
  });
  return { inlineEditing: inline, textAfterInlinePaste: textAfter, pastedText: pasted };
}

const scenarios: Scenario[] = [
  {
    id: "editor-actions/clipboard/keyboard",
    covers: [
      "EDT-CLIP-001",
      "EDT-CLIP-002",
      "EDT-CLIP-003",
      "EDT-CLIP-006",
      "EDT-CLIP-007",
      "EDT-CLIP-010",
      "EDT-CLIP-015",
      "EDT-CLIP-016",
      "EDT-CLIP-018",
      "EDT-CLIP-019",
      "EDT-CLIP-020",
      "EDT-DUP-001",
      "ACT-EDIT-003",
      "ACT-EDIT-004",
      "ACT-EDIT-005",
      "ACT-EDIT-006",
      "ACT-EDIT-007",
      "ACT-EDIT-008",
      "ACT-EDIT-010",
      "ACT-EDIT-012",
      "ACT-FILE-003",
    ],
    kind: "document",
    timeout: 240_000,
    driver: ({ page }) => runKeyChecks(page, keyChecks),
  },
  {
    id: "editor-actions/clipboard/paste-events",
    covers: ["EDT-CLIP-008", "EDT-CLIP-009", "EDT-CLIP-013", "EDT-CLIP-014", "EDT-CLIP-010"],
    kind: "document",
    timeout: 240_000,
    driver: async ({ page }) => {
      const out = await runKeyChecks(page, pasteChecks);
      await waitImages(page);
      return out;
    },
  },
  {
    id: "editor-actions/clipboard/inline-text-copy",
    covers: ["EDT-CLIP-004", "EDT-CLIP-003", "EDT-CLIP-012", "ACT-EDIT-013"],
    kind: "json",
    driver: ({ page }) => inlineTextCopy(page),
  },
];

/** Style-layer paste through the internal clipboard (EDT-CLIP-011). */
const styleLayer: Scenario<ProbeArgs>[] = (
  [
    ["fill", "fill-layer"],
    ["border", "border-layer"],
    ["effect", "effect"],
  ] as const
).map(([name, copy]) => ({
  id: `editor-actions/clipboard/paste-${name}-layer`,
  covers: ["EDT-CLIP-011", "ACT-EDIT-005"],
  kind: "document",
  inPage: probe,
  args: {
    setup: "styled-effect",
    id: "paste.paste",
    copyFirst: copy,
    pre: ["edit.select-all"],
    settle: 300,
  },
}));

paritySuite(
  "editor-actions clipboard",
  defineScenarios([...scenarios, ...(styleLayer as unknown as Scenario[])]),
  { newApp: false },
);
