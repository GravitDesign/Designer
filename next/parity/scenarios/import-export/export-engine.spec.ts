/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// Export matrix through the export dialog's code path (GExporter
// .exportExportable): every format with its options, on small documents
// built in the page. See export-cases.ts.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { EXPORT_CASES, type ExportCase } from "./export-cases.ts";
import { fixtureBase64, renderPdf } from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

interface CaseArgs {
  c: ExportCase;
  png: string;
  jpg: string;
  normalize: boolean;
  decode: boolean;
}

const images = {
  png: "data:image/png;base64," + fixtureBase64("raster/alpha.png"),
  jpg: "data:image/jpeg;base64," + fixtureBase64("raster/photo.jpg"),
};

/** Builds the case's document, exports it and returns base64 output. */
const runCase = inPageWithLib(async (_p, a: CaseArgs, L) => {
  const { G, app } = L;
  app.document().setTitle("Export Test");
  const built = await L.build(a.c.doc, { png: a.png, jpg: a.jpg });
  if (a.c.pageProps) {
    const names = Object.keys(a.c.pageProps);
    built.page.setProperties(
      names,
      names.map((n) => (a.c.pageProps as any)[n]),
    );
  }
  let element: any;
  if (a.c.target === "page") element = built.page;
  else if (a.c.target === "pages")
    element = built.scene.getChildren().filter((n: any) => n instanceof G.GPage && n.isVisible());
  else
    element = built[a.c.target.toLowerCase()] ?? built.scene.querySingle(`[name="${a.c.target}"]`);
  if (!element) throw new Error("no target " + a.c.target);
  const ex: any = L.dialogDefaults(a.c.format, element);
  const bg = a.c.background ?? "page";
  if (bg === "page") {
    ex.configuration.sceneBackground = true;
  } else if (bg === "none") {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = a.c.format === "jpg" ? G.GRGBColor.WHITE : null;
  } else {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = L.pat(bg.color);
    ex.backgroundOpacity = bg.opacity;
  }
  for (const [k, v] of Object.entries(a.c.settings ?? {})) {
    if (k === "configuration") Object.assign(ex.configuration, v);
    else ex[k] = v;
  }
  const out = await L.exportB64(ex);
  if (a.decode) return L.decodeToPng(out.b64, out.mime);
  if (a.c.format === "svg") return L.normalizeSvg(L.utf8(out.b64));
  return a.normalize ? L.normalizePdfB64(out.b64) : out.b64;
});

const extension: Record<ExportCase["format"], string> = {
  png: ".png",
  jpg: ".jpg",
  svg: ".svg",
  pdf: ".pdf",
};

function scenariosFor(c: ExportCase): Scenario<CaseArgs>[] {
  const id = `import-export/export/${c.id}`;
  const args: CaseArgs = { c, ...images, normalize: c.format === "pdf", decode: false };
  const list: Scenario<CaseArgs>[] = [
    {
      id,
      covers: c.covers,
      kind: c.format === "svg" ? "text" : "bytes",
      extension: extension[c.format],
      inPage: runCase,
      args,
    },
  ];
  if (c.format === "png" || c.format === "jpg") {
    list.push({
      id: `${id}.decoded`,
      covers: c.covers,
      kind: "png",
      inPage: runCase,
      args: { ...args, decode: true },
    });
  }
  if (c.format === "pdf") {
    list.push({
      id: `${id}.render`,
      covers: c.covers,
      kind: "png",
      args,
      driver: async ({ page }, a) => {
        const b64 = (await page.evaluate(
          `(${runCase.toString()})(window.__parity, ${JSON.stringify(a)})`,
        )) as string;
        return renderPdf(page, Buffer.from(b64, "base64"), 1.5);
      },
    });
  }
  return list;
}

paritySuite(
  "import-export export matrix",
  defineScenarios(EXPORT_CASES.flatMap(scenariosFor)) as Scenario[],
  {
    newApp: false,
  },
);
