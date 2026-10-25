// Import through the paths users take: File > Open Local File... (one new
// document per file), File > Import > Place Image... and drag and drop
// onto the canvas (into the current document). Each successful import is
// recorded as the resulting document and an engine render of its page;
// one "summary" scenario per path records titles, statuses and error
// dialogs for every fixture, including the failing ones.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  chooseFiles,
  clickDialogButton,
  clickMenu,
  documents,
  fixtureFile,
  runInPage,
  visibleDialogs,
  importCounts,
  waitForDocuments,
  waitForImport,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

interface Fixture {
  file: string;
  covers: string[];
  /** Record document + render (false for files that fail to import). */
  record: boolean;
}

const SVG = ["FMT-IMPORT-005", "FMT-IMPORT-006"];
const OPEN = ["FMT-IMPORT-003", "ACT-FILE-004"];

const OPEN_FIXTURES: Fixture[] = [
  { file: "svg/shapes.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/paint.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/structure.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/clip-mask-filter.svg", covers: [...OPEN, ...SVG], record: true },
  { file: "svg/markers-image.svg", covers: [...OPEN, ...SVG], record: true },
  { file: "svg/text.svg", covers: [...OPEN, ...SVG], record: true },
  // Families that don't exist under these names are mapped to the closest one.
  { file: "svg/font-fallback.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-028"], record: true },
  { file: "svg/units-mm.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/units-in-noviewbox.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/no-size.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  { file: "svg/single-group.svg", covers: [...OPEN, ...SVG, "FMT-IMPORT-008"], record: true },
  // .svgz is not in getFileTypesArray, so File > Open refuses it ("format isn't supported"); place and drop accept it.
  { file: "svg/shapes.svgz", covers: [...OPEN, "FMT-IMPORT-002", "FMT-IMPORT-005"], record: false },
  { file: "svg/invalid-root.svg", covers: [...OPEN, "FMT-IMPORT-005"], record: false },
  {
    file: "pdf/vector-2pages.pdf",
    covers: [...OPEN, "FMT-IMPORT-009", "FMT-IMPORT-010", "FMT-IMPORT-029", "FMT-IMPORT-030"],
    record: true,
  },
  { file: "pdf/images.pdf", covers: [...OPEN, "FMT-IMPORT-009", "FMT-IMPORT-010"], record: true },
  { file: "pdf/plain.pdf", covers: [...OPEN, "FMT-IMPORT-009", "FMT-IMPORT-010"], record: true },
  { file: "pdf/broken.pdf", covers: [...OPEN, "FMT-IMPORT-009"], record: false },
  // .ai and .sketch are in the file-type table but not in the list open,
  // place and drop accept (FMT-IMPORT-002), so these are refused before any
  // importer runs. GSketchImport (FMT-IMPORT-015) is unreachable from the
  // UI; the AI check runs on the PDF path instead (aiAsPdf below).
  { file: "misc/pdf-compatible.ai", covers: [...OPEN, "FMT-IMPORT-002"], record: false },
  { file: "misc/plain-pdf.ai", covers: [...OPEN, "FMT-IMPORT-002"], record: false },
  { file: "misc/postscript-only.ai", covers: [...OPEN, "FMT-IMPORT-002"], record: false },
  // CorelDRAW is stubbed out (no engine): refused like any unknown type.
  {
    file: "misc/drawing.cdr",
    covers: [...OPEN, "FMT-IMPORT-002", "FMT-IMPORT-031"],
    record: false,
  },
  {
    file: "eps/shapes.eps",
    covers: [
      ...OPEN,
      "FMT-IMPORT-012",
      "FMT-IMPORT-013",
      "FMT-WORKER-002",
      "FMT-WORKER-003",
      "FMT-WORKER-004",
      "FMT-WORKER-005",
      "FMT-WORKER-006",
      "FMT-WORKER-008",
    ],
    record: true,
  },
  {
    file: "eps/gradient.eps",
    covers: [...OPEN, "FMT-IMPORT-012", "FMT-IMPORT-013", "FMT-WORKER-007"],
    record: true,
  },
  {
    file: "eps/image-hex.eps",
    covers: [...OPEN, "FMT-IMPORT-012", "FMT-IMPORT-013", "FMT-WORKER-008"],
    record: true,
  },
  {
    file: "eps/image-dct.eps",
    covers: [...OPEN, "FMT-IMPORT-012", "FMT-WORKER-005", "FMT-WORKER-008"],
    record: false,
  },
  { file: "eps/garbage.eps", covers: [...OPEN, "FMT-IMPORT-012"], record: false },
  { file: "misc/shapes.ps", covers: [...OPEN], record: false },
  { file: "raster/alpha.png", covers: [...OPEN, "FMT-IMPORT-016", "FMT-IMPORT-018"], record: true },
  { file: "raster/photo.jpg", covers: [...OPEN, "FMT-IMPORT-016", "FMT-IMPORT-018"], record: true },
  {
    file: "raster/photo.heic",
    covers: [...OPEN, "FMT-IMPORT-019", "FMT-WORKER-013", "FMT-IMPORT-018"],
    record: true,
  },
  {
    file: "raster/indexed.gif",
    covers: [...OPEN, "FMT-IMPORT-016", "FMT-IMPORT-018"],
    record: false,
  },
  { file: "raster/image.webp", covers: [...OPEN, "FMT-IMPORT-016"], record: false },
  { file: "raster/image.bmp", covers: [...OPEN, "FMT-IMPORT-016"], record: false },
  { file: "sketch/shapes-v49.sketch", covers: [...OPEN, "FMT-IMPORT-002"], record: false },
  { file: "sketch/shapes-v52.sketch", covers: [...OPEN, "FMT-IMPORT-002"], record: false },
];

