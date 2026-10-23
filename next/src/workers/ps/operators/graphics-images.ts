// Old: public/pscore.js, systemdict imagecolor, image, pstack, imagemask.
//
// image decodes the samples itself and posts the pixels as RGBA (or
// CMYK + alpha) with "drawImage", without JSON cloning, as a
// Uint8ClampedArray.
import { BitsReader, type PSCore } from "../core.ts";
import type { PSDict, PSPlainRecord, PSValue } from "../objects.ts";
import { colorHelper, type Valued } from "./graphics-support.ts";

/** A data source BitsReader can read: a file, string or procedure. */
type DataSource = ConstructorParameters<typeof BitsReader>[0];

/** A file with init (filters size their output with it). */
interface InitializableSource {
  init(size: number, rgbaOutput: boolean): void;
}

/** The colorspace family image and imagemask key the pixel layout on. */
function baseColorSpace(colorSpace: PSValue[]): unknown {
  let family: unknown = (colorSpace[0] as unknown as Valued).value;
  if (family == "DeviceN" || family == "Separation") {
    const alternative = colorSpace[2] as unknown as Valued;
    // Sic: a name alternative yields the name object itself, which never
    // compares equal to "DeviceCMYK"; only an array alternative is read.
    family =
      typeof alternative.value == "string"
        ? alternative
        : ((alternative.value as PSValue[])[0] as unknown as Valued).value;
  }
  return family;
}

/** Calls init on sources that have it (`"init" in source`, which throws on primitives). */
function initSource(source: PSValue, size: number, rgbaOutput: boolean): void {
  if ("init" in (source as object))
    (source as unknown as InitializableSource).init(size, rgbaOutput);
}

