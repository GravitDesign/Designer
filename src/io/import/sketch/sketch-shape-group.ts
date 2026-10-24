// Old: chunk.vendor.js module 1213 (model/sketchshapegroup).
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { extend } from "../../../engine/core/util.ts";
import { VertexPolyBoolean } from "../../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { VertexSourceMixin } from "../../../engine/geometry/vertex-source.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Group } from "../../../engine/scene/group.ts";
import { NodeChange } from "../../../engine/scene/node-change.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import { SketchBase } from "./sketch-base.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import { SketchElement } from "./sketch-element.ts";
import { SketchNode } from "./sketch-node.ts";

/** Sketch's booleanOperation values 0..3 (-1, none, counts as 3). */
const OPERATIONS = [
  VertexPolyBoolean.OR,
  VertexPolyBoolean.SUB,
  VertexPolyBoolean.AND,
  VertexPolyBoolean.XOR,
];

const CHILD_CHANGES = [
  NodeChange.BeforeChildRemove,
  NodeChange.AfterChildRemove,
  NodeChange.BeforeChildInsert,
  NodeChange.AfterChildInsert,
];

function blockEvents(node: SceneNodeLike): void {
  node._beginBlockCompositeEvents(true, true);
  node._beginBlockChanges(CHILD_CHANGES);
}

function releaseEvents(node: SceneNodeLike): void {
  node._endBlockCompositeEvents(true, true);
  node._endBlockChanges(CHILD_CHANGES);
}

/**
 * A shape group. With one layer it hands the group's style, visibility,
 * lock, name, constraints and winding rule to that layer and only adds the
 * group's rotation and flips after appending. With several layers it
 * merges their paths into one compound shape with the boolean operations
 * of the layers.
 */
