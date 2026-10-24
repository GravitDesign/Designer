// Old: designer.browser.dev.js module 1266 (GImageProperties).
/**
 * The image row: replace, original size, crop and palette buttons, the
 * extracted palette swatches below, and the colour profile status in the
 * appearance toolbar. Shown when exactly one inspected element is an
 * image (other elements next to it don't count, as before; see "Image
 * panel ignores other elements" in QUESTIONS.md).
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Color } from "../../engine/color/color.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Util } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Image } from "../../engine/scene/image.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { PatternTarget } from "../color/pattern-target.ts";
import type { Document } from "../document/document.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../../editor/editor.ts";
import { designer } from "../shell/globals.ts";
import { ColorThief, type ColorThiefSource } from "./color-thief.ts";
import { cropImage, replaceImage, setOriginSize } from "./image-crop.ts";
import { el, Properties, propertyRow, text, type InspectedElements } from "./properties.ts";

type ImageStatusEvent = InstanceType<typeof Image.StatusEvent>;
type ImageConvertStatusEvent = InstanceType<typeof Image.ConvertStatusEvent>;

/** The data("no-crop") of the crop button. */
const noCropOf = new WeakMap<Element, boolean>();

function flatButton(icon: string): HTMLButtonElement {
  const button = el("button", "g-flat");
  button.style.padding = "0px";
  button.appendChild(el("span", icon));
  return button;
}

