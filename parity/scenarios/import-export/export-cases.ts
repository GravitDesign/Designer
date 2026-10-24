/**
 * The export matrix: one test document, one target, one format and the
 * settings the export dialog would pass. Each case becomes several
 * scenarios (see export-engine.spec.ts): the exact bytes, and for raster
 * formats the decoded pixels, for PDF a render with the reference pdf.js.
 */
export interface ExportCase {
  id: string;
  covers: string[];
  doc: "shapes" | "text" | "effects" | "image" | "multipage";
  /** "page", "pages" (all visible pages, as the dialog merges PDFs) or an element name from the builder. */
  target: string;
  format: "png" | "jpg" | "svg" | "pdf";
  /** Settings over the dialog defaults; colors as pattern strings. */
  settings?: Record<string, unknown>;
  /** "page" = the dialog's "Use page color" (default), "none" = Transparent, or a color pattern string with opacity. */
  background?: "page" | "none" | { color: string; opacity: number };
  /** Page properties to set before exporting (e.g. bleed). */
  pageProps?: Record<string, unknown>;
}

const PNG = ["FMT-EXPORT-002", "FMT-EXPORT-004", "FMT-EXPORT-005"];
const JPG = ["FMT-EXPORT-002", "FMT-EXPORT-004", "FMT-EXPORT-005", "FMT-EXPORT-025"];
const SVG = ["FMT-EXPORT-005", "FMT-EXPORT-006", "FMT-EXPORT-007"];
// The PDF exporter compresses streams and encodes rasters in pdfexport.worker.js.
const PDF = [
  "FMT-EXPORT-005",
  "FMT-EXPORT-014",
  "FMT-EXPORT-020",
  "FMT-EXPORT-021",
  "FMT-WORKER-012",
];

