import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage, StorageItem } from "../storage/storage.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { registerDocumentDialogs } from "./document-host.ts";
import { DocumentStatus } from "./document-status.ts";
import type { OpenImportContext } from "./open-import.ts";

const importer = vi.hoisted(() => ({ error: null as unknown }));

vi.mock("../../io/import/pdf/pdf-import.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PDFImport: {
    updateFontFamilies: () => {},
    import: (_data: unknown, _options: unknown, _fonts: unknown, callback: (e: unknown) => void) =>
      setTimeout(() => callback(importer.error), 0),
  },
}));

vi.mock("../fonts/font-manager.ts", () => ({
  FontsProviderManager: {
    getInstance: () => ({ query: (answer: (r: { faces: [] }) => void) => answer({ faces: [] }) }),
  },
}));

const { openImportedFile } = await import("./open-import.ts");

class NamedItem extends StorageItem {
  constructor(private readonly name: string) {
    super(new Storage());
  }

  override getFullName(): string {
    return this.name;
  }
}

const messages: string[] = [];

beforeEach(() => {
  messages.length = 0;
  registerDocumentDialogs({ message: (text) => messages.push(text) });
  setDesigner({
    getWorkspace: () => ({ getFontManager: () => ({}) }),
    getWindows: () => ({ getActiveWindow: () => null }),
    getSetting: (_key: string, value: unknown) => value,
  } as never);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  resetGlobals();
  vi.restoreAllMocks();
});

/** Opens `name` and returns the statuses the document was given. */
async function open(name: string, extension: string): Promise<number[]> {
  const statuses: number[] = [];
  const context: OpenImportContext = {
    document: {},
    updateStatus: (status) => statuses.push(status),
    setTitle: () => {},
    setScene: () => {},
    preProcessFonts: () => {},
    postProcessFonts: () => {},
    initCancelHandler: () => {},
  };
  openImportedFile(context, new NamedItem(name), extension, new Uint8Array(4), { progress: null });
  await vi.waitFor(() => expect(statuses.length).toBeGreaterThan(0));
  return statuses;
}

describe("opening a PDF that pdf.js can't open (BUG-102)", () => {
  it("fails the load with the error-reading-file message", async () => {
    importer.error = new Error("Invalid PDF structure.");
    expect(await open("broken.pdf", "PDF")).toEqual([DocumentStatus.LoadFailed]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^Can’t open file/);
  });
});
