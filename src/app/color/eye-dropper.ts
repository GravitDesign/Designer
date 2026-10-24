// Old: designer.browser.dev.js module 1698 ($.fn.gEyeDropper).
/**
 * The eye dropper button: a click starts picking a pixel of the active
 * view's canvas. While it picks, a loupe (`.g-eye-dropper-picker`, on
 * body) follows the mouse and shows the pixel under it; a mouse down
 * anywhere ends it and fires a bubbling "colorchange" CustomEvent on the
 * button with `detail = [rgba]` (the 0-255 pixel, see pattern-target.ts
 * onPatternEvent). Escape ends it without a pick. In touch mode the loupe
 * is dragged instead (drag-helper.ts) and lifting the finger picks.
 *
 *     const dropper = new EyeDropper(button, { onClick: () => ... });
 *     onPatternEvent(button, "colorchange", (event, rgba) => use(rgba));
 *     dropper.setActive(true, pageX, pageY);   // the shortcut opens it at the cursor
 */
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { ToolChangedEvent } from "../../editor/tools/tool-manager.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { css, cssAll } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { DragHelper } from "./drag-helper.ts";
import { triggerPatternEvent } from "./pattern-target.ts";

export interface EyeDropperOptions {
  /** Replaces the click statistic (the field passes its own). */
  onClick?: (() => void) | null;
}

/** What the old plugin kept in $(el).data("g-eye-dropper"). */
interface EyeDropperState {
  picker: HTMLElement | null;
  documentMove: ((event: { pageX: number; pageY: number }) => void) | null;
  documentMouseDown: ((event: MouseEvent) => void) | null;
  documentKeyDown: ((event: KeyboardEvent) => void) | null;
  rgba: Uint8ClampedArray | null;
  currentColor?: string;
  draggablePoint?: DragHelper;
}

const LOUPE_SIZE = 135;
const droppers = new WeakMap<Element, EyeDropper>();

function hex2(text: string): string {
  return 1 == text.length ? "0" + text : text;
}

export class EyeDropper {
  /** The eye dropper set up on an element ($(el).data("g-eye-dropper")). */
  static of(element: Element): EyeDropper | null {
    return droppers.get(element) || null;
  }

  readonly element: HTMLElement;
  private readonly _state: EyeDropperState = {
    picker: null,
    documentMove: null,
    documentMouseDown: null,
    documentKeyDown: null,
    rgba: null,
  };

  /** `$(el).gEyeDropper(options)`. */
  constructor(element: HTMLElement, options: EyeDropperOptions = {}) {
    this.element = element;
    droppers.set(element, this);
    element.classList.add("g-button");
    element.setAttribute(
      "data-title",
      Locale.get(new LocaleKey("GEyeDropper", "text.tooltip")) as string,
    );
    const icon = document.createElement("span");
    icon.classList.add("gravit-icon-picker");
    element.appendChild(icon);
    element.addEventListener("click", (event) => {
      if (element.closest(".g-disabled")) return;
      if (options.onClick) options.onClick.call(element);
      else designer().stats("eyedropper_click_pick");
      event.stopPropagation();
      event.preventDefault();
      this.setActive(!this.isActive(), event.pageX, event.pageY);
    });
  }

  isActive(): boolean {
    return !!this._state.picker;
  }

  /**
   * `gEyeDropper("setValue", v)`: remembers the field's current paint (a
   * CSS background or a pattern) for the loupe's "current" preview. The
   * old code also looked for that preview inside the button, where it
   * never is (the loupe is on body), so only the remembered value counts.
   */
  setValue(value: string | Pattern | null): void {
    const background = "string" == typeof value ? value : Pattern.asCSSBackground(value);
    for (const current of this.element.querySelectorAll(
      ".g-eye-dropper-preview-color-difference .current",
    ))
      css(current as HTMLElement, "background", background);
    this._state.currentColor = background;
  }

