// Old: designer.browser.dev.js module 1154 (downloads, data URLs, file
// names, the ACV curve reader).
import { sanitizeFilename } from "../../io/export/sanitize-filename.ts";
import { containerOrNull, designerOrNull } from "../shell/globals.ts";

/** GUtil.sanitizeFilename (ADD-EXPORT-001); the exporter's copy is the one implementation. */
export { sanitizeFilename };

/** What a download needs of the active document. */
interface DownloadDocument {
  getExtension(): string | null;
  getTitle(): string;
  store(item: unknown, done: unknown, fail: unknown, options: unknown): unknown;
}

/** What a download needs of the container. */
interface DownloadContainer {
  getStorage(): { download(name: string, done: (item: unknown) => void): unknown } | null;
  download(file: {
    buffer: ArrayBuffer | string;
    name: string;
    extension: string;
    mime?: unknown;
  }): void;
}

/**
 * Downloads the active document as "<title or Design>.<extension>" (its
 * own extension by default) through the container's storage. False when
 * there is no designer, document, container or storage.
 */
export function downloadActiveFile(
  extension: string | null = null,
  options: Record<string, unknown> = {},
): boolean {
  const designer = designerOrNull() as unknown as {
    getActiveDocument(): DownloadDocument | null;
  } | null;
  if (!designer) return false;
  const document = designer.getActiveDocument();
  if (!document) return false;
  const container = containerOrNull() as unknown as DownloadContainer | null;
  if (!container) return false;
  const storage = container.getStorage();
  if (!storage) return false;
  extension = extension || document.getExtension();
  const name = "".concat(document.getTitle() || "Design", ".").concat(String(extension));
  storage.download(name, (item) => {
    document.store(item, console.log, console.error, options);
  });
  return true;
}

/** Hands data (a Blob, a string or a buffer) to the container's download. */
export function downloadDataURI(
  data: Blob | string | ArrayBuffer,
  name: string,
  extension: string,
  mime?: BlobPropertyBag | string,
): void {
  const send = (buffer: ArrayBuffer | string): void => {
    (containerOrNull() as unknown as DownloadContainer).download({ buffer, name, extension, mime });
  };
  if (data instanceof Blob) {
    const reader = new FileReader();
    reader.onloadend = () => {
      send(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(data);
  } else if ("string" == typeof data) {
    // Sic: the MIME type was passed as the Blob options.
    downloadDataURI(new Blob([data], mime as BlobPropertyBag), name, extension, mime);
  } else send(data);
}

/**
 * A data URL as a Blob. A URL without ";base64," keeps its data as text;
 * invalid base64 gives an empty Blob of the type.
 */
export function dataUrlToBlob(url: string): Blob {
  if (!/^data:.{0,255};base64,/i.exec(url)) {
    const parts = url.split(",");
    const type = (parts[0] as string).split(":")[1];
    const data = parts[1] as string;
    return new Blob([data], { type });
  }
  const parts = url.split(";base64,");
  const type = (parts[0] as string).split(":")[1];
  let binary: string;
  try {
    binary = atob(parts[1] as string);
  } catch {
    binary = "";
  }
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; ++i) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** The curves of an ACV file: [input, output] points per channel. */
export interface AcvCurves {
  rgb: [number, number][];
  r: [number, number][];
  g: [number, number][];
  b: [number, number][];
}

/**
 * Reads a Photoshop curves (.acv) file (ADD-IMPORT-001), big-endian: the
 * 4-byte header, then the composite curve (its first point stored as
 * [0, output], its input skipped), then the red, green and blue curves.
 * Each point is stored as output then input.
 */
export function readACVFile(buffer: ArrayBuffer): AcvCurves {
  const view = new DataView(buffer);
  let offset = 0;
  const uint16 = (): number => {
    const value = view.getUint16(offset);
    offset += 2;
    return value;
  };
  const curves: AcvCurves = { rgb: [], r: [], g: [], b: [] };
  offset = 4;
  let count = uint16();
  const channels = ["r", "g", "b"] as const;
  curves.rgb.push([0, uint16()]);
  offset = offset + 2;
  for (let i = 1; i < count; i++) {
    const output = uint16();
    const input = uint16();
    curves.rgb.push([input, output]);
  }
  for (let c = 0; c < 3; c++) {
    count = uint16();
    const curve = curves[channels[c] as "r" | "g" | "b"];
    for (let i = 0; i < count; i++) {
      const output = uint16();
      const input = uint16();
      curve.push([input, output]);
    }
  }
  return curves;
}
