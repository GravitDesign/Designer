// Old: designer.browser.dev.js module 163 (GDocument.placeOrImport).
/**
 * The one entry point for files that go into an open document: File >
 * Import > Place Image, paste of files and drop on the canvas
 * (FMT-IMPORT-020, FMT-IMPORT-024). The file type comes from the storage
 * item, else from the file name's extension, else from its MIME type.
 *
 * - JPG, JPEG, HEIC, GIF and PNG become an image, after a size check
 *   (maxPngDataSize, a quarter of it for JPEG except on iOS);
 * - SVG and SVGZ are imported as they are;
 * - PDF (first page) and AI are wrapped in a rectangle named after the file;
 *   AI only when it is in the file-type list, which it isn't;
 * - EPS is wrapped in a rectangle when it has a background, else moved to
 *   the origin.
 * Other types do nothing.
 *
 * With a position the element moves there (its top left, or its center
 * with `center`); without one it is centered in a fixed-size scene. The
 * callback can take over the insert by returning true.
 */
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { hasMixin } from "../../engine/core/object.ts";
import { OperatingSystem, System } from "../../engine/core/system.ts";
import { Platform } from "../../engine/core/platform.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Text } from "../../engine/text/text.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import type { Editor } from "../../editor/editor.ts";
import { BitmapImport } from "../../io/import/bitmap-import.ts";
import { EPSImport } from "../../io/import/eps/eps-import.ts";
import { HeicImport } from "../../io/import/heic.ts";
import { PDFImport } from "../../io/import/pdf/pdf-import.ts";
import { SVGImport } from "../../io/import/svg/svg-import.ts";
import { StorageItem } from "../storage/storage.ts";
import { documentDialogs, gDesigner } from "./document-host.ts";
import { FileTypes } from "./file-types.ts";
import { importFontProvider } from "./import-font-provider.ts";
import { optimizeImport } from "./import-optimizer.ts";

/** Where to put the element: its top left, or its center with `center`. */
export interface PlacePosition {
  x: number;
  y: number;
  center?: boolean;
}

/** Takes over the insert when it returns true. */
export type PlaceCallback = (elements: Node[]) => boolean | undefined;

/** What placeOrImport needs of the document. */
export interface PlaceTarget {
  getScene(): Scene | null;
  getEditor(): Editor | null;
  insertElement(element: Node, center?: boolean, fit?: boolean, noTransaction?: boolean): void;
  _preProcessFonts(keepFontsMessage?: string): void;
  _postProcessFonts(): void;
  _activateProgress(message: string): (value: number) => void;
  _deactivateProgress(): void;
  initCancelHandler(cancel: () => void): void;
}

const text = (group: string, key: string): string =>
  Locale.get(new LocaleKey(group, key)) as string;

/** The nodes as the place code handles them. */
type PlacedNode = Node &
  ContainerApi & {
    getGeometryBBox(): Rect | null;
    getPaintBBox(): Rect | null;
    transform(transform: Transform, flag?: boolean): void;
    setProperty(name: string, value: unknown): void;
    _blockUpdateChanges(arg?: unknown): void;
    _releaseUpdateChanges(arg?: unknown): void;
  };

const asPlaced = (node: unknown): PlacedNode => node as PlacedNode;

function fontManager(): FontManager {
  return gDesigner().getWorkspace().getFontManager() as FontManager;
}

/** "Loading <name>..." or "Opening your image". */
function progressMessage(name: string | null): string {
  return name
    ? text("GCommonNames", "text.loading-file").replace("%name", name) + "..."
    : text("GDocument", "text.opening-your-image");
}

