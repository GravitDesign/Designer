// Old: chunk.vendor.js module 1139 (model/sketchsymbolinstance).
import { extend, find } from "../../../engine/core/util.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image, type ImageStatusEvent } from "../../../engine/scene/image.ts";
import { getClassFromName } from "./class-registry.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import { SketchBase, type SketchLayerClass } from "./sketch-base.ts";
import type {
  SketchFileReferenceData,
  SketchLayerData,
  SketchOverridesData,
} from "./sketch-data.ts";
import { SketchNode } from "./sketch-node.ts";
import { SketchRect } from "./sketch-rect.ts";
import type { SketchSymbolMaster } from "./sketch-symbol-master.ts";
import { SketchText } from "./sketch-text.ts";

/**
 * A symbol instance: a group with copies of the master's layers, scaled
 * from the master's frame to the instance's and rotated like the
 * instance. Overrides replace texts, image fills and nested symbols in
 * the master copy before it is appended.
 */
export class SketchSymbolInstance extends SketchBase {
  /** Parses a master (or a replacement layer) without progress events. */
  static _parseShape(shape: SketchBase): void {
    try {
      shape._file.blockEvents();
      shape.parse();
    } finally {
      shape._file.releaseEvents();
    }
  }

  declare _symbol: SceneNodeLike | null;
  declare _symbolMaster: SketchSymbolMaster | null | undefined;

  override parse(): void {
    super.parse();
    this._symbolMaster = this._file.getSymbolMaster(this.getSymbolId());
    if (this._symbolMaster) {
      if (this._data.overrides) {
        if (this._data.overrides.symbolID)
          this._symbolMaster = this._file.getSymbolMaster(this._data.overrides.symbolID as string);
        SketchSymbolInstance._parseShape(this._symbolMaster as SketchBase);
        this._resolveOverride(this._symbolMaster as SketchBase, this._data.overrides);
      } else SketchSymbolInstance._parseShape(this._symbolMaster);
    }
  }

  /**
   * Applies `overrides` (by object id) to the parsed `master`. Numeric keys
   * hold the old nested format and are applied recursively.
   */
  _resolveOverride(master: SketchBase, overrides: SketchOverridesData): void {
    Object.keys(overrides).forEach((key) => {
      if (!isNaN(key as unknown as number)) {
        this._resolveOverride(master, overrides[key] as SketchOverridesData);
        return;
      }
      if ("symbolID" === key) return;
      const target = master.findSymbol(key);
      if (!target) {
        console.warn("Could not find symbol instance: #" + key);
        return;
      }
      const value = overrides[key];
      if ("string" == typeof value && target instanceof SketchText) target.setText(value);
      else if (
        "object" == typeof value &&
        "MSJSONFileReference" === (value as SketchFileReferenceData)._class
      ) {
        if ("MSImageData" === (value as SketchFileReferenceData)._ref_class) {
          const data = extend({}, target.getData()) as SketchLayerData;
          if (data.style && data.style.fills) {
            const fill = find(data.style.fills, (candidate) => !!candidate.image);
            if (fill) {
              fill.image = value as SketchFileReferenceData;
              const cls = getClassFromName<SketchLayerClass>(data._class);
              if (cls) {
                const layer = new cls(data, master._file, master);
                SketchSymbolInstance._parseShape(layer);
                master.replaceChild(target, layer);
              }
            } else console.warn("Could not find fill: #" + key);
          } else console.warn("Could not find fills: #" + key);
        } else
          console.warn(
            "Could not resolve class: #" + String((value as SketchFileReferenceData)._ref_class),
          );
      } else {
        const data = extend({}, target.getData()) as SketchLayerData;
        data.overrides = extend(data.overrides || {}, overrides[key]) as SketchOverridesData;
        if (undefined !== data.overrides.symbolID) {
          data.symbolID = data.overrides.symbolID as string;
          delete data.overrides.symbolID;
        }
        if (data.symbolID && data.symbolID.trim().length) {
          const instance = new SketchSymbolInstance(data, master._file, master);
          instance.parse();
          master.replaceChild(target, instance);
        } else master.replaceChild(target, null);
      }
    });
  }

