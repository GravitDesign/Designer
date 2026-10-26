// Old: designer.browser.dev.js module 163 (the branches of GDocument.load
// for files other than .gvdesign).
/**
 * Opening an imported file as a document (FMT-IMPORT-003): SVG and SVGZ
 * (FMT-IMPORT-008), EPS (FMT-IMPORT-013), PDF and AI (FMT-IMPORT-010),
 * Sketch (FMT-IMPORT-015) and JPG, JPEG, PNG and HEIC (FMT-IMPORT-018).
 * Each builds a new scene from the importer's result and gives it to the
 * document; any other extension fails the load.
 *
 * The load options object is the one the document passed with its
 * Loading status: the window sets its `progress` then (GWindow's status
 * handler), so it is read when needed, not before.
 */
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { hasMixin } from "../../engine/core/object.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { Group } from "../../engine/scene/group.ts";
import { Image } from "../../engine/scene/image.ts";
import { Node } from "../../engine/scene/node.ts";
import { ElementChange } from "../../engine/scene/element-change.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { Text } from "../../engine/text/text.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { BitmapImport } from "../../io/import/bitmap-import.ts";
import { EPSImport } from "../../io/import/eps/eps-import.ts";
import { HeicImport } from "../../io/import/heic.ts";
import { PDFImport } from "../../io/import/pdf/pdf-import.ts";
import { SketchImport } from "../../io/import/sketch/sketch-import.ts";
import { SVGImport } from "../../io/import/svg/svg-import.ts";
import type { StorageItem } from "../storage/storage.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { documentDialogs, gDesigner } from "./document-host.ts";
import { DocumentStatus } from "./document-status.ts";
import { importFontProvider } from "./import-font-provider.ts";
import { optimizeImport } from "./import-optimizer.ts";

/** The load options (the document's `t`). */
export interface OpenImportOptions {
  progress: ((percent: number) => void) | null;
  [key: string]: unknown;
}

/** What the open needs of the document. */
export interface OpenImportContext {
  document: unknown;
  updateStatus(status: number, data?: unknown): void;
  setTitle(title: string | null): void;
  setScene(scene: Scene): void;
  preProcessFonts(keepFontsMessage?: string): void;
  postProcessFonts(): void;
  initCancelHandler(cancel: () => void): void;
}

/** The child changes blocked while pages are filled. */
const CHILD_CHANGES = [
  Node._Change.BeforeChildRemove,
  Node._Change.AfterChildRemove,
  Node._Change.BeforeChildInsert,
  Node._Change.AfterChildInsert,
] as number[];

/**
 * While an import fills the new scene's page, the scene doesn't hear of
 * each child's geometry update. Every one of them made the scene re-index
 * the page, which recomputes the page's boxes over all its children, so
 * filling a page was quadratic in the number of shapes. The scene is told
 * once at the end instead (`endPageUpdates`), with the page in its final
 * state, which leaves it as the last of those updates did. Nothing else
 * sees the difference: the new scene has no views or listeners yet, so
 * its invalidations and events go nowhere, and the page and its children
 * still handle every change themselves.
 */
const PAGE_UPDATES = [ElementChange.ChildGeometryUpdate] as number[];

function beginPageUpdates(scene: Scene): void {
  asImported(scene)._beginBlockChanges(PAGE_UPDATES);
}

/**
 * Ends `beginPageUpdates` and, when the page took children, sends the
 * update the page sent last: `last` is the child it was about (its paint
 * box is the area to repaint), or the page's own box when that child left
 * the page again.
 */
function endPageUpdates(scene: Scene, page: Page, last: ImportedNode | null): void {
  asImported(scene)._endBlockChanges(PAGE_UPDATES);
  if (!last) return;
  const box = last.getParent() === page ? last.getPaintBBox() : page.getPaintBBox();
  scene._notifyChange(ElementChange.ChildGeometryUpdate, [page, 1, box]);
}

const text = (group: string, key: string): string =>
  Locale.get(new LocaleKey(group, key)) as string;