/** Engine render of the active page (1x on white) plus the document's state. */
const activeDocument = inPageWithLib(async (_p, _a: unknown, L) => {
  await L.io.settle();
  return L.renameDeepIds(L.app.serialize({ save: true }));
});

const activeRender = inPageWithLib(async (_p, a: { scale: number }, L) => {
  await L.io.settle();
  const page = L.app.scene().getActivePage();
  return L.render(page, a.scale);
});

const documentsState = inPageWithLib((_p, _a: unknown, L) => {
  const docs: { title: string; status: string }[] = L.io.documents();
  return {
    titles: docs.map((d) => d.title),
    statuses: docs.map((d) => d.status),
    active: L.app.document() ? L.app.document().getTitle() : null,
    pages: L.app
      .scene()
      .getChildren()
      .filter((n: unknown) => n instanceof L.G.GPage)
      .map((pg: { getProperty(n: string): unknown }) => ({
        name: pg.getProperty("name"),
        w: pg.getProperty("w"),
        h: pg.getProperty("h"),
        bck: pg.getProperty("bck") ? L.G.GPattern.serialize(pg.getProperty("bck")) : null,
      })),
    unit: L.app.scene().getProperty("ut"),
    paintMode: L.app.view().getViewConfiguration().paintMode,
  };
});

/** File > Open Local File... with one or more files. */
async function openFiles(page: Page, files: { name: string; buffer: Buffer }[]): Promise<unknown> {
  const before = (await documents(page)).length;
  const chooser = await chooseFiles(
    page,
    () => clickMenu(page, ["File", "Open Local File..."]),
    files,
  );
  const outcome = await waitForDocuments(page, before + files.length, 20_000);
  return { ...chooser, outcome };
}