  override appendTo(target: SceneNodeLike): void {
    if (!this._symbolMaster) return;
    const symbol = sceneNode(new Group());
    this._symbol = symbol;
    symbol.setProperty("name", this._data.name);
    symbol.setProperty("vis", this._data.isVisible);
    symbol.setProperty("lkt", this._data.isLocked);
    symbol.__sketchNode__ = this;
    this._symbolMaster.getChildren().forEach((child) => {
      child.appendTo(symbol);
    });
    // The status test can never be true (Loaded and Error at once), so
    // every image gets the listener.
    symbol.accept((node) => {
      if (
        node instanceof Image &&
        !(
          node.getStatus() === Image.ImageStatus.Loaded &&
          node.getStatus() === Image.ImageStatus.Error
        )
      )
        node.addEventListener(Image.StatusEvent, this._imageStatusEvent, this);
    });
    if (!this._hasImagesToResolve()) this._transform();
    target.appendChild(symbol);
  }

  _hasImagesToResolve(): boolean {
    let pending = false;
    (this._symbol as SceneNodeLike).accept((node) => {
      if (
        node instanceof Image &&
        node.getStatus() !== Image.ImageStatus.Loaded &&
        node.getStatus() !== Image.ImageStatus.Error
      ) {
        pending = true;
        return true;
      }
      return undefined;
    });
    return pending;
  }

  /**
   * Transforms the nodes in `node` that came from Sketch layers, undoing
   * the scale for layers that don't resize with the symbol. Nothing calls
   * it.
   */
  _transformChildren(node: SceneNodeLike, transform: Transform): void {
    for (let child = node.getFirstChild(); child; child = child.getNext()) {
      const layer = child.__sketchNode__ as SketchBase | undefined;
      if (layer) {
        let copy = Transform.deserialize(Transform.serialize(transform));
        let sx = 1;
        let sy = 1;
        const scale = (
          copy.decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>
        ).scale.getMatrix();
        if (!layer.hasResizeFlag(SketchBase.ResizeFlag.Width) && !(layer instanceof SketchText))
          sx = 1 / (scale[0] as number);
        if (!layer.hasResizeFlag(SketchBase.ResizeFlag.Height) && !(layer instanceof SketchText))
          sy = 1 / (scale[3] as number);
        if (1 !== sx || 1 !== sy) {
          const corner = (this._getGeometryBBox() as Rect).getSide(Rect.Side.TOP_LEFT);
          copy = copy
            .translated(-corner.getX(), -corner.getY())
            .scaled(sx, sy)
            .translated(corner.getX(), corner.getY());
        }
        if (child instanceof Group) this._transformChildren(child, copy);
        else child.transform(copy);
      }
    }
  }

  /**
   * Scales the group from the master's frame onto the instance's, then
   * rotates it; with a vertical scale, pinned layers of the master move by
   * how much their offset in their parent scaled.
   */
  _transform(): void {
    const symbol = this._symbol as SceneNodeLike;
    if (symbol.getGeometryBBox()) {
      const masterBox = (this._symbolMaster as SketchSymbolMaster)._getGeometryBBox() as Rect;
      const scale = SketchRect.getTransformation(masterBox, this._getGeometryBBox() as Rect);
      const current = symbol.getTransform();
      const transform = current ? current.multiplied(scale) : scale;
      symbol.transform(transform);
      symbol.transform(this._getTransformation());
      const sy = scale.getMatrix()[3] as number;
      if (1 !== sy)
        (this._symbolMaster as SketchSymbolMaster).accept((layer) => {
          if (
            layer instanceof SketchNode &&
            layer.getResizingType() === SketchBase.ResizingType.PinToCorner
          ) {
            const offset =
              (layer._getGeometryBBox() as Rect).getY() -
              ((layer.getParent() as SketchBase)._getGeometryBBox() as Rect).getY();
            const shift = offset - offset * sy;
            layer.transform(new Transform().translated(0, shift));
          }
        });
    }
  }

  _imageStatusEvent(event: ImageStatusEvent): void {
    if (event.status === Image.ImageStatus.Loaded || event.status === Image.ImageStatus.Error) {
      (event.image as Image).removeEventListener(Image.StatusEvent, this._imageStatusEvent, this);
      if (!this._hasImagesToResolve()) this._transform();
    }
  }

  override clone(): this {
    const copy = super.clone();
    copy._symbolMaster = this._file.getSymbolMaster(this.getSymbolId());
    copy.parse();
    return copy;
  }
}

SketchSymbolInstance.prototype._symbol = null;
SketchSymbolInstance.prototype._symbolMaster = null;
