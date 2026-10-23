// Old: chunk.vendor.js module 796 (model/sketchbase).
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform, type TransformDecomposition } from "../../../engine/math/transform.ts";
import { getClassFromName } from "./class-registry.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import type { SketchFile } from "./sketch-file.ts";
import { SketchParser } from "./sketch-parser.ts";
import { SketchRect } from "./sketch-rect.ts";

/** The constructor every layer class shares (registry lookups create layers through it). */
export type SketchLayerClass = new (
  data: SketchLayerData,
  file: SketchFile,
  parent: SketchBase | null,
  node?: SceneNodeLike,
) => SketchBase;

/**
 * A layer and its child layers. Parsing creates the importer object for
 * every child (by `_class`), parses them, then lets a clipping mask take
 * the layers after it; appending puts the scene nodes into a container.
 * With an executor both run in frame-sized slices.
 */
export class SketchBase extends SketchParser<SketchLayerData> {
  static ResizingType = {
    Stretch: 0,
    PinToCorner: 1,
  };

  static ResizeFlag = {
    Width: 2,
    Height: 16,
  };

  static WindingRule = {
    NonZero: 0,
    EvenOdd: 1,
  };

  declare _shapes: SketchBase[];
  declare _id: string | null | undefined;
  declare _symbolId: string | null | undefined;
  declare _parent: SketchBase | null;

  constructor(data: SketchLayerData, file: SketchFile, parent: SketchBase | null) {
    super(data, file);
    this._parent = parent;
  }

  isEvenOdd(): boolean {
    return (
      undefined === this._data.windingRule ||
      this._data.windingRule === SketchBase.WindingRule.EvenOdd
    );
  }

  getParent(): SketchBase | null {
    return this._parent;
  }

  /** The layer with object id `id` among the children, else deeper down. */
  findSymbol(id: string): SketchBase | undefined {
    const children = this.getChildren();
    const count = children.length;
    let found: SketchBase | undefined;
    for (let i = 0; i < count; i++) {
      if ((children[i] as SketchBase).getId() === id) {
        found = children[i];
        break;
      }
    }
    if (!found)
      for (let i = 0; i < count && !(found = (children[i] as SketchBase).findSymbol(id)); i++);
    return found;
  }

  /**
   * Meant to put `replacement` (or nothing) in the place of `child`. The
   * old test is inverted (QUESTIONS.md "Sketch symbol override
   * replaceChild test is inverted"): when `child` is not among the
   * direct children, the first child is replaced; when it is, the search
   * goes on in the children and usually replaces nothing.
   */
  replaceChild(child: SketchBase, replacement: SketchBase | null): boolean | undefined {
    const found = this.getChildren().some((candidate) => candidate.getId() === child.getId());
    if (!found) {
      // The index was never set, and splice(undefined, ...) starts at 0.
      if (replacement) this.getChildren().splice(0, 1, replacement);
      else this.getChildren().splice(0, 1);
      return true;
    }
    const children = this.getChildren();
    const count = children.length;
    for (let i = 0; i < count; i++) {
      if ((children[i] as SketchBase).replaceChild(child, replacement)) return true;
    }
    return undefined;
  }

  hasResizeFlag(flag: number): boolean {
    return 0 != ((this._data.resizingConstraint || 0) & flag);
  }

  getResizingType(): number | undefined {
    return this._data.resizingType;
  }

  getData(): SketchLayerData {
    return this._data;
  }

  getId(): string | null | undefined {
    return this._id;
  }

  getSymbolId(): string | null | undefined {
    return this._symbolId;
  }

  override parse(_flag?: unknown, executor?: AsyncExecutor | null): void {
    this._shapes = [];
    const data = this._data;
    this._id = data.do_objectID;
    this._symbolId = data.symbolID;
    this._file.addObject(this);
    if (this._data.layers) {
      this._data.layers.forEach((layer) => {
        layer.parent = data;
        const cls = getClassFromName<SketchLayerClass>(layer._class);
        if (cls) this._shapes.push(new cls(layer, this._file, this));
      });
    }
    const parseChild = (shape: SketchBase): void => {
      try {
        shape.parse(null, executor);
      } catch (error) {
        console.log(error);
      }
    };
    if (this._shapes.length) {
      if (executor) executor.execute(this._shapes, parseChild, this._postParse.bind(this));
      else {
        this._shapes.forEach(parseChild);
        this._postParse();
      }
    } else this._postParse();
  }