function openScenarios(f: Fixture): Scenario<unknown>[] {
  const base = `import-export/import/open/${f.file.replace(/\//g, "-")}`;
  // What the editor shows after the open: documents and their statuses,
  // dialogs, a progress overlay that stayed up, page size and unit. A fresh
  // page per file, since a failed load can leave an overlay that blocks the
  // window (see pdf/broken.pdf).
  const state: Scenario<unknown> = {
    id: `${base}.state`,
    covers: [...f.covers, "FMT-IMPORT-002", "FMT-IMPORT-004"],
    kind: "json",
    timeout: 120_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      const chooser = await openFiles(page, [fixtureFile(f.file)]);
      const overlay = (await page.locator(".window-overlay:visible").allInnerTexts()).map((t) =>
        t.replace(/\s+/g, " ").trim(),
      );
      return {
        chooser,
        dialogs: await visibleDialogs(page),
        overlay,
        state: await runInPage(page, documentsState, {}),
      };
    },
  };
  if (!f.record) return [state];
  return [
    state,
    {
      id: base,
      covers: f.covers,
      kind: "document",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await openFiles(page, [fixtureFile(f.file)]);
        return runInPage(page, activeDocument, {});
      },
    },
    {
      id: `${base}.render`,
      covers: f.covers,
      kind: "png",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await openFiles(page, [fixtureFile(f.file)]);
        return runInPage(page, activeRender, { scale: 1 });
      },
    },
  ];
}

/** Two files picked at once open as two documents (multi-select, commit b6f53f7). */
const openMultiple: Scenario<unknown> = {
  id: "import-export/import/open/multiple-files",
  covers: ["ACT-FILE-004", "FMT-IMPORT-003"],
  kind: "json",
  timeout: 120_000,
  driver: async ({ page }) => {
    page.setDefaultTimeout(15_000);
    const chooser = await openFiles(page, [
      fixtureFile("svg/shapes.svg"),
      fixtureFile("raster/alpha.png"),
    ]);
    return { chooser, state: await runInPage(page, documentsState, {}) };
  },
};

/** The SVG exporter's editing data brings back native objects (FMT-IMPORT-007 / FMT-EXPORT-010). */
const svgRoundTrip = inPageWithLib(async (_p, a: { preserve: boolean }, L) => {
  const built = await L.build("shapes");
  const ex: Record<string, unknown> = L.dialogDefaults("svg", built.page);
  ex.preserveEditingCapabilities = a.preserve;
  const out = await L.exportB64(ex);
  return atob(out.b64);
});