/** The nodes as the imports handle them. */
type ImportedNode = Node &
  ContainerApi & {
    getPaintBBox(): Rect | null;
    transform(transform: Transform, flag?: boolean): void;
    getEffects(): Node | null;
    getPaintLayers(): Node | null;
    hasStyleBorder(): boolean;
    hasStyleFill(): boolean;
    _blockUpdateChanges(arg?: unknown): void;
    _releaseUpdateChanges(arg?: unknown): void;
    _beginBlockChanges(changes: number[]): void;
    _endBlockChanges(changes: number[]): void;
  };

const asImported = (node: unknown): ImportedNode => node as ImportedNode;

function fontManager(): FontManager {
  return gDesigner().getWorkspace().getFontManager() as FontManager;
}

/** After an import: the active view paints the page clipped (Output) and repaints. */
function showOutput(): void {
  const window = gDesigner().getWindows().getActiveWindow();
  const view = window ? window.getView() : null;
  if (!view) return;
  view.getViewConfiguration().paintMode = ScenePaintConfiguration.PaintMode.Output;
  view.invalidate();
}

/** Texts whose fonts are still missing become fake texts (outlines). */
function fakeUnresolvedTexts(root: Node & ContainerApi): void {
  root.acceptChildren((node: Node) => {
    if (node instanceof Text && node.hasFontsToResolve()) node.toFakeText();
  });
}

/**
 * GDocument.load for every extension but .gvdesign. `extension` is the
 * storage item's (upper case).
 */