export const EXPORT_CASES: ExportCase[] = [
  // PNG: sizes (FMT-EXPORT-003, FMT-EXPORT-024)
  {
    id: "png/page-1x",
    covers: [...PNG, "FMT-EXPORT-022"],
    doc: "shapes",
    target: "page",
    format: "png",
  },
  {
    id: "png/page-2x",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "2x" },
  },
  {
    id: "png/page-0.5x",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "0.5x" },
  },
  {
    id: "png/page-512w",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "512w" },
  },
  {
    id: "png/page-512h",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "512h" },
  },
  {
    id: "png/page-128x128",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "128x128" },
  },
  {
    id: "png/page-300dpi",
    covers: [...PNG, "FMT-EXPORT-003", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: "300dpi" },
  },
  {
    id: "png/page-1.5x-uppercase",
    covers: [...PNG, "FMT-EXPORT-003"],
    doc: "shapes",
    target: "page",
    format: "png",
    settings: { size: " 1.5X " },
  },
  // PNG: backgrounds (FMT-EXPORT-026)
  {
    id: "png/selection-transparent",
    covers: [...PNG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "Tilted",
    format: "png",
    background: "none",
  },
  {
    id: "png/selection-custom-bg",
    covers: [...PNG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "Oval",
    format: "png",
    background: { color: "C#[0,200,255]", opacity: 0.5 },
  },
  {
    id: "png/page-transparent",
    covers: [...PNG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "page",
    format: "png",
    background: "none",
  },
  // PNG: content
  { id: "png/effects", covers: [...PNG], doc: "effects", target: "page", format: "png" },
  {
    id: "png/effects-2x",
    covers: [...PNG],
    doc: "effects",
    target: "page",
    format: "png",
    settings: { size: "2x" },
  },
  { id: "png/text", covers: [...PNG], doc: "text", target: "page", format: "png" },
  { id: "png/image", covers: [...PNG], doc: "image", target: "page", format: "png" },
  {
    id: "png/element-shadow",
    covers: [...PNG],
    doc: "effects",
    target: "Shadow",
    format: "png",
    background: "none",
  },
  // JPEG
  {
    id: "jpg/page-q92",
    covers: [...JPG, "FMT-EXPORT-022"],
    doc: "shapes",
    target: "page",
    format: "jpg",
  },
  {
    id: "jpg/page-q25",
    covers: [...JPG],
    doc: "shapes",
    target: "page",
    format: "jpg",
    settings: { jpegQuality: 25 },
  },
  {
    id: "jpg/page-q100",
    covers: [...JPG],
    doc: "shapes",
    target: "page",
    format: "jpg",
    settings: { jpegQuality: 100 },
  },
  {
    id: "jpg/page-2x",
    covers: [...JPG, "FMT-EXPORT-003"],
    doc: "shapes",
    target: "page",
    format: "jpg",
    settings: { size: "2x" },
  },
  {
    id: "jpg/page-300dpi",
    covers: [...JPG, "FMT-EXPORT-003"],
    doc: "shapes",
    target: "page",
    format: "jpg",
    settings: { size: "300dpi" },
  },
  {
    id: "jpg/selection-white",
    covers: [...JPG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "Tilted",
    format: "jpg",
    background: { color: "C#[255,255,255]", opacity: 1 },
  },
  { id: "jpg/image", covers: [...JPG], doc: "image", target: "page", format: "jpg" },
  // SVG
  {
    id: "svg/page-default",
    covers: [...SVG, "FMT-EXPORT-022"],
    doc: "shapes",
    target: "page",
    format: "svg",
  },
  {
    id: "svg/selection-box",
    covers: [...SVG],
    doc: "shapes",
    target: "Box",
    format: "svg",
    background: "none",
  },
  {
    id: "svg/selection-tilted",
    covers: [...SVG],
    doc: "shapes",
    target: "Tilted",
    format: "svg",
    background: "none",
  },
  {
    id: "svg/decimal-0",
    covers: [...SVG, "FMT-EXPORT-029"],
    doc: "shapes",
    target: "page",
    format: "svg",
    settings: { decimalPlacesPrecision: 0 },
  },
  {
    id: "svg/decimal-6",
    covers: [...SVG, "FMT-EXPORT-029"],
    doc: "shapes",
    target: "page",
    format: "svg",
    settings: { decimalPlacesPrecision: 6 },
  },
  {
    id: "svg/text",
    covers: [...SVG, "FMT-EXPORT-009"],
    doc: "text",
    target: "page",
    format: "svg",
  },
  {
    id: "svg/text-curves",
    covers: [...SVG, "FMT-EXPORT-009", "FMT-EXPORT-030"],
    doc: "text",
    target: "page",
    format: "svg",
    settings: { convertTextToPath: true },
  },
  {
    id: "svg/layer-names-as-id",
    covers: [...SVG, "FMT-EXPORT-008", "FMT-EXPORT-032"],
    doc: "shapes",
    target: "page",
    format: "svg",
    settings: { layerNamesAsId: true },
  },
  {
    id: "svg/preserve-editing",
    covers: [...SVG, "FMT-EXPORT-010", "FMT-EXPORT-033"],
    doc: "shapes",
    target: "page",
    format: "svg",
    settings: { preserveEditingCapabilities: true },
  },
  {
    id: "svg/effects",
    covers: [...SVG, "FMT-EXPORT-011"],
    doc: "effects",
    target: "page",
    format: "svg",
  },
  {
    id: "svg/image",
    covers: [...SVG, "FMT-EXPORT-013"],
    doc: "image",
    target: "page",
    format: "svg",
  },
  {
    id: "svg/custom-bg",
    covers: [...SVG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "page",
    format: "svg",
    background: { color: "C#[255,240,200]", opacity: 0.8 },
  },
  {
    id: "svg/page-transparent",
    covers: [...SVG, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "page",
    format: "svg",
    background: "none",
  },
  // PDF
  {
    id: "pdf/page-72dpi",
    covers: [...PDF, "FMT-EXPORT-022", "FMT-EXPORT-024"],
    doc: "shapes",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
  },
  {
    id: "pdf/effects-150dpi",
    covers: [...PDF, "FMT-EXPORT-016", "FMT-EXPORT-024"],
    doc: "effects",
    target: "page",
    format: "pdf",
    settings: { size: "150dpi" },
  },
  {
    id: "pdf/effects-ignored",
    covers: [...PDF, "FMT-EXPORT-016", "FMT-EXPORT-028"],
    doc: "effects",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi", configuration: { ignoreEffects: true } },
  },
  {
    id: "pdf/cmyk",
    covers: [...PDF, "FMT-EXPORT-027"],
    doc: "shapes",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi", colorSpace: "cmyk" },
  },
  {
    id: "pdf/text",
    covers: [...PDF, "FMT-EXPORT-017"],
    doc: "text",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
  },
  {
    id: "pdf/text-curves",
    covers: [...PDF, "FMT-EXPORT-017", "FMT-EXPORT-030"],
    doc: "text",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi", convertTextToPath: true },
  },
  {
    id: "pdf/image",
    covers: [...PDF, "FMT-EXPORT-018", "FMT-EXPORT-034"],
    doc: "image",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
  },
  {
    id: "pdf/image-downsample-q25",
    covers: [...PDF, "FMT-EXPORT-018", "FMT-EXPORT-025", "FMT-EXPORT-034"],
    doc: "image",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi", downsampleImages: true, jpegQuality: 25 },
  },
  {
    id: "pdf/multipage",
    covers: [...PDF, "FMT-EXPORT-048"],
    doc: "multipage",
    target: "pages",
    format: "pdf",
    settings: { size: "72dpi" },
  },
  {
    id: "pdf/bleed",
    covers: [...PDF, "FMT-EXPORT-015"],
    doc: "shapes",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
    pageProps: { bl: 12 },
  },
  {
    id: "pdf/selection-custom-bg",
    covers: [...PDF, "FMT-EXPORT-026"],
    doc: "shapes",
    target: "Oval",
    format: "pdf",
    settings: { size: "96dpi" },
    background: { color: "C#[255,255,0]", opacity: 1 },
  },
];
