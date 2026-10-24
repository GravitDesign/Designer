import { afterEach, describe, expect, it } from "vitest";
import { setLateModules } from "../shell/late.ts";
import { documentDialogs } from "./document-host.ts";

afterEach(() => setLateModules({}));

describe("documentDialogs (module 163)", () => {
  it("opens the app's message and missing-fonts dialogs", () => {
    const opened: unknown[][] = [];
    const done = (): void => {};
    setLateModules({
      "dialogs/message-dialog.ts": {
        MessageDialog: class {
          constructor(...args: unknown[]) {
            opened.push(["message", ...args]);
          }
          open(): void {
            opened.push(["open"]);
          }
        },
      },
      "dialogs/missing-fonts-dialog.ts": {
        MissingFontsDialog: class {
          constructor(...args: unknown[]) {
            opened.push(["missing fonts", ...args]);
          }
          open(): void {
            opened.push(["open"]);
          }
        },
      },
    });
    const document = {};
    documentDialogs().message("The file can't be loaded.");
    documentDialogs().missingFonts(document, ["Helvetica"], done);
    // jQuery .html() of an error object showed nothing.
    documentDialogs().message(new Error("Invalid PDF structure") as unknown as string);
    expect(opened).toEqual([
      ["message", "The file can't be loaded.", undefined],
      ["open"],
      ["missing fonts", document, ["Helvetica"], null, done],
      ["open"],
      ["message", "", undefined],
      ["open"],
    ]);
  });
});