export function placeOrImport(
  document: PlaceTarget,
  source: Blob | File | StorageItem,
  position?: PlacePosition | null,
  noTransaction?: boolean,
  ignoreName?: boolean,
  callback?: PlaceCallback | null,
): void {
  /** The old `l`: names the element, moves it and inserts it. */
  const insert = (element: Node, name?: string | null): void => {
    if (name && element instanceof Block) element.setProperty("name", name);
    if (position && hasMixin(element, Element.Transform)) {
      const box = asPlaced(element).getGeometryBBox() as Rect;
      const x = box && box.getX() ? box.getX() : 0;
      const y = box && box.getY() ? box.getY() : 0;
      const dx = position.center ? -box.getWidth() / 2 : 0;
      const dy = position.center ? -box.getHeight() / 2 : 0;
      asPlaced(element).transform(
        new Transform(1, 0, 0, 1, position.x - x + dx, position.y - y + dy),
        true,
      );
    }
    if (!(callback && callback([element]))) {
      document.insertElement(element, !position, true, noTransaction);
    }
  };

  /** The old `c`: a bitmap becomes an image. */
  const placeBitmap = (data: Blob, name: string | null): void => {
    BitmapImport.import(data, (error, url, width, height) => {
      if (error) documentDialogs().message(text("GDocument", "text.image-too-big"));
      else {
        const image = new Image();
        image.setProperties(["iw", "ih", "url"], [width, height, url]);
        insert(image, name);
      }
    });
  };

  const editor = (): Editor => document.getEditor() as Editor;
  const scene = (): Scene => document.getScene() as Scene;

  /** The old `d`: EPS. */
  const placeEps = (data: Blob, name: string | null): void => {
    const progress = document._activateProgress(progressMessage(name));
    try {
      document._preProcessFonts(text("GDocument", "text.keep-fonts-eps"));
      EPSImport.import(
        data,
        gDesigner().getSetting("eps_outline_fonts", true) as boolean,
        fontManager(),
        (error, group, _size, background) => {
          document._deactivateProgress();
          document._postProcessFonts();
          if (!error && group) {
            optimizeImport(group);
            let element: PlacedNode = asPlaced(group);
            const box = element.getPaintBBox() as Rect;
            if (background) {
              const rectangle = new Rectangle();
              element = asPlaced(rectangle);
              rectangle.setBounds(0, 0, box.getWidth(), box.getHeight());
              asPlaced(rectangle)._blockUpdateChanges();
              const fill = new FillPaintLayer();
              fill.setProperties(["_pt"], [background]);
              (rectangle.getPaintLayers() as unknown as ContainerApi).appendChild(fill);
              while (group.getFirstChild()) {
                const child = asPlaced(group.getFirstChild());
                group.removeChild(child);
                child.transform(new Transform().translated(-box.getX(), -box.getY()));
                rectangle.appendChild(child);
              }
              asPlaced(rectangle)._releaseUpdateChanges();
              rectangle._invalidateGeometryForChildUpdate(true);
            } else element.transform(new Transform().translated(-box.getX(), -box.getY()));
            element.setProperty("name", name || text("GCommonNames", "text.image"));
            if (!noTransaction) editor().beginTransaction();
            try {
              scene().appendChild(element);
              element.acceptChildren((node: Node) => {
                if (node instanceof Text && node.hasFontsToResolve()) node.toFakeText();
              });
            } finally {
              if (!noTransaction)
                editor().commitTransaction(text("GDocument", "text.import-from-eps"));
            }
          } else if (error) documentDialogs().message(error as string);
        },
        (message) => {
          document._deactivateProgress();
          documentDialogs().message(message);
        },
        progress,
        (cancel) => document.initCancelHandler(cancel),
      );
    } catch (error) {
      document._deactivateProgress();
      throw error;
    }
  };

  /** The old `u`: PDF and AI, the first page wrapped in a rectangle. */
  const placePdf = (data: Blob, name: string | null, ai: boolean): void => {
    const progress = document._activateProgress(progressMessage(name));
    try {
      document._preProcessFonts();
      PDFImport.import(
        data,
        { startPage: 1 },
        fontManager(),
        (error, pages) => {
          document._deactivateProgress();
          document._postProcessFonts();
          if (error) {
            // "A broken or encrypted PDF never finishes loading" in
            // BUGS-FIXED.md: the old dialog showed the error object.
            console.log(error);
            documentDialogs().message(text("GDocument", "text.error-reading-file"));
          } else if (pages && pages.length) {
            if (!noTransaction) editor().beginTransaction();
            try {
              const page = pages.shift() as unknown as PlacedNode;
              optimizeImport(page);
              const box = asPlaced(page).getGeometryBBox() as Rect;
              const rectangle = new Rectangle();
              rectangle.setProperty("name", name || text("GCommonNames", "text.image"));
              rectangle.setBounds(box.getX(), box.getY(), box.getWidth(), box.getHeight());
              rectangle.beginUpdate();
              page.getChildren().forEach((child) => {
                page.removeChild(child);
                rectangle.appendChild(child);
              });
              scene().appendChild(rectangle);
              rectangle.acceptChildren((node: Node) => {
                if (node instanceof Text) node.toFakeText();
              });
              rectangle.endUpdate();
            } finally {
              if (!noTransaction) {
                editor().commitTransaction(
                  text("GDocument", ai ? "text.import-from-ai" : "text.import-from-pdf"),
                );
              }
            }
          }
        },
        // Sic: the progress bar gets the number of pages done, not a
        // percentage (see "Placing a PDF reports pages as percent" in
        // QUESTIONS.md).
        (done) => progress(done),
        (proceed) => {
          documentDialogs().message(text("GDocument", "text.ai-not-pdf-compatible"), proceed);
        },
      );
    } catch (error) {
      document._deactivateProgress();
      throw error;
    }
  };

  /** The old `p`: dispatch by type. */
  const place = (data: Blob, extension: string | null, name: string | null): void => {
    const type = extension && extension.toUpperCase();
    let limit = Platform.maxPngDataSize;
    if (("JPG" === type || "JPEG" === type) && System.operatingSystem !== OperatingSystem.OSX_IOS) {
      limit >>= 2;
    }
    switch (type) {
      case "JPG":
      case "JPEG":
      case "HEIC":
      case "GIF":
      case "PNG":
        if (data.size > limit) {
          documentDialogs().message(text("GDocument", "text.image-too-big"));
          return;
        }
        if ("HEIC" === type) {
          HeicImport.getInstance()
            .then((converter) => converter.parse(data))
            .then((png) => placeBitmap(png as Blob, name))
            .catch((error: unknown) => {
              // "A HEIC that fails to convert leaves the tab Loading" in
              // BUGS-FIXED.md: the old place failed silently.
              console.log("HEIC conversion failed", error);
              documentDialogs().message(text("GDocument", "text.error-reading-file"));
            });
        } else placeBitmap(data, name);
        break;
      case "SVG":
      case "SVGZ":
        SVGImport.import(
          data,
          { fontProvider: importFontProvider as never },
          fontManager(),
          (_error, node) => {
            if (node) insert(node as unknown as Node, name);
          },
        );
        break;
      case "PDF":
        placePdf(data, name, false);
        break;
      case "AI":
        if (FileTypes.getFileTypesArray().includes(FileTypes.AI)) placePdf(data, name, true);
        break;
      case "EPS":
        placeEps(data, name);
    }
  };

  if (source instanceof StorageItem) {
    source.read((bytes) => {
      place(new Blob([bytes as Uint8Array<ArrayBuffer>]), source.getExtension(), source.getName());
    });
  } else {
    let extension: string | null = null;
    let name: string | null = null;
    const file = source as File;
    if (!ignoreName && file.name) {
      const dot = file.name.lastIndexOf(".");
      if (dot >= 0) {
        extension = file.name.substr(dot + 1);
        name = file.name.substr(0, dot);
      }
    }
    if (!extension && source.type) {
      for (const type of FileTypes.getFileTypesArray()) {
        if (type.mime === source.type) {
          extension = type.ext;
          break;
        }
      }
    }
    // The Pro check that followed is gone with the licence: every type is allowed.
    place(source, extension, name);
  }
}