  /** A child with a clipping mask takes every layer after it. */
  _postParse(flag?: unknown): void {
    void flag;
    const children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as SketchBase;
      if (child.hasClippingMask()) {
        child._clip(children.splice(i + 1, children.length));
        return;
      }
    }
  }

  _clip(shapes: SketchBase[]): void {
    this._shapes = this._shapes.concat(shapes);
  }

  getChildren(): SketchBase[] {
    return this._shapes;
  }

  hasClippingMask(): boolean {
    return !!this._data.hasClippingMask;
  }

  transform(transform: Transform | null | undefined): void {
    this._shapes.forEach((shape) => {
      shape.transform(transform);
    });
  }

  setBounds(bounds: Rect | undefined): void {
    this._shapes.forEach((shape) => {
      shape.setBounds(bounds);
    });
  }

  /**
   * The layer's frame moved by the origins of the frames of all its
   * ancestors (the visitor never stops the walk early).
   */
  _getGeometryBBox(): Rect | undefined {
    let box: Rect | undefined;
    this.visitReferences((data) => {
      if (data.frame) {
        const frame = SketchRect.parse(data.frame);
        box = box ? box.translated(frame.getX(), frame.getY()) : frame;
      }
      return undefined;
    });
    return box;
  }

  /** Unit square to frame, with the layer's rotation and flips about the frame's centre. */
  _getTransform(): Transform {
    let sx = 1;
    let sy = 1;
    const angle = -(this._data.rotation || 0);
    if (this._data.isFlippedHorizontal) sx = -1;
    if (this._data.isFlippedVertical) sy = -1;
    const rotateFlip = new Transform().rotated(GMath.toRadians(angle)).scaled(sx, sy);
    const box = this._getGeometryBBox() as Rect;
    const center = box.getSide(Rect.Side.CENTER);
    return Transform.getNativeRectTransformation(box)
      .translated(-center.getX(), -center.getY())
      .multiplied(rotateFlip)
      .translated(center.getX(), center.getY());
  }

  /** The rotation, skew and flips of _getTransform about the frame's centre, without its size. */
  _getTransformation(): Transform {
    const parts = this._getTransform().decomposed() as TransformDecomposition;
    const center = (this._getGeometryBBox() as Rect).getSide(Rect.Side.CENTER);
    const scale = parts.scale.getMatrix();
    const flips = parts.scale.scaled(
      1 / Math.abs(scale[0] as number),
      1 / Math.abs(scale[3] as number),
    );
    return new Transform()
      .translated(-center.getX(), -center.getY())
      .multiplied(parts.skew.multiplied(parts.rotate).multiplied(flips))
      .translated(center.getX(), center.getY());
  }

  /** Calls `visitor` with the layer's data, then its parents', until it returns something truthy. */
  visitReferences(visitor: (data: SketchLayerData) => unknown): void {
    let stop = visitor(this._data);
    let parent = this._data.parent;
    while (parent && !stop) {
      stop = visitor(parent);
      parent = parent.parent;
    }
  }

  override clone(): this {
    const copy = super.clone();
    copy._id = this._id;
    copy._symbolId = this._symbolId;
    copy._parent = this._parent;
    const shapes: SketchBase[] = [];
    this._shapes.forEach((shape) => {
      shapes.push(shape.clone());
    });
    copy._shapes = shapes;
    return copy;
  }

  accept(visitor: (layer: SketchBase) => unknown): void {
    visitor(this);
    this._shapes.forEach((shape) => {
      shape.accept(visitor);
    });
  }

  appendTo(target: SceneNodeLike, executor?: AsyncExecutor | null): void {
    const append = (shape: SketchBase): void => {
      shape.appendTo(target, executor);
    };
    if (executor) executor.execute(this._shapes, append, this._postAppendTo.bind(this));
    else this._shapes.forEach(append);
  }

  _postAppendTo(): void {}
}

// Shared until parse() gives the layer its own list, as on the old prototype.
SketchBase.prototype._shapes = [];
SketchBase.prototype._id = null;
SketchBase.prototype._symbolId = null;
SketchBase.prototype._parent = null;
