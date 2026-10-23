// Old: designer.browser.dev.js module 389 (the file-type table).
/**
 * The file types the app opens, saves, places and drops (FMT-IMPORT-002).
 * getFileTypesArray() is the list open, place and drop accept: it leaves
 * out SVGZ, AI, SKETCH and ZIP although their entries exist, so those are
 * refused before any importer runs (see "Q-008 AI, SVGZ and Sketch import
 * are unreachable" in QUESTIONS.md).
 */
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";

export interface FileType {
  ext: string;
  mime: string;
  name?: LocaleKey;
  title?: LocaleKey;
  category?: string;
  load: boolean;
  store?: boolean;
  import_image: boolean;
  default?: boolean;
  /** Needed the Pro licence in the old app; the port has no licence. */
  pro?: boolean;
}

const key = (name: string): LocaleKey => new LocaleKey("GDocument", name);

export const FileTypes = {
  GVDESIGN: {
    ext: "gvdesign",
    mime: "application/gravit+design",
    name: key("file-type.gvdesign"),
    title: key("title.save-gvdesign"),
    category: "gravit",
    load: true,
    store: true,
    import_image: false,
    default: true,
  } as FileType,
  // The old entry named HEIC files with the PNG name; kept.
  HEIC: {
    ext: "heic",
    mime: "image/heic",
    name: key("file-type.png"),
    category: "image",
    load: true,
    store: false,
    import_image: true,
  } as FileType,
  PNG: {
    ext: "png",
    mime: "image/png",
    name: key("file-type.png"),
    category: "image",
    load: true,
    store: true,
    import_image: true,
  } as FileType,
  JPG: {
    ext: "jpg",
    mime: "image/jpeg",
    name: key("file-type.jpeg"),
    category: "image",
    load: true,
    store: true,
    import_image: true,
  } as FileType,
  JPEG: {
    ext: "jpeg",
    mime: "image/jpeg",
    category: "image",
    load: true,
    import_image: true,
  } as FileType,
  SVG: {
    ext: "svg",
    mime: "image/svg+xml",
    name: key("file-type.svg"),
    category: "vector",
    load: true,
    store: true,
    import_image: true,
  } as FileType,
  SVGZ: {
    ext: "svgz",
    mime: "image/svg+xml",
    name: key("file-type.svgz"),
    category: "vector",
    load: true,
    store: false,
    import_image: true,
  } as FileType,
  PDF: {
    ext: "pdf",
    mime: "application/pdf",
    name: key("file-type.pdf"),
    category: "document",
    load: true,
    store: true,
    import_image: true,
  } as FileType,
  AI: {
    ext: "ai",
    mime: "application/pdf",
    name: key("file-type.ai"),
    category: "document",
    load: true,
    store: false,
    import_image: true,
    pro: true,
  } as FileType,
  EPS: {
    ext: "eps",
    mime: "application/postscript",
    name: key("file-type.eps"),
    category: "document",
    load: true,
    store: false,
    import_image: true,
    pro: true,
  } as FileType,
  SKETCH: {
    ext: "sketch",
    mime: "application/zip",
    name: key("file-type.sketch"),
    category: "document",
    load: true,
    store: false,
    import_image: true,
    pro: true,
  } as FileType,
  ZIP: {
    ext: "zip",
    mime: "application/zip",
    load: false,
    store: false,
    import_image: false,
  } as FileType,

  /** The types open, place and drop accept, in this order. */
  getFileTypesArray(): FileType[] {
    return [
      FileTypes.GVDESIGN,
      FileTypes.PNG,
      FileTypes.HEIC,
      FileTypes.JPG,
      FileTypes.JPEG,
      FileTypes.SVG,
      FileTypes.PDF,
      FileTypes.EPS,
    ];
  },
};

/** The list open, place and drop accept (GDocument.FileTypes), for late-bound lookups. */
export const FileTypeList = FileTypes.getFileTypesArray();