  /** Starts (at the page point, when given) or ends picking. */
  setActive(active: boolean, pageX?: number, pageY?: number): void {
    if (active === this.isActive()) return;
    const state = this._state;
    const app = designer();
    // A new function on every call, so the removal in the else branch
    // never finds the one the start added; that one removes itself on the
    // next tool change, taking the loupe with it (the dropper stays
    // active without it). See "Eye dropper on a tool change" in QUESTIONS.md.
    const onToolChanged = () => {
      app.getToolManager().removeEventListener(ToolChangedEvent, onToolChanged, this);
      for (const picker of document.querySelectorAll(".g-eye-dropper-picker")) picker.remove();
    };
    if (active) {
      const activeWindow = app.getWindows().getActiveWindow();
      if (!activeWindow) return;
      this.element.classList.add("g-active");
      const source = (activeWindow.getView() as EditorWidget)
        .getSceneCanvas()
        .getBitmap()
        .getHTMLElement(true);
      const dpi = PaintCanvas.getScreenDPI();
      const loupe = document.createElement("canvas");
      loupe.setAttribute("width", String(LOUPE_SIZE));
      loupe.setAttribute("height", String(LOUPE_SIZE));
      loupe.classList.add("g-cursor-pixel", "g-eye-dropper-preview");
      const label = document.createElement("span");
      label.classList.add("g-eye-dropper-preview-color");
      const difference = document.createElement("span");
      difference.classList.add("g-eye-dropper-preview-color-difference");
      const currentPreview = document.createElement("div");
      currentPreview.classList.add("color-preview", "current");
      // Old: .css({ background: undefined }) wrote nothing.
      if (state.currentColor !== undefined) css(currentPreview, "background", state.currentColor);
      const newPreview = document.createElement("div");
      newPreview.classList.add("color-preview", "new");
      difference.append(currentPreview, newPreview);
      const pointer = document.createElement("div");
      pointer.classList.add("g-eye-dropper-color-pointer");
      const context = loupe.getContext("2d") as CanvasRenderingContext2D;
      const smoothing = [
        "imageSmoothingEnabled",
        "webkitImageSmoothingEnabled",
        "mozImageSmoothingEnabled",
      ];
      for (let n = 0; n < smoothing.length; ++n) {
        const name = smoothing[n] as string;
        if (Object.prototype.hasOwnProperty.call(CanvasRenderingContext2D.prototype, name)) {
          (context as unknown as Record<string, boolean>)[name] = false;
          break;
        }
      }
      const picker = document.createElement("div");
      picker.classList.add("g-eye-dropper-picker", "g-cursor-pixel");
      picker.append(loupe, label, difference, pointer);
      document.body.appendChild(picker);
      state.picker = picker;

      // Shows the pixel at x, y (page coordinates, used as view coordinates).
      const preview = (x: number, y: number) => {
        context.setTransform(1, 0, 0, 1, 0, 0);
        if (activeWindow.viewContainsMouse(x, y)) {
          let sourceX = x * dpi;
          let sourceY = y * dpi;
          sourceX = Math.max(0, Math.min(sourceX, source.width));
          sourceY = Math.max(0, Math.min(sourceY, source.height));
          const pixel = (source.getContext("2d") as CanvasRenderingContext2D).getImageData(
            sourceX,
            sourceY,
            1,
            1,
          ).data;
          let hex =
            hex2((pixel[0] as number).toString(16)) +
            hex2((pixel[1] as number).toString(16)) +
            hex2((pixel[2] as number).toString(16));
          hex = hex.toUpperCase();
          state.rgba = pixel;
          const ring = app.isTouchEnabled() ? 10 : 5;
          css(
            loupe,
            "box-shadow",
            "0 0 0 ".concat(String(ring), "px rgb(") +
              pixel[0] +
              "," +
              pixel[1] +
              "," +
              pixel[2] +
              ")",
          );
          label.textContent = "R:" + pixel[0] + " G:" + pixel[1] + " B:" + pixel[2] + " #" + hex;
          cssAll(label, { display: "block", top: y + 5 + "px", left: x - 55 + "px" });
          css(newPreview, "background", "#" + hex);
          cssAll(pointer, { display: "block", top: y - 5 + "px", left: x - 5 + "px" });
          cssAll(difference, { display: "block", top: y - 76 + "px", left: x - 78 + "px" });
          context.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
          context.drawImage(source, x * dpi - 8, y * dpi - 8, 16, 16, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
        } else {
          state.rgba = null;
          css(loupe, "box-shadow", "");
          css(label, "display", "none");
          css(difference, "display", "none");
          pointer.setAttribute("style", "display: none !important");
          context.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
          context.fillStyle = "rgba(0,0,0,0.75)";
          context.scale(0.9, 0.9);
          context.fillText(
            Locale.get(new LocaleKey("GEyeDropper", "text.preview")) as string,
            10,
            72,
            LOUPE_SIZE,
          );
        }
      };

      if (app.isTouchEnabled()) {
        state.draggablePoint = new DragHelper(
          loupe,
          (position) => {
            const rect = loupe.getBoundingClientRect();
            let left = position.pageX;
            let top = position.pageY;
            left -= rect.width - 8;
            top -= rect.height - 30;
            left += 8;
            top += 8;
            cssAll(loupe, { left: left + "px", top: top + "px" });
            const moved = loupe.getBoundingClientRect();
            preview(moved.left + moved.width / 2, moved.top + moved.height / 2);
          },
          () => {
            this.setActive(false);
            if (state.rgba) triggerPatternEvent(this.element, "colorchange", [state.rgba]);
          },
        );
      }
      state.documentMove = (event) => {
        if (app.isTouchEnabled()) return;
        const x = event.pageX;
        const y = event.pageY;
        const rect = loupe.getBoundingClientRect();
        const left = x - rect.width / 2 + 8;
        const top = y - rect.height / 2 + 8;
        cssAll(loupe, { left: left + "px", top: top + "px" });
        preview(x, y);
      };
      state.documentMouseDown = () => {
        if (app.isTouchEnabled()) {
          if (this.isActive()) this.setActive(false);
          else this.setActive(true);
        } else {
          this.setActive(false);
          if (state.rgba) triggerPatternEvent(this.element, "colorchange", [state.rgba]);
        }
      };
      state.documentKeyDown = (event) => {
        if (Key.translateKey(event.keyCode) === Key.Constant.ESC) this.setActive(false);
      };
      if ("number" == typeof pageX && "number" == typeof pageY) {
        if (app.isTouchEnabled()) (state.draggablePoint as DragHelper).moveTo(pageX, pageY, true);
        else state.documentMove({ pageX, pageY });
      }
      document.addEventListener("keydown", state.documentKeyDown);
      document.addEventListener("mousedown", state.documentMouseDown);
      document.addEventListener("mousemove", state.documentMove);
      app.getToolManager().addEventListener(ToolChangedEvent, onToolChanged, this);
    } else {
      if (state.documentKeyDown) document.removeEventListener("keydown", state.documentKeyDown);
      if (state.documentMouseDown)
        document.removeEventListener("mousedown", state.documentMouseDown);
      if (state.documentMove)
        document.removeEventListener(
          "mousemove",
          state.documentMove as unknown as (event: Event) => void,
        );
      app.getToolManager().removeEventListener(ToolChangedEvent, onToolChanged, this);
      (state.picker as HTMLElement).remove();
      state.picker = null;
      state.documentKeyDown = null;
      state.documentMouseDown = null;
      state.documentMove = null;
      if (state.draggablePoint) state.draggablePoint.unmount();
      this.element.classList.remove("g-active");
    }
  }
}