export class SketchShapeGroup extends SketchBase {
  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    const style = this._data.style;
    const visible = this._data.isVisible;
    const locked = this._data.isLocked;
    const name = this._data.name;
    const constraint = this._data.resizingConstraint;
    const windingRule = this._data.windingRule;
    (this._data.layers as SketchLayerData[]).forEach((layer) => {
      if (!this.isCompoundShape()) {
        layer.style = extend(layer.style || {}, style) as SketchLayerData["style"];
        layer.isVisible = visible;
        layer.isLocked = locked;
        layer.name = name;
        layer.resizingConstraint = constraint;
        layer.windingRule = windingRule;
      }
    });
    super.parse(flag, executor);
  }

  isCompoundShape(): boolean {
    return (this._data.layers as SketchLayerData[]).length > 1;
  }

  /** A single shape takes the clipped layers itself. */
  override _clip(shapes: SketchBase[]): void {
    if (this.isCompoundShape()) super._clip(shapes);
    else {
      const children = this.getChildren();
      if (children.length) (children[0] as SketchBase)._clip(shapes);
    }
  }

  override appendTo(target: SceneNodeLike, executor?: AsyncExecutor | null): void {
    const transformation = this._getTransformation();
    if (!this.isCompoundShape()) {
      super.appendTo(target, executor);
      return;
    }
    const layers = this.getChildren()
      .slice()
      .filter((child) => child instanceof SketchNode && !!child.getNode()) as SketchNode[];
    const nodes = layers.map((layer) => layer.getNode());
    const operations = layers.map((layer) => layer._data.booleanOperation);
    let mixed = false;
    let first: number | null = null;
    nodes.forEach((_node, index) => {
      let operation = operations[index];
      if (undefined === operation || -1 === operation) operation = 3;
      // Compared with null: union is 0, and the old truthiness test let the
      // next operation replace a first union ("Sketch boolean groups that
      // start with a union are merged with one operation" in BUGS-FIXED.md).
      if (first !== null) {
        if (first !== operation) mixed = true;
      } else first = operation;
    });
    let merged: SceneNodeLike | null = null;
    if (mixed) {
      for (let i = 0; i < nodes.length; i++) {
        let right = nodes[i] as SceneNodeLike;
        let left = merged;
        let operation = operations[i];
        if (!left && i < nodes.length - 1) {
          left = nodes[++i] as SceneNodeLike;
          operation = operations[i];
          const swap = right;
          right = left;
          left = swap;
        }
        if (undefined === operation || -1 === operation) operation = 3;
        const op = OPERATIONS[operation];
        if (null !== op) {
          const a = left as SceneNodeLike;
          try {
            blockEvents(a);
            blockEvents(right);
            merged = this._merge(op, [a, right]);
          } finally {
            releaseEvents(a);
            releaseEvents(right);
          }
        } else console.warn("Unsupported boolean operation: #" + operation);
      }
    } else merged = this._merge(OPERATIONS[operations.shift() as number], nodes);
    const result = merged as SceneNodeLike;
    result.setProperty("evenodd", this.isEvenOdd());
    const data = extend({}, this._data) as SketchLayerData;
    data.noTransform = true;
    delete data.layers;
    new SketchElement(data, this._file, null, result).parse();
    result.transform(transformation);
    target.appendChild(result);
  }

  override _postAppendTo(): void {
    if (!this.isCompoundShape()) this.transform(this._getTransformation());
  }

  /** The vertex sources in `node`, looking into groups and compound shapes. */
  _getValidItems(node: SceneNodeLike): SceneNodeLike[] {
    let items: SceneNodeLike[] = [];
    if (node instanceof Group || node instanceof CompoundShape) {
      for (let child = node.getFirstChild(); null !== child; child = child.getNext())
        items = items.concat(this._getValidItems(child));
    } else if (node.hasMixin(VertexSourceMixin) && node.validateInsertion(new CompoundShape()))
      items.push(node);
    return items;
  }

  /** The editor's boolean merge: one compound shape with `operation` as each part's `bool`. */
  _merge(operation: number | undefined, nodes: SceneNodeLike[]): SceneNodeLike {
    let commonParent: SceneNodeLike | null | undefined;
    const compound = sceneNode(new CompoundShape());
    let items: SceneNodeLike[] = [];
    let sameParent = true;
    nodes.forEach((node) => {
      items = items.concat(this._getValidItems(node));
      if (
        node.hasMixin(VertexSourceMixin) &&
        node.validateInsertion(compound) &&
        node.getParent() instanceof CompoundShape
      ) {
        if (commonParent) {
          if (commonParent !== node.getParent()) sameParent = false;
        } else commonParent = node.getParent();
      } else sameParent = false;
    });
    if (items.length > 1) {
      const last = items[items.length - 1] as SceneNodeLike;
      let parent = last.getParent();
      let next = last.getNext();
      if (sameParent) {
        while (parent instanceof Group) {
          next = parent.getNext();
          parent = parent.getParent();
        }
      } else {
        while (parent instanceof Group || parent instanceof CompoundShape) {
          next = parent.getNext();
          parent = parent.getParent();
        }
      }
      if (parent) parent.insertChild(compound, next);
      try {
        compound.beginUpdate();
        compound.setProperty("evenodd", (items[0] as SceneNodeLike).getProperty("evenodd"));
        if (items[0] instanceof Text) {
          const text = items[0] as SceneNodeLike;
          if (
            !(
              text.getPaintLayers() as NonNullable<ReturnType<SceneNodeLike["getPaintLayers"]>>
            ).getFillLayers(true).length &&
            text.getProperty("_fc")
          ) {
            const layers = compound.getPaintLayers() as NonNullable<
              ReturnType<SceneNodeLike["getPaintLayers"]>
            >;
            layers.clearFillLayers();
            const fc = text.getProperty("_fc");
            const color = "string" == typeof fc ? RGBColor.fromCSSColor(fc) : fc;
            layers.appendChild(
              new Stylable.FillPaintLayer(color as RGBColor) as unknown as SceneNodeLike,
            );
          }
        }
        const inCompound: SceneNodeLike[] = [];
        const others: SceneNodeLike[] = [];
        commonParent = null;
        items.forEach((item) => {
          if (item.getParent() instanceof CompoundShape) {
            inCompound.push(item);
            if (!commonParent) commonParent = item.getParent();
          } else others.push(item);
        });
        items = inCompound.concat(others);
        items.forEach((item) => {
          let parent = item.getParent();
          if (
            !(parent && commonParent && parent === commonParent) &&
            !(parent instanceof CompoundShape && operation === VertexPolyBoolean.OR)
          )
            item.setProperty("bool", operation);
          if (parent) parent.removeChild(item);
          // Drop the groups and compound shapes the move left empty.
          while (
            (parent instanceof Group || parent instanceof CompoundShape) &&
            !parent.getFirstChild()
          ) {
            const empty: SceneNodeLike = parent;
            parent = parent.getParent();
            if (parent) parent.removeChild(empty);
          }
          compound.appendChild(item);
        });
      } finally {
        compound.endUpdate();
      }
    }
    return compound;
  }
}