function roundTrip(preserve: boolean): Scenario<unknown>[] {
  const id = `import-export/import/svg-roundtrip-${preserve ? "preserved" : "plain"}`;
  const driver = async (page: Page) => {
    const svg = await runInPage<string>(page, svgRoundTrip, { preserve });
    await openFiles(page, [{ name: "roundtrip.svg", buffer: Buffer.from(svg, "utf8") }]);
  };
  return [
    {
      id,
      covers: ["FMT-IMPORT-007", "FMT-EXPORT-010", "FMT-IMPORT-008"],
      kind: "document",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await driver(page);
        return runInPage(page, activeDocument, {});
      },
    },
    {
      id: `${id}.render`,
      covers: ["FMT-IMPORT-007", "FMT-EXPORT-010"],
      kind: "png",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await driver(page);
        return runInPage(page, activeRender, { scale: 1 });
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Place and drop into the current document

const PLACE_FIXTURES = [
  "raster/alpha.png",
  "raster/photo.jpg",
  "raster/indexed.gif",
  "raster/photo.heic",
  "svg/shapes.svg",
  "svg/shapes.svgz",
  "pdf/vector-2pages.pdf",
  "eps/shapes.eps",
];

/** A sized page with one rectangle, so placed content has a reference. */
const prepareTarget = inPageWithLib(async (_p, _a: unknown, L) => {
  const page = L.app.scene().getActivePage();
  L.setupPage(page, 600, 400, "C#[255,255,255]", "Target");
  L.insert([L.shape("rectangle", 0, 0, 20, 20, { fill: "C#[0,0,0]", name: "Marker" })]);
  await L.io.settle();
  return null;
});

const targetState = inPageWithLib(async (_p, _a: unknown, L) => {
  await L.io.settle();
  return L.sceneState();
});

async function placeFile(page: Page, file: string): Promise<unknown> {
  const before = await importCounts(page);
  const chooser = await chooseFiles(
    page,
    () => clickMenu(page, ["File", "Import", "Place Image..."]),
    [fixtureFile(file)],
  );
  const outcome = await waitForImport(page, { size: before.size }, 20_000);
  return { chooser, outcome };
}

/** Drops files on the canvas at a client position, like dragging them from the desktop. */
async function dropFiles(
  page: Page,
  files: { name: string; buffer: Buffer; mimeType: string }[],
  x: number,
  y: number,
  timeout = 20_000,
): Promise<string> {
  const before = {
    ...(await importCounts(page)),
    children: await page.evaluate(
      () =>
        (
          window as unknown as {
            __parity: { app: { scene(): { getActivePage(): { getChildren(): unknown[] } } } };
          }
        ).__parity.app
          .scene()
          .getActivePage()
          .getChildren().length,
    ),
  };
  const payload = files.map((f) => ({
    name: f.name,
    type: f.mimeType,
    b64: f.buffer.toString("base64"),
  }));
  const handle = await page.evaluateHandle((list) => {
    const dt = new DataTransfer();
    for (const f of list) {
      const bin = atob(f.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      dt.items.add(new File([bytes], f.name, { type: f.type }));
    }
    return dt;
  }, payload);
  const target = page.locator(".g-editor-widget > div[tabindex]").first();
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer: handle, clientX: x, clientY: y });
  }
  const outcome = await waitForImport(page, { size: before.size }, timeout);
  if (files.length > 1) {
    // Several files are imported one after the other: wait until each one
    // has added its element to the page.
    await page
      .waitForFunction(
        (n) =>
          (
            window as unknown as {
              __parity: { app: { scene(): { getActivePage(): { getChildren(): unknown[] } } } };
            }
          ).__parity.app
            .scene()
            .getActivePage()
            .getChildren().length >= n,
        before.children + files.length,
        { timeout },
      )
      .catch(() => undefined);
    await waitForImport(page, { size: -1 }, timeout);
  }
  return outcome;
}

/** Puts the scene origin at a known view position (zoom 1). */
const prepareView = inPageWithLib((_p, _a: unknown, L) => {
  const view = L.app.view();
  view.transform(-300, -150, 1);
  return null;
});

function placeScenarios(file: string): Scenario<unknown>[] {
  const id = `import-export/import/place/${file.replace(/\//g, "-")}`;
  const covers = ["FMT-IMPORT-020", "FMT-IMPORT-021", "ACT-FILE-010"];
  const run = async (page: Page) => {
    await runInPage(page, prepareTarget, {});
    return placeFile(page, file);
  };
  return [
    {
      id: `${id}.state`,
      covers,
      kind: "json",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        const placed = await run(page);
        return {
          placed,
          state: await runInPage(page, targetState, {}),
          dialogs: await visibleDialogs(page),
        };
      },
    },
    {
      id,
      covers,
      kind: "document",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await run(page);
        return runInPage(page, activeDocument, {});
      },
    },
  ];
}

const DROP_FIXTURES = [
  { file: "raster/alpha.png", mime: "image/png" },
  { file: "svg/structure.svg", mime: "image/svg+xml" },
  { file: "pdf/plain.pdf", mime: "application/pdf" },
  { file: "eps/gradient.eps", mime: "application/postscript" },
];