export const imageOperators = {
  /** Sic: not implemented; drops its operands. */
  imagecolor(this: PSCore) {
    const name = "imagecolor";
    if (this.stackunderflowCheck(7, name)) return;
    if (typeof this.stack[this.stack.length - 1] == "number") {
      const count = this.stack.pop() as number;
      this.stack.pop();
      if (!this.stackunderflowCheck(count + 4, name)) {
        for (let i = 0; i < count; ++i) this.stack.pop();
        this.stack.pop();
        this.stack.pop();
        this.stack.pop();
        this.stack.pop();
      }
    } else this.initiateError("typecheck", name);
  },

  image(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const color = colorHelper(this);
    let interleaveType: unknown = 0;
    let channels = 0;
    let reader: BitsReader | null = null;
    let outputWidth: unknown;
    let outputHeight: unknown;
    let multipleSources: unknown = false;
    let width: number;
    let height: number;
    let bitsPerComponent: number;
    let imageMatrix: unknown;
    let source: PSValue;
    let colorSpace: PSValue[];
    let decode: number[] | undefined;
    let family: unknown;
    let sourceReaders: BitsReader[] = [];
    let maskReader: BitsReader | undefined;
    let maskWidth = 0;
    let maskHeight = 0;
    let maskXScale = 1;
    let maskYScale = 1;
    if (this.classes.isPSObject(this.stack[this.stack.length - 1], "dict")) {
      const imageDict = this.stack.pop() as PSDict;
      const imageType = imageDict.value.ImageType;
      const dataDict = imageType == 3 ? (imageDict.value.DataDict as PSDict) : imageDict;
      const entries: PSPlainRecord = dataDict.value;
      width = entries.Width as number;
      height = entries.Height as number;
      bitsPerComponent = entries.BitsPerComponent as number;
      imageMatrix = (entries.ImageMatrix as unknown as Valued).value;
      source = entries.DataSource;
      if (!source) {
        this.initiateError("typecheck");
        return;
      }
      colorSpace = this.gstate.colorSpace;
      decode = (entries.Decode as unknown as Valued).value as number[];
      outputWidth = width;
      outputHeight = height;
      if ("MultipleDataSources" in entries)
        multipleSources = (entries.MultipleDataSources as unknown as Valued).value;
      if (imageType == 3 && width && height) {
        const maskDict = imageDict.value.MaskDict as PSDict;
        interleaveType = imageDict.value.InterleaveType;
        maskWidth = maskDict.value.Width as number;
        maskXScale = width == maskWidth ? 1 : maskWidth / width;
        maskHeight = maskDict.value.Height as number;
        maskYScale = height == maskHeight ? 1 : maskHeight / height;
        // The old code read the mask's ImageMatrix and dropped it.
        void (maskDict.value.ImageMatrix as unknown as Valued).value;
        const maskSource = maskDict.value.DataSource;
        if (!maskSource) {
          this.initiateError("typecheck");
          return;
        }
        maskReader = new BitsReader(maskSource as unknown as DataSource);
      }
      channels = color.getColorChannelsCount(colorSpace);
      family = baseColorSpace(colorSpace);
      if (multipleSources) {
        const sources = (source as unknown as Valued).value as PSValue[];
        if (multipleSources && sources.length != channels) {
          this.initiateError("typecheck");
          return;
        }
        sourceReaders = [];
        for (let i = 0; i < channels; ++i)
          sourceReaders.push(new BitsReader(sources[i] as unknown as DataSource));
      } else {
        const byteCount =
          bitsPerComponent == 8
            ? width * height * channels
            : Math.ceil((width * height * channels * bitsPerComponent) / 8);
        if (family == "DeviceRGB" && bitsPerComponent == 8)
          initSource(source, width * height * 4, true);
        else initSource(source, byteCount, false);
        reader = new BitsReader(source as unknown as DataSource);
      }
    } else {
      if (this.stackunderflowCheck(5)) return;
      source = this.stack.pop();
      imageMatrix = (this.stack.pop() as unknown as Valued).value;
      bitsPerComponent = this.stack.pop() as number;
      height = this.stack.pop() as number;
      width = this.stack.pop() as number;
      colorSpace = [this.classes.newObject("name", "DeviceGray")];
      family = "DeviceGray";
      decode = [0, 1];
      channels = 1;
      outputWidth = width;
      outputHeight = height;
      const byteCount =
        bitsPerComponent == 8
          ? width * height * channels
          : Math.ceil((width * height * channels * bitsPerComponent) / 8);
      if (!source) {
        this.initiateError("typecheck");
        return;
      }
      initSource(source, byteCount, false);
      reader = new BitsReader(source as unknown as DataSource);
    }
    const isCMYK = family == "DeviceCMYK";
    const pixelSize = isCMYK ? 5 : 4;
    let sample: number[] | null = null;
    const readSample = (): number[] | null => {
      const values: number[] = [];
      for (let i = 0; i < channels; ++i) {
        const value = multipleSources
          ? (sourceReaders[i] as BitsReader).readBits(bitsPerComponent)
          : (reader as BitsReader).readBits(bitsPerComponent);
        if (value == null) return null;
        values.push(value);
      }
      return values;
    };
    if (!(width && height && outputWidth && outputHeight)) return;
    color.imageColorCache = {};
    const pixelCount = (outputWidth as number) * (outputHeight as number);
    const pixels = new Uint8ClampedArray(pixelSize * pixelCount);
    let mask: Uint8ClampedArray | undefined;
    if (interleaveType == 3) {
      const maskCount = maskWidth * maskHeight;
      mask = new Uint8ClampedArray(maskCount);
      for (let i = 0; i < maskCount; ++i) mask[i] = (maskReader as BitsReader).readBits(1);
    }
    const maxSample = Math.round(Math.pow(2, bitsPerComponent) - 1);
    if (!decode || decode.length != 2 * channels) {
      decode = [];
      for (let i = 0; i < channels; ++i) {
        decode[2 * i] = 0;
        decode[2 * i + 1] = 1;
      }
    }
    let offset = 0;
    for (let row = 0; row < height; ++row) {
      for (let column = 0; column < width && (sample = readSample()) != null; ++column) {
        sample = color.imageColorProcess(sample, colorSpace, decode, maxSample);
        let channel: number;
        for (channel = 0; channel < pixelSize - 1; ++channel)
          pixels[offset + channel] = sample[channel] as number;
        if (interleaveType == 3) {
          let maskColumn = Math.round(column * maskXScale);
          if (maskColumn >= maskWidth) maskColumn = maskWidth - 1;
          let maskRow = Math.round(row * maskYScale);
          if (maskRow >= maskHeight) maskRow = maskHeight - 1;
          pixels[offset + channel] =
            ((mask as Uint8ClampedArray)[maskRow * width + maskColumn] as number) > 0 ? 255 : 0;
        } else pixels[offset + channel] = 255;
        offset += pixelSize;
      }
      if (sample == null) break;
    }
    color.imageColorCache = {};
    color.imageColorCacheHit = 0;
    color.imageColorCacheFail = 0;
    this.toGravit(
      "drawImage",
      [
        outputWidth,
        outputHeight,
        pixels,
        imageMatrix,
        this.gstate.CTM,
        this.gstate.clippingPath,
        isCMYK,
      ],
      null,
      false,
    );
  },

  pstack() {},

  imagemask(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    let outputWidth: unknown;
    let outputHeight: unknown;
    let invert: unknown = false;
    const colorSpace = this.gstate.colorSpace;
    const family = baseColorSpace(colorSpace);
    let width: number;
    let height: number;
    let imageMatrix: unknown;
    let source: PSValue;
    if (this.classes.isPSObject(this.stack[this.stack.length - 1], "dict")) {
      const maskDict = this.stack.pop() as PSDict;
      width = maskDict.value.Width as number;
      height = maskDict.value.Height as number;
      imageMatrix = (maskDict.value.ImageMatrix as unknown as Valued).value;
      source = maskDict.value.DataSource;
      if (((maskDict.value.Decode as unknown as Valued).value as PSValue[])[0]) invert = true;
      outputWidth = width;
      outputHeight = height;
    } else {
      if (this.stackunderflowCheck(5)) return;
      source = this.stack.pop();
      imageMatrix = (this.stack.pop() as unknown as Valued).value;
      invert = (this.stack.pop() as unknown as Valued).value;
      height = this.stack.pop() as number;
      width = this.stack.pop() as number;
      outputWidth = width;
      outputHeight = height;
    }
    const byteCount = Math.ceil((width * height) / 8);
    if (!source) {
      this.initiateError("typecheck");
      return;
    }
    initSource(source, byteCount, false);
    const reader = new BitsReader(source as unknown as DataSource);
    const isCMYK = family == "DeviceCMYK";
    const pixelSize = isCMYK ? 5 : 4;
    const color = colorHelper(this);
    color._getGColor(this.gstate.colorSpace, this.gstate.color);
    // Sic: the old code tested `typeof color != "array"`, which is always
    // true, so the mask is always painted white (or CMYK zero).
    const paint = isCMYK ? [0, 0, 0, 0] : [255, 255, 255];
    if (!(width && height && outputWidth && outputHeight)) return;
    color.imageColorCache = {};
    const pixelCount = (outputWidth as number) * (outputHeight as number);
    const pixels = new Uint8ClampedArray(pixelSize * pixelCount);
    let offset = 0;
    for (let i = 0; i < pixelCount; ++i) {
      let channel: number;
      for (channel = 0; channel < pixelSize - 1; ++channel)
        pixels[offset + channel] = paint[channel] as number;
      const bit = reader.readBits(1);
      pixels[offset + channel] = !bit && invert ? 0 : 255;
      offset += pixelSize;
    }
    color.imageColorCache = {};
    color.imageColorCacheHit = 0;
    color.imageColorCacheFail = 0;
    this.toGravit(
      "drawImage",
      [
        outputWidth,
        outputHeight,
        pixels,
        imageMatrix,
        this.gstate.CTM,
        this.gstate.clippingPath,
        isCMYK,
      ],
      null,
      false,
    );
  },
} satisfies Record<string, PSValue>;
