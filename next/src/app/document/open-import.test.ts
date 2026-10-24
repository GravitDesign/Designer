import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage, StorageItem } from "../storage/storage.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { registerDocumentDialogs } from "./document-host.ts";
import { setHeicConverterLoader } from "../../io/import/heic.ts";
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

vi.mock("../../io/import/eps/eps-import.ts", () => ({
  EPSImport: {
    // Never draws: the import only offers its cancel, which reports the
    // "File loading is canceled." message like the real one.
    import: (...args: unknown[]) => {
      const errorCallback = args[4] as (message: string) => void;
      const cancelHandler = args[6] as (cancel: () => void) => void;
      cancelHandler(() => errorCallback("File loading is canceled."));
    },
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

describe("opening a HEIC that can't be converted (BUG-108)", () => {
  it("fails the load with the error-reading-file message", async () => {
    setHeicConverterLoader(() => Promise.resolve(() => Promise.reject(new Error("bad HEIC"))));
    try {
      expect(await open("photo.heic", "HEIC")).toEqual([DocumentStatus.LoadFailed]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^Can’t open file/);
    } finally {
      setHeicConverterLoader(null);
    }
  });
});

describe("cancelling an EPS import (BUG-113)", () => {
  it("fails the load after the cancel message", () => {
    const statuses: number[] = [];
    const calls: string[] = [];
    let cancel: (() => void) | null = null;
    const context: OpenImportContext = {
      document: {},
      updateStatus: (status) => statuses.push(status),
      setTitle: () => {},
      setScene: () => {},
      preProcessFonts: () => calls.push("pre"),
      postProcessFonts: () => calls.push("post"),
      initCancelHandler: (handler) => {
        cancel = handler;
      },
    };
    openImportedFile(context, new NamedItem("shapes.eps"), "EPS", new Uint8Array(4), {
      progress: null,
    });
    expect(statuses).toEqual([]);
    (cancel as unknown as () => void)();
    expect(messages).toEqual(["File loading is canceled."]);
    expect(statuses).toEqual([DocumentStatus.LoadFailed]);
    expect(calls).toEqual(["pre", "post"]);
  });
});