function dropScenarios(f: { file: string; mime: string }): Scenario<unknown>[] {
  const id = `import-export/import/drop/${f.file.replace(/\//g, "-")}`;
  const drop = async (page: Page) => {
    page.setDefaultTimeout(15_000);
    await runInPage(page, prepareTarget, {});
    await runInPage(page, prepareView, {});
    return dropFiles(page, [{ ...fixtureFile(f.file), mimeType: f.mime }], 700, 400);
  };
  return [
    {
      id,
      covers: ["FMT-IMPORT-024", "FMT-IMPORT-020"],
      kind: "json",
      timeout: 120_000,
      driver: async ({ page }) => {
        const outcome = await drop(page);
        return {
          outcome,
          state: await runInPage(page, targetState, {}),
          dialogs: await visibleDialogs(page),
        };
      },
    },
    {
      // The dropped content itself: geometry, styles and placement.
      id: `${id}.doc`,
      covers: ["FMT-IMPORT-024", "FMT-IMPORT-020"],
      kind: "document",
      timeout: 120_000,
      driver: async ({ page }) => {
        await drop(page);
        return runInPage(page, activeDocument, {});
      },
    },
  ];
}

const dropOthers: Scenario<unknown> = {
  id: "import-export/import/drop/unsupported-and-several",
  covers: ["FMT-IMPORT-024"],
  kind: "json",
  timeout: 120_000,
  driver: async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await runInPage(page, prepareTarget, {});
    await runInPage(page, prepareView, {});
    const out: Record<string, unknown> = {};
    // a .gvdesign drop does nothing; a nameless file is resolved by MIME; webp is not in the table
    const gv = {
      name: "doc.gvdesign",
      buffer: Buffer.from("not really"),
      mimeType: "application/octet-stream",
    };
    const gvOutcome = await dropFiles(page, [gv], 700, 400, 5000);
    out.gvdesign = {
      outcome: gvOutcome,
      state: await runInPage(page, targetState, {}),
      dialogs: await visibleDialogs(page),
    };
    const webpOutcome = await dropFiles(
      page,
      [{ ...fixtureFile("raster/image.webp"), mimeType: "image/webp" }],
      700,
      400,
      5000,
    );
    out.webp = {
      outcome: webpOutcome,
      state: await runInPage(page, targetState, {}),
      dialogs: await visibleDialogs(page),
    };
    const twoOutcome = await dropFiles(
      page,
      [
        { ...fixtureFile("raster/photo.jpg", "noext"), mimeType: "image/jpeg" },
        { ...fixtureFile("svg/no-size.svg"), mimeType: "image/svg+xml" },
      ],
      500,
      300,
    );
    out.twoFiles = {
      outcome: twoOutcome,
      state: await runInPage(page, targetState, {}),
      dialogs: await visibleDialogs(page),
    };
    return out;
  },
};

/**
 * Old-app bug: "newpath x y r 0 360 arc closepath" throws inside the
 * PostScript worker (PSCore.closepath reads an undefined current point).
 * The exception is not reported to the page, so the "Loading ..." overlay
 * stays until the 300 s worker timeout or until the user cancels.
 */
const epsHang: Scenario<unknown> = {
  id: "import-export/import/open/eps-worker-exception-hangs",
  covers: ["FMT-IMPORT-012", "FMT-WORKER-002", "FMT-WORKER-005"],
  kind: "json",
  timeout: 120_000,
  driver: async ({ page }) => {
    page.setDefaultTimeout(15_000);
    const opened = await openFiles(page, [fixtureFile("eps/arc-closepath.eps")]);
    const overlay = await page.locator(".window-overlay:visible").allInnerTexts();
    const during = await runInPage(page, documentsState, {});
    // Only the old app hangs and offers Cancel; the new one has finished
    // the load by now (BUG-109, BUG-110, BUG-113).
    const cancel = page.locator(".window-overlay:visible button", { hasText: "Cancel" }).first();
    if (await cancel.count()) {
      await cancel.click();
      await page.locator(".window-overlay").first().waitFor({ state: "hidden" });
    }
    return {
      opened,
      overlay: overlay.map((t) => t.replace(/\s+/g, " ").trim()),
      during: {
        titles: (during as { titles: string[] }).titles,
        statuses: (during as { statuses: string[] }).statuses,
      },
      afterCancel: await runInPage(page, documentsState, {}),
      dialogs: await visibleDialogs(page),
    };
  },
};