export function openImportedFile(
  context: OpenImportContext,
  item: StorageItem,
  extension: string | null,
  data: Uint8Array,
  options: OpenImportOptions,
): void {
  const setNamedScene = (scene: Scene): void => {
    if (item.getName()) context.setTitle(item.getName());
    context.setScene(scene);
  };
  if ("SVG" === extension || "SVGZ" === extension) {
    SVGImport.import(
      data,
      { fontProvider: importFontProvider as never },
      fontManager(),
      (_error, result, info) => {
        if (result) {
          let scene: Scene;
          if (result instanceof Page) {
            scene = gDesigner().createScene(true);
            scene.appendChild(result);
            scene.setActivePage(result);
          } else {
            scene = gDesigner().createScene();
            const page = scene.getActivePage() as Page;
            let box: Rect | null = null;
            const kept: Node[] = [];
            if (result instanceof Group) {
              const single = 1 === result.getChildren().length;
              while (result.getFirstChild()) {
                const child = asImported(result.getFirstChild());
                result.removeChild(child);
                page.appendChild(child);
                if (single && hasMixin(child, Stylable)) {
                  const effects = asImported(result).getEffects() as (Node & ContainerApi) | null;
                  if (effects && effects.getChildren().length) {
                    effects.getChildren().forEach((effect) => {
                      (child.getEffects() as Node & ContainerApi).appendChild(
                        (effect as unknown as { clone(): Node }).clone(),
                      );
                    });
                  }
                }
                if (
                  !hasMixin(child, Stylable) ||
                  null === child.getPaintLayers() ||
                  child instanceof Image ||
                  child.hasStyleBorder() ||
                  child.hasStyleFill()
                ) {
                  kept.push(child);
                  if (child.getPaintBBox()) {
                    box = box ? box.united(child.getPaintBBox() as Rect) : child.getPaintBBox();
                  }
                }
              }
            } else {
              kept.push(result as unknown as Node);
              page.appendChild(result as unknown as Node);
              box = asImported(result).getPaintBBox();
            }
            void box;
            page.setProperties(["w", "h"], [info ? info.width : 0, info ? info.height : 0]);
            if ((info as NonNullable<typeof info>).unit) {
              scene.setProperty("ut", (info as NonNullable<typeof info>).unit);
            }
          }
          context.updateStatus(DocumentStatus.Loaded);
          setNamedScene(scene);
        } else context.updateStatus(DocumentStatus.LoadFailed);
        showOutput();
      },
    );
  } else if ("EPS" === extension) {
    context.preProcessFonts(text("GDocument", "text.keep-fonts-eps"));
    EPSImport.import(
      data,
      gDesigner().getSetting("eps_outline_fonts", true) as boolean,
      fontManager(),
      (error, group, size, background) => {
        context.postProcessFonts();
        if (error || !group) {
          if (error) documentDialogs().message(error as string);
          context.updateStatus(DocumentStatus.LoadFailed);
          showOutput();
          return;
        }
        const scene = gDesigner().createScene();
        const page = scene.getActivePage() as Page;
        let box: Rect | null = null;
        optimizeImport(group);
        const moved: ImportedNode[] = [];
        asImported(scene)._beginBlockChanges(CHILD_CHANGES);
        beginPageUpdates(scene);
        asImported(group)._blockUpdateChanges();
        while (group.getFirstChild()) {
          const child = asImported(group.getFirstChild());
          group.removeChild(child);
          page.appendChild(child);
          moved.push(child);
          if (child.getPaintBBox()) {
            box = box ? box.united(child.getPaintBBox() as Rect) : child.getPaintBBox();
          }
        }
        fakeUnresolvedTexts(page);
        asImported(group)._releaseUpdateChanges();
        for (const child of moved) {
          child.transform(new Transform().translated(-(box as Rect).getX(), -(box as Rect).getY()));
        }
        endPageUpdates(
          scene,
          page,
          moved.length ? (moved[moved.length - 1] as ImportedNode) : null,
        );
        const pageSize = size as { width: number; height: number } | null;
        if (pageSize) page.setProperties(["w", "h"], [pageSize.width, pageSize.height]);
        else page.trimToContent();
        page.setProperty("bck", background || RGBColor.WHITE);
        asImported(scene)._endBlockChanges(CHILD_CHANGES);
        context.updateStatus(DocumentStatus.Loaded);
        setNamedScene(scene);
      },
      (message) => {
        documentDialogs().message(message);
      },
      (percent) => {
        if (options && options.progress) options.progress(percent);
      },
      // A cancelled import fails the load; the old document stayed Loading
      // ("Cancelling an EPS import leaves the document Loading" in
      // BUGS-FIXED.md).
      (cancel) =>
        context.initCancelHandler(() => {
          cancel();
          context.postProcessFonts();
          context.updateStatus(DocumentStatus.LoadFailed);
        }),
    );
  } else if ("PDF" === extension || "AI" === extension) {
    context.preProcessFonts();
    let progress = 0;
    const notPdfCompatible = (proceed: () => void): void => {
      documentDialogs().message(text("GDocument", "text.ai-not-pdf-compatible"), proceed);
    };
    withFontFamilies(() =>
      PDFImport.import(
        data,
        {},
        fontManager(),
        (error, pages, missingFonts) => {
          context.postProcessFonts();
          if (error) {
            // A PDF pdf.js can't open fails the load with a message ("A
            // broken or encrypted PDF never finishes loading" in
            // BUGS-FIXED.md); the old dialog showed the error object.
            console.log(error);
            documentDialogs().message(text("GDocument", "text.error-reading-file"));
            context.updateStatus(DocumentStatus.LoadFailed);
          } else {
            const list = pages as Page[];
            const scene = gDesigner().createScene(true);
            asImported(scene)._beginBlockChanges(CHILD_CHANGES);
            list.forEach((page, index) => {
              page.setProperty("name", text("GCommonNames", "text.page") + " " + (index + 1));
              optimizeImport(page);
              scene.appendChild(page);
            });
            asImported(scene)._endBlockChanges(CHILD_CHANGES);
            scene.setActivePage(list[0] as Page);
            context.updateStatus(DocumentStatus.Loaded);
            setNamedScene(scene);
            if (missingFonts instanceof Array && missingFonts.length) {
              documentDialogs().missingFonts(context.document, missingFonts, (replaced) => {
                if (!replaced) {
                  scene.acceptChildren((node: Node) => {
                    if (node instanceof Text) node.toFakeText();
                  });
                }
              });
            }
            showOutput();
          }
        },
        (done, total) => {
          progress = Math.max(progress, (done / total) * 100);
          // The window sets progress with the Loading status.
          if (options.progress) options.progress(progress);
        },
        notPdfCompatible,
      ),
    );
  } else if ("SKETCH" === extension) {
    context.preProcessFonts();
    SketchImport.import(
      data,
      {
        progress: options.progress || undefined,
        fontProvider: importFontProvider as never,
        workspace: gDesigner().getWorkspace(),
      },
      (outcome) => {
        context.postProcessFonts();
        const result = (outcome || {}) as {
          pages?: Page[];
          v50error?: boolean;
          replacedFonts?: unknown[];
        };
        const pages = result.pages;
        if (pages && Array.isArray(pages)) {
          if (result.replacedFonts) {
            documentDialogs().missingFonts(context.document, result.replacedFonts);
          }
          const scene = gDesigner().createScene(true);
          asImported(scene)._beginBlockChanges(CHILD_CHANGES);
          pages.forEach((page) => {
            scene.appendChild(page);
          });
          asImported(scene)._endBlockChanges(CHILD_CHANGES);
          scene.setActivePage(pages[0] as Page);
          context.updateStatus(DocumentStatus.Loaded);
          setNamedScene(scene);
        } else if (result.v50error) {
          documentDialogs().message(text("GDocument", "text.unsupported-sketch-version-50+"));
          context.updateStatus(DocumentStatus.LoadFailed);
        } else {
          context.updateStatus(DocumentStatus.LoadFailed, {
            text: "string" == typeof outcome ? outcome : null,
          });
        }
      },
    );
  } else if (
    "JPG" === extension ||
    "JPEG" === extension ||
    "PNG" === extension ||
    "HEIC" === extension
  ) {
    const imported = (
      error: string | null,
      url?: string,
      width?: number,
      height?: number,
    ): void => {
      if (error) {
        documentDialogs().message(text("GDocument", "text.image-too-big"));
        context.updateStatus(DocumentStatus.LoadFailed);
        return;
      }
      // The window sets progress with the Loading status.
      if (options.progress) options.progress(100);
      const scene = gDesigner().createScene();
      const page = scene.getActivePage() as Page;
      const image = new Image();
      image.setProperties(["iw", "ih", "url"], [width, height, url]);
      page.setProperties(
        ["w", "h", "bck"],
        [width, height, "PNG" !== extension ? RGBColor.WHITE : null],
      );
      page.appendChild(image);
      setNamedScene(scene);
      context.updateStatus(DocumentStatus.Loaded);
    };
    if ("HEIC" === extension) {
      const blob = new Blob([data as Uint8Array<ArrayBuffer>]);
      HeicImport.getInstance()
        .then((converter) => converter.parse(blob))
        .then((png) => BitmapImport.import(png as Blob, imported))
        .catch((error: unknown) => {
          // A HEIC that can't be converted fails the load with a message
          // ("A HEIC that fails to convert leaves the tab Loading" in
          // BUGS-FIXED.md).
          console.log("Heic conversion error", error);
          documentDialogs().message(text("GDocument", "text.error-reading-file"));
          context.updateStatus(DocumentStatus.LoadFailed);
        });
    } else BitmapImport.import(data, imported);
  } else context.updateStatus(DocumentStatus.LoadFailed);
}

/**
 * Before a PDF import: lists every family the fonts provider manager
 * knows (query "%", all) and hands the families and their fonts' family
 * names to the PDF importer (FMT-IMPORT-028), once.
 */
export function withFontFamilies(next: () => void): void {
  let called = false;
  FontsProviderManager.getInstance().query(
    (result) => {
      let families: string[] = [];
      result.faces.slice().map((face) => {
        const names = [face.family];
        for (let i = 0; i < face.fonts.length; i++) {
          const family = (face.fonts[i] as { family?: string }).family;
          if (family && names.indexOf(family) < 0) names.push(family);
        }
        families = families.concat(names);
        return undefined;
      });
      PDFImport.updateFontFamilies(families);
      if (!called) {
        called = true;
        next();
      }
    },
    "%",
    true,
  );
}