export class ImageProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _image: Image | null = null;
  _controls: HTMLElement | null = null;

  override init(panel: HTMLElement, controls: HTMLElement): void {
    this._panel = panel;
    this._controls = controls;
    const status = el("div", "g-image-convert-status");
    status.style.display = "none";
    status.style.fontSize = "8px";
    const statusText = el("span");
    statusText.textContent = text("GImageProperties", "text.checking-profile") + "...";
    status.appendChild(statusText);
    controls.appendChild(status);

    const replace = flatButton("gravit-icon-replaceimg");
    replace.addEventListener("click", () => {
      replaceImage(this._image, this._document as Document);
      designer().stats("image_replace_image");
    });
    const reset = el("button", "g-flat");
    reset.style.padding = "0px";
    reset.setAttribute("data-action", "reset-size");
    reset.appendChild(el("span", "gravit-icon-expand"));
    reset.addEventListener("click", () => {
      setOriginSize(this._image);
      designer().stats("image_reset_size");
    });
    const crop = el("button");
    crop.setAttribute("data-action", "handle-crop");
    crop.classList.add("g-flat");
    crop.style.padding = "0px";
    crop.appendChild(el("span", "gravit-icon-crop"));
    crop.addEventListener("click", () => {
      const button = panel.querySelector('button[data-action="handle-crop"]');
      cropImage(this._image, button ? noCropOf.get(button) : undefined);
      designer().stats("image_change_croptype");
    });
    const palette = el("button");
    palette.setAttribute("data-image-palette", "button");
    palette.classList.add("g-flat");
    palette.style.padding = "0px";
    palette.appendChild(el("span", "gravit-icon-extract-colors"));
    palette.addEventListener("click", () => this._updateImagePalette());

    const row = el("div", "image-button-row");
    propertyRow(row, {
      columns: [
        { label: text("GImageProperties", "action.replace"), width: "25%", content: replace },
        { label: text("GImageProperties", "action.original-size"), width: "25%", content: reset },
        {
          label: text("GImageProperties", "action.no-crop"),
          labelClass: "crop-label",
          width: "25%",
          content: crop,
        },
        { label: text("GCommonNames", "text.colors"), width: "25%", content: palette },
      ],
    });
    panel.appendChild(row);
    const swatches = el("div");
    swatches.setAttribute("data-image-palette", "palette");
    swatches.style.height = "27px";
    swatches.style.margin = "5px 10px 0px";
    panel.appendChild(swatches);
  }

  _updateImagePalette(): void {
    designer().stats("image_update_palette");
    const image = this._image as Image;
    const source = (image.getImage() || image.getImageCanvas()) as ColorThiefSource | null;
    const panel = this._panel as HTMLElement;
    const target = panel.querySelector<HTMLElement>(
      '[data-image-palette="palette"]',
    ) as HTMLElement;
    target.replaceChildren();
    const add = (color: RGBColor) => {
      const swatch = el("div");
      new PatternTarget(swatch, { allowDrop: false }).types([Color]).value(color);
      swatch.style.display = "inline-block";
      swatch.style.height = "100%";
      swatch.style.width = "12.5%";
      swatch.style.background = Pattern.asCSSBackground(color);
      target.appendChild(swatch);
    };
    if (source) {
      target.style.setProperty("display", "");
      for (const button of panel.querySelectorAll<HTMLButtonElement>(
        '[data-image-palette="button"]',
      ))
        button.disabled = true;
      const thief = new ColorThief();
      let dominant: number[] | null = null;
      try {
        dominant = thief.getColor(source);
      } catch {
        console.warn("Cannot extract image palette");
      }
      const first = dominant ? new RGBColor(dominant) : RGBColor.BLACK;
      add(first);
      let colors: number[][] | null = null;
      try {
        colors = thief.getPalette(source, 16);
      } catch {
        console.warn("Cannot extract image palette");
      }
      let count = 1;
      if (colors)
        for (let d = 0; d < colors.length; ++d) {
          const color = new RGBColor(colors[d] as number[]);
          if (!Util.equals(color, first)) {
            add(color);
            if (++count >= 8) break;
          }
        }
    }
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      const scene = this._document.getScene() as Scene;
      scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
      scene.removeEventListener(Image.StatusEvent, this._imageStatus, this);
      scene.removeEventListener(Image.ConvertStatusEvent, this._imageConvertStatus, this);
      this._document = null;
    }
    this._image = null;
    if (document) {
      const list = elements as InspectedElements;
      for (let n = 0; n < list.length; ++n) {
        const element = list[n];
        if (element instanceof Image) {
          if (this._image) {
            this._image = null;
            break;
          }
          this._image = element;
        }
      }
      if (this._image) {
        this._document = document;
        const scene = document.getScene() as Scene;
        scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        scene.addEventListener(Image.StatusEvent, this._imageStatus, this);
        scene.addEventListener(Image.ConvertStatusEvent, this._imageConvertStatus, this);
        this._updateProperties();
        return true;
      }
    }
    for (const status of (this._controls as HTMLElement).querySelectorAll<HTMLElement>(
      ".g-image-convert-status",
    ))
      status.style.setProperty("display", "none");
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (!event.temporary && this._image && this._image === event.node) this._updateProperties();
  }

  _imageStatus(event: ImageStatusEvent): void {
    if (
      event.image === this._image &&
      (event.status === Image.ImageStatus.Error || event.status === Image.ImageStatus.Loaded)
    )
      this._updateProperties();
  }

  _imageConvertStatus(event: ImageConvertStatusEvent): void {
    this._updateConvertStatus(event.status);
  }

  _updateConvertStatus(status: number | null): void {
    let message: string | undefined;
    switch (status) {
      case Image.ConvertStatus.Checking:
        message = text("GImageProperties", "text.check-profile") + "...";
        break;
      case Image.ConvertStatus.Converting:
        message = text("GImageProperties", "text.loading-profile") + "...";
    }
    const controls = this._controls as HTMLElement;
    if (message)
      for (const span of controls.querySelectorAll(".g-image-convert-status > span"))
        span.textContent = message;
    for (const element of controls.querySelectorAll<HTMLElement>(".g-image-convert-status"))
      element.style.setProperty("display", message ? "" : "none");
  }

  _updateProperties(): void {
    const image = this._image as Image;
    image.getProperty("url");
    image.getStatus();
    const ready = image.isReady();
    const bbox = image.getGeometryBBox();
    const width = bbox ? bbox.getWidth() : 0;
    const height = bbox ? bbox.getHeight() : 0;
    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();
    const active = designer().getActiveDocument();
    if (active) {
      const detail = (active.getEditor() as Editor).hasSelectionDetail();
      const panel = this._panel as HTMLElement;
      for (const button of panel.querySelectorAll<HTMLButtonElement>(
        'button[data-action="reset-size"]',
      ))
        button.disabled =
          !ready || (GMath.isEqualEps(imageWidth, width) && GMath.isEqualEps(imageHeight, height));
      for (const button of panel.querySelectorAll('button[data-action="handle-crop"]'))
        noCropOf.set(button, detail);
      for (const label of panel.querySelectorAll(".crop-label"))
        label.textContent =
          Locale.get(
            new LocaleKey("GImageProperties", detail ? "action.no-crop" : "action.crop"),
          ) ?? "";
      for (const button of panel.querySelectorAll<HTMLButtonElement>(
        '[data-image-palette="button"]',
      )) {
        button.disabled = !ready;
        button.style.setProperty("display", "");
      }
      for (const swatches of panel.querySelectorAll<HTMLElement>('[data-image-palette="palette"]'))
        swatches.style.setProperty("display", "none");
      this._updateConvertStatus(image.getConvertStatus());
    }
  }

  override toString(): string {
    return "[Object GImageProperties]";
  }
}
