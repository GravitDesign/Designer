// Test setup shared by the text editor and inline text editor tests: a
// scene whose font manager has Open Sans loaded, a text in it, a stand-in
// for the scene's GEditor and one for the editor widget.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Transform } from "../../engine/math/transform.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import {
  FontManager,
  QueryFontFamilyEvent,
  type ResolveFontEvent,
} from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { Text } from "../../engine/text/text.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import { TextEditor } from "./text-editor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../public/assets/font");

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const FONTS: [string, string, number, string][] = [
  ["Open Sans", "N", 400, "OpenSans-Regular.ttf"],
  ["Open Sans", "N", 700, "OpenSans-Bold.ttf"],
  ["Open Sans", "I", 400, "OpenSans-Italic.ttf"],
];

let fontCache: OpenTypeFont[] | null = null;

function fonts(): OpenTypeFont[] {
  if (!fontCache) {
    fontCache = FONTS.map(
      ([family, style, weight, file]) =>
        OpenTypeFont.create(family, style, weight, readFont(file)) as OpenTypeFont,
    );
  }
  return fontCache;
}

/** What the text editors call on GEditor, recorded. */
export class FakeEditor {
  calls: unknown[][] = [];
  undo = false;
  redo = false;
  listeners = new Set<unknown>();
  events: unknown[] = [];
  beginTransaction(): void {
    this.calls.push(["begin"]);
  }
  commitTransaction(name: unknown): void {
    this.calls.push(["commit", name]);
  }
  hasUndoState(): boolean {
    return this.undo;
  }
  undoState(): void {
    this.calls.push(["undo"]);
  }
  hasRedoState(): boolean {
    return this.redo;
  }
  redoState(): void {
    this.calls.push(["redo"]);
  }
  deleteSelection(noTransaction: unknown): void {
    this.calls.push(["deleteSelection", noTransaction]);
  }
  closeInlineEditor(): void {
    this.calls.push(["closeInlineEditor"]);
  }
  requestInvalidation(): void {}
  hasEventListeners(type: unknown): boolean {
    return this.listeners.has(type);
  }
  trigger(event: unknown): void {
    this.events.push(event);
  }
}

export interface TextSetup {
  scene: Scene;
  text: Text;
  editor: TextEditor;
  host: FakeEditor;
  fontManager: FontManager;
}

/**
 * A text with `content` in a fresh scene, its editor attached (content
 * sync on) and selected. `variants` answers QueryFontFamilyEvent.
 */
export function textSetup(
  content: string,
  variants?: { style: string; weight: number }[],
): TextSetup {
  const workspace = new Workspace();
  const fontManager = workspace.getFontManager() as FontManager;
  for (const font of fonts()) fontManager._fonts.push(font);
  fontManager.setDefaultFont(fonts()[0] as OpenTypeFont);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  if (variants) {
    fontManager.addEventListener(QueryFontFamilyEvent, (event: QueryFontFamilyEvent) => {
      event.callback(variants);
    });
  }
  const scene = new Scene(workspace);
  const host = new FakeEditor();
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const text = new Text();
  text.setProperty("trf", new Transform(1, 0, 0, 1, 100, 100));
  (scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>).appendChild(text);
  text.setText(content);
  const editor = new TextEditor(text as never);
  editor._attach();
  return { scene, text, editor, host, fontManager };
}

/** A stand-in for the editor widget the inline editor runs in. */
export class FakeView {
  cursor: unknown = null;
  focused = true;
  capturing = false;
  listeners: [unknown, unknown][] = [];
  constructor(private readonly scene: Scene) {}
  getScene(): Scene {
    return this.scene;
  }
  getWorldTransform(): Transform {
    return new Transform();
  }
  hasFocus(): boolean {
    return this.focused;
  }
  setCursor(cursor: unknown): void {
    this.cursor = cursor;
  }
  addEventListener(type: unknown, listener: unknown): void {
    this.listeners.push([type, listener]);
  }
  removeEventListener(type: unknown, listener: unknown): void {
    this.listeners = this.listeners.filter(([t, l]) => t !== type || l !== listener);
  }
  startCaptureInput(): void {}
  isCapturingInput(): boolean {
    return this.capturing;
  }
  endCaptureInput(): void {}
  updateInputBox(): void {}
  resetInputBoxContent(): void {}
  asWidget(): EditorWidget {
    return this as unknown as EditorWidget;
  }
}