/** The missing-fonts dialog after a PDF import: keep the font information or replace the fonts. */
/** The dialog itself: missing families, proposed replacements, enabled buttons. */
const missingFontsDialog: Scenario<unknown> = {
  id: "import-export/import/open/pdf-missing-fonts-dialog",
  covers: ["FMT-IMPORT-029"],
  kind: "json",
  timeout: 120_000,
  driver: async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await openFiles(page, [fixtureFile("pdf/vector-2pages.pdf")]);
    return page.evaluate(() => {
      const dlg = [...document.querySelectorAll(".g-dialog")].find(
        (d) => (d as HTMLElement).offsetParent !== null,
      );
      if (!dlg) return null;
      return {
        text: (dlg as HTMLElement).innerText.split(/\n/).slice(0, 2),
        selects: [...dlg.querySelectorAll("select")].map((sel) => ({
          value: sel.value,
          options: sel.options.length,
        })),
        buttons: [...dlg.querySelectorAll("button")].map((b) => ({
          text: b.innerText,
          disabled: b.disabled,
        })),
      };
    });
  },
};

function missingFonts(choice: "Replace Fonts"): Scenario<unknown> {
  return {
    id: `import-export/import/open/pdf-missing-fonts-${choice === "Replace Fonts" ? "replace" : "other"}`,
    covers: ["FMT-IMPORT-010", "FMT-IMPORT-029"],
    kind: "document",
    timeout: 120_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await openFiles(page, [fixtureFile("pdf/vector-2pages.pdf")]);
      await clickDialogButton(page, choice);
      return runInPage(page, activeDocument, {});
    },
  };
}

/**
 * An Illustrator file saved PDF-compatible, opened under a .pdf name: the
 * PDF importer's isAIFormat check (XMP dc:format) finds it and asks first
 * (FMT-IMPORT-011); OK imports it as a PDF.
 */
function aiAsPdf(): Scenario<unknown>[] {
  const file = { ...fixtureFile("misc/pdf-compatible.ai"), name: "illustrator.pdf" };
  const id = "import-export/import/open/ai-saved-as-pdf";
  return [
    {
      id: `${id}.state`,
      covers: ["FMT-IMPORT-011", "FMT-IMPORT-009", "FMT-IMPORT-003"],
      kind: "json",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        const opened = await openFiles(page, [file]);
        const asked = await visibleDialogs(page);
        const during = await runInPage(page, documentsState, {});
        await clickDialogButton(page, "OK");
        await waitForImport(page, { size: -1 });
        return {
          opened,
          asked,
          during,
          after: await runInPage(page, documentsState, {}),
          dialogs: await visibleDialogs(page),
        };
      },
    },
    {
      id,
      covers: ["FMT-IMPORT-011", "FMT-IMPORT-009", "FMT-IMPORT-010"],
      kind: "document",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        await openFiles(page, [file]);
        await clickDialogButton(page, "OK");
        await waitForImport(page, { size: -1 });
        return runInPage(page, activeDocument, {});
      },
    },
  ];
}

const scenarios = defineScenarios<unknown>([
  epsHang,
  ...aiAsPdf(),
  missingFontsDialog,
  missingFonts("Replace Fonts"),
  openMultiple,
  ...OPEN_FIXTURES.flatMap(openScenarios),
  ...roundTrip(true),
  ...roundTrip(false),
  ...PLACE_FIXTURES.flatMap(placeScenarios),
  ...DROP_FIXTURES.flatMap(dropScenarios),
  dropOthers,
]);

paritySuite("import-export import", scenarios, { newApp: false });
