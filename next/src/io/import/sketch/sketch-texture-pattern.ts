// Old: chunk.vendor.js module 1132 (pattern/sketchtexturepattern).
import { equals } from "../../../engine/core/util.ts";
import { TexturePattern } from "../../../engine/style/texture-pattern.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import type { SketchFillData } from "./sketch-data.ts";
import { SketchPattern } from "./sketch-pattern.ts";

/** Sketch's patternFillType: 0 tile, 1 fill, 2 stretch, 3 fit. */
const SCALE_MODES = [
  TexturePattern.ScaleMode.Tile,
  TexturePattern.ScaleMode.Fill,
  TexturePattern.ScaleMode.Stretch,
  TexturePattern.ScaleMode.Fit,
];

/** "%PDF" */
const PDF_MAGIC = [37, 80, 68, 70];

/**
 * Renders page 1 of a PDF (as a data URL) at scale 1 and answers a PNG
 * data URL. The old code used pdf.js (getDocument, getPage, render into a
 * canvas); pdf.js belongs to the PDF importer, which sets this. While it
 * is null, a PDF image fill keeps the placeholder texture.
 */
export type PdfPageRenderer = (dataUrl: string) => Promise<string>;

/**
 * An image fill: a texture pattern that starts with a 1x1 placeholder and
 * gets the image from the zip once it is read (PDF images are rendered to
 * a bitmap first).
 */
export class SketchTexturePattern extends SketchPattern<SketchFillData> {
  static DefaultTexture =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==";

  /** See PdfPageRenderer. */
  static pdfRenderer: PdfPageRenderer | null = null;

  declare _texturePattern: TexturePattern | null;

  override parse(): void {
    this._texturePattern = new TexturePattern(SketchTexturePattern.DefaultTexture);
    this._texturePattern.setTileSize(this._data.patternTileScale as number);
    const mode = SCALE_MODES[this._data.patternFillType as number] as string;
    this._texturePattern.setScaleMode(mode);
    (TexturePattern.ScaleSettings[mode] as (texture: TexturePattern) => void)(this._texturePattern);
    void this._getReference((this._data.image as { _ref: string })._ref).then((blob) => {
      const reader = new window.FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        const headerLength = (/^data:.{0,255};base64,/i.exec(result) as RegExpExecArray)[0].length;
        const start = result.substring(headerLength, headerLength + 10);
        const binary = window.atob(start);
        let magic: Uint8Array;
        try {
          magic = Uint8Array.from(binary, (c) => c.charCodeAt(0)).slice(0, 4);
        } catch {
          return;
        }
        if (equals(Array.from(magic), PDF_MAGIC)) {
          const render = SketchTexturePattern.pdfRenderer;
          if (render)
            void render(result).then((png) => {
              (this._texturePattern as TexturePattern).setTexture(png);
            });
        } else (this._texturePattern as TexturePattern).setTexture(result);
      };
    });
  }

  override applyTo(layer: SceneNodeLike): void {
    layer.setProperty("_pt", this._texturePattern);
  }
}

SketchTexturePattern.prototype._texturePattern = null;
