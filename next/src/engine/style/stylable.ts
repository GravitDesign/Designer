// Old: chunk.vendor.js module 28 (GStylable).
/**
 * The style mixin: style properties grouped in property sets, paint layers
 * (fills and borders) and effects. Elements get it through
 * GElement.Stylable (element-stylable.ts), shared styles (GStyle) directly.
 *
 * Paint layers and effects are child containers outside the node tree:
 * created on first use, parented to the stylable node, and saved in its
 * blob as `_layers` / `_eff`, or only their multi-reference ids
 * (`_layId` / `_effId`) while they are empty.
 *
 * The old GStylable was a GObject subclass used as a mixin; its statics
 * (PropertySet, PaintLayer, Effects, ...) hang off the mixin here.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import { equals, uuid } from "../core/util.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Node } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import type { PropertiesChangeArgs, PropertiesNode } from "../scene/node-properties.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { NodeBlob, RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { BorderPaintLayer } from "./border-paint-layer.ts";
import { Effect } from "./effect.ts";
import { Effects } from "./effects.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import { PaintLayer } from "./paint-layer.ts";
import { PaintLayers } from "./paint-layers.ts";
import {
  AllGeometryProperties,
  AllVisualProperties,
  BorderAlignment,
  BorderMarker,
  ParagraphAlignment,
  PropertySet,
  PropertySetInfo,
  StyleLayer,
  StyleLayerName,
  TextTransformation,
  TypographyScript,
  type PropertySetDescription,
} from "./stylable-sets.ts";

/** The changes assignStyleFrom blocks with `blockChildChanges`. */
const CHILD_CHANGES = [
  NodeChange.BeforeChildRemove,
  NodeChange.AfterChildRemove,
  NodeChange.BeforeChildInsert,
  NodeChange.AfterChildInsert,
];

/** Any node with the style mixin, as other styles see it. */
export interface StylableNode extends PropertiesNode {
  getStylePropertySets(): string[];
  getEffects(): Effects | null;
  getPaintLayers(): PaintLayers | null;
}

/** The border properties getStyleBorderPadding reads. */
interface BorderLike {
  $_ba: string;
  $_bw: number;
}

const body = <TBase extends AnyConstructor<PropertiesNode>>(Base: TBase) => {
  abstract class StylableMixin extends Base {
    declare _effects: Effects | null;
    declare _paintLayers: PaintLayers | null;
    declare _layId: string | null;
    declare _effId: string | null;

    /** The property sets this node has; elements have all but text. */
    getStylePropertySets(): string[] {
      return [
        PropertySet.Style,
        PropertySet.BorderPaintLayers,
        PropertySet.FillPaintLayers,
        PropertySet.Effects,
      ];
    }

    /** The effects container, created on first use; null without the Effects set. */
    getEffects(): Effects | null {
      if (this.getStylePropertySets().indexOf(PropertySet.Effects) >= 0) {
        if (!this._effects) {
          this._effects = new Effects();
          this._effects._multiReferenceId = this._effId || uuid();
          this._effects._setParent(this as never);
        }
        return this._effects;
      }
      return null;
    }

    /** The paint layers container, created on first use; null without a paint layer set. */
    getPaintLayers(): PaintLayers | null {
      if (
        this.getStylePropertySets().indexOf(PropertySet.BorderPaintLayers) >= 0 ||
        this.getStylePropertySets().indexOf(PropertySet.FillPaintLayers) >= 0
      ) {
        if (!this._paintLayers) {
          this._paintLayers = new PaintLayers();
          this._paintLayers._multiReferenceId = this._layId || uuid();
          this._paintLayers._setParent(this as never);
        }
        return this._paintLayers;
      }
      return null;
    }

    /**
     * Copies the property sets both nodes have from `source`: fills and
     * borders as clones, effects as clones, and the set properties (all
     * but `_sdf`). `blockChildChanges` keeps the containers from reporting
     * each child.
     */
    assignStyleFrom(source: StylableNode, blockChildChanges?: boolean): void {
      const sourceSets = source.getStylePropertySets();
      const ownSets = this.getStylePropertySets();
      const sets: string[] = [];
      for (let i = 0; i < sourceSets.length; ++i) {
        const set = sourceSets[i] as string;
        for (let j = 0; j < ownSets.length; ++j) {
          if (ownSets[j] === set) {
            sets.push(set);
            break;
          }
        }
      }
      if (!sets.length) return;
      const fills = sets.indexOf(PropertySet.FillPaintLayers) >= 0;
      const borders = sets.indexOf(PropertySet.BorderPaintLayers) >= 0;
      if (fills || borders) {
        const layers = this.getPaintLayers() as PaintLayers;
        const sourceLayers = source.getPaintLayers();
        let changing = false;
        if (blockChildChanges) layers._beginBlockChanges(CHILD_CHANGES);
        try {
          const removed: Node[] = [];
          for (let child = layers.getFirstChild(); null !== child; child = child.getNext()) {
            if (
              (child instanceof FillPaintLayer && fills) ||
              (child instanceof BorderPaintLayer && borders)
            ) {
              if (!changing) {
                this._stylePrepareGeometryChange(true);
                changing = true;
              }
              removed.push(child);
            }
          }
          for (let i = 0; i < removed.length; i++) layers.removeChild(removed[i] as Node);
          if (sourceLayers) {
            for (
              let child = sourceLayers.getFirstChild();
              null !== child;
              child = child.getNext()
            ) {
              if (
                (child instanceof FillPaintLayer && fills) ||
                (child instanceof BorderPaintLayer && borders)
              ) {
                if (!changing) {
                  this._stylePrepareGeometryChange(true);
                  changing = true;
                }
                layers.appendChild(child.clone() as Node);
              }
            }
          }
        } finally {
          if (blockChildChanges) layers._endBlockChanges(CHILD_CHANGES);
          if (changing) this._styleFinishGeometryChange(true);
        }
      }
      if (sets.indexOf(PropertySet.Effects) >= 0) {
        const effects = this.getEffects() as Effects;
        const sourceEffects = source.getEffects();
        let changing = false;
        if (blockChildChanges) effects._beginBlockChanges(CHILD_CHANGES);
        try {
          while (effects.getFirstChild()) {
            if (!changing) {
              this._stylePrepareGeometryChange(true);
              changing = true;
            }
            effects.removeChild(effects.getFirstChild() as Node);
          }
          if (sourceEffects) {
            for (
              let child = sourceEffects.getFirstChild();
              null !== child;
              child = child.getNext()
            ) {
              if (!changing) {
                this._stylePrepareGeometryChange(true);
                changing = true;
              }
              effects.appendChild((child as Effect).clone() as Node);
            }
          }
        } finally {
          if (blockChildChanges) effects._endBlockChanges(CHILD_CHANGES);
          if (changing) this._styleFinishGeometryChange(true);
        }
      }
      const names: string[] = [];
      for (let i = 0; i < sets.length; ++i) {
        const info = PropertySetInfo[sets[i] as string] as PropertySetDescription;
        let setNames: string[] = [];
        if (info.visualProperties) setNames = setNames.concat(Object.keys(info.visualProperties));
        if (info.geometryProperties) {
          setNames = setNames.concat(Object.keys(info.geometryProperties));
        }
        for (let j = 0; j < setNames.length; ++j) {
          const name = setNames[j] as string;
          if ("_sdf" !== name) names.push(name);
        }
      }
      if (names.length > 0) {
        const values = source.getProperties(names);
        this.setProperties(names, values, false, true);
      }
    }

    hasStyleBorder(): boolean | null {
      const layers = this.getPaintLayers();
      return layers && layers.hasStyleBorder();
    }

    hasStyleFill(): boolean | null {
      const layers = this.getPaintLayers();
      return layers && layers.hasStyleFill();
    }

    /**
     * The style layers effects can target, fill first. Quirk: the old test
     * used the indexOf results as booleans, so a set at index 0 counts as
     * missing and a missing one (-1) as present.
     */
    getStyleLayers(): string[] | null {
      const sets = this.getStylePropertySets();
      const fillIndex = sets.indexOf(PropertySet.FillPaintLayers);
      const borderIndex = sets.indexOf(PropertySet.BorderPaintLayers);
      let layers: string[] | null = null;
      if (fillIndex || borderIndex) {
        layers = [];
        if (fillIndex) layers.push(StyleLayer.Fill);
        if (borderIndex) layers.push(StyleLayer.Border);
      }
      return layers;
    }

    /** How far a border reaches outside the shape: half for center, all for outside. */
    getStyleBorderPadding(border: BorderLike): number {
      return border.$_ba === BorderAlignment.Center
        ? border.$_bw / 2
        : border.$_ba === BorderAlignment.Outside
          ? border.$_bw
          : 0;
    }

    /** Sets the defaults of every property set and fresh container ids. */
    _setStyleDefaultProperties(): void {
      const sets = this.getStylePropertySets();
      let layersId = false;
      for (let i = 0; i < sets.length; ++i) {
        const info = PropertySetInfo[sets[i] as string] as PropertySetDescription;
        if (info.visualProperties) this._setDefaultProperties(info.visualProperties);
        if (info.geometryProperties) this._setDefaultProperties(info.geometryProperties);
        if (sets[i] === PropertySet.Effects) this._effId = uuid();
        else if (
          (sets[i] === PropertySet.FillPaintLayers || sets[i] === PropertySet.BorderPaintLayers) &&
          !layersId
        ) {
          this._layId = uuid();
          layersId = true;
        }
      }
    }

    /**
     * The style part of `_handleChange`; the class that mixes this in calls
     * it. Reports property changes, stores and restores the sets and the
     * containers, and attaches the containers with the node.
     */
    _handleStyleChange(change: number, args?: unknown): void {
      if (
        change === NodeChange.BeforePropertiesChange ||
        change === NodeChange.AfterPropertiesChange
      ) {
        const changed = args as PropertiesChangeArgs;
        let visual = false;
        let geometry = false;
        const names: string[] = [];
        const values: unknown[] = [];
        for (let i = 0; i < changed.properties.length; ++i) {
          const name = changed.properties[i] as string;
          if (Object.hasOwn(AllGeometryProperties, name)) {
            geometry = true;
            if (change === NodeChange.BeforePropertiesChange) this._stylePrepareGeometryChange();
            else {
              names.push(changed.properties[i] as string);
              values.push(changed.values[i]);
            }
          } else if (
            Object.hasOwn(AllVisualProperties, name) &&
            change === NodeChange.AfterPropertiesChange
          ) {
            visual = true;
            names.push(changed.properties[i] as string);
            values.push(changed.values[i]);
          }
        }
        if (!geometry && visual) {
          this._styleRepaint();
          this._stylePropertiesUpdated(names, values);
        } else if (geometry) {
          this._styleFinishGeometryChange();
          this._stylePropertiesUpdated(names, values);
        }
      } else if (change === NodeChange.Store) {
        const { blob, options } = args as StoreChangeArgs;
        const sets = this.getStylePropertySets();
        let layersStored = false;
        for (let i = 0; i < sets.length; ++i) {
          const set = sets[i];
          if (set === PropertySet.Effects) {
            if (this._effects && null !== this._effects.getFirstChild()) {
              blob["_eff"] = Node.store(this._effects);
            } else blob["_effId"] = this._effId;
          } else if (set === PropertySet.FillPaintLayers || set === PropertySet.BorderPaintLayers) {
            if (!layersStored && this._paintLayers && null !== this._paintLayers.getFirstChild()) {
              blob["_layers"] = Node.store(this._paintLayers, options);
              layersStored = true;
            } else if (!layersStored) blob["_layId"] = this._layId;
          } else {
            const info = PropertySetInfo[set as string] as PropertySetDescription;
            if (info.visualProperties) {
              this.storeProperties(blob, info.visualProperties, info.storeFilter);
            }
            if (info.geometryProperties) {
              this.storeProperties(blob, info.geometryProperties, info.storeFilter);
            }
          }
        }
      } else if (change === NodeChange.Restore) {
        const { blob } = args as RestoreChangeArgs;
        const sets = this.getStylePropertySets();
        let layersRestored = false;
        for (let i = 0; i < sets.length; ++i) {
          const set = sets[i];
          if (set === PropertySet.Effects) {
            if (blob["_eff"]) {
              this._effects = Node.restore(blob["_eff"] as NodeBlob) as Effects;
              this._effects._setParent(this as never);
            } else if (blob["_effId"]) this._effId = blob["_effId"] as string;
          } else if (set === PropertySet.FillPaintLayers || set === PropertySet.BorderPaintLayers) {
            if (!layersRestored && blob["_layers"]) {
              this._paintLayers = Node.restore(blob["_layers"] as NodeBlob) as PaintLayers;
              this._paintLayers._setParent(this as never);
              layersRestored = true;
            } else if (!layersRestored && blob["_layId"]) {
              this._layId = blob["_layId"] as string;
              layersRestored = true;
            }
          } else {
            const info = PropertySetInfo[set as string] as PropertySetDescription;
            if (info.visualProperties) {
              this.restoreProperties(blob, info.visualProperties, info.restoreFilter);
            }
            if (info.geometryProperties) {
              this.restoreProperties(blob, info.geometryProperties, info.restoreFilter);
            }
          }
        }
        // Flat styles of old files become layers.
        const layers = this.getPaintLayers();
        if (layers) layers._notifyChange(change, args);
      } else if (change === NodeChange.ParentAttached || change === NodeChange.ParentDetach) {
        if (this._effects) {
          this._effects._detachFromParent(this);
          if (change === NodeChange.ParentAttached) this._effects._attachToParent(this);
        }
        if (this._paintLayers) {
          this._paintLayers._detachFromParent(this);
          if (change === NodeChange.ParentAttached) this._paintLayers._attachToParent(this);
        }
      } else if (
        change === SceneNode._Change.SceneAttached ||
        change === SceneNode._Change.SceneDetached
      ) {
        if (this._effects) {
          this._effects._detachFromParent(this);
          if (change == SceneNode._Change.SceneAttached) this._effects._attachToParent(this);
        }
        if (this._paintLayers) {
          this._paintLayers._detachFromParent(this);
          if (change === SceneNode._Change.SceneAttached) this._paintLayers._attachToParent(this);
        }
      }
    }

    // Hooks for the classes that mix this in (elements override them).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the source of the change
    _stylePrepareGeometryChange(source?: unknown): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the source of the change
    _styleFinishGeometryChange(source?: unknown): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the source of the change
    _styleRepaint(source?: unknown): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- changed names and old values
    _stylePropertiesUpdated(names: string[], values: unknown[]): void {}

    /**
     * Whether this node matches the style in the sets the style has. True
     * without a style. Quirks kept: the layer walk starts at the first
     * layer of any kind (layers compare with their class equals), and text only compares when this node has `_tff`.
     */
    equalsStyle(style?: StylableNode | null): boolean {
      if (style) {
        const sameLayers = (layerClass: AnyConstructor<PaintLayer>): boolean => {
          let layers = style.getPaintLayers();
          if (!layers) return true;
          let theirs = layers.getFirstChild();
          layers = this.getPaintLayers();
          if (!layers) return true;
          let mine = layers.getFirstChild();
          if ((null === theirs && null !== mine) || (null !== theirs && null === mine))
            return false;
          while (null !== theirs && null !== mine) {
            if (!equals(theirs, mine)) return false;
            theirs = theirs.getNext();
            mine = mine.getNext();
            while (null !== theirs && !(theirs instanceof layerClass)) theirs = theirs.getNext();
            while (null !== mine && !(mine instanceof layerClass)) mine = mine.getNext();
            if ((null === theirs && null !== mine) || (null !== theirs && null === mine)) {
              return false;
            }
          }
          return true;
        };
        const styleSets = style.getProperty("ps") as string[];
        if (styleSets.indexOf(PropertySet.Style) >= 0) {
          let names: string[] = [];
          const info = PropertySetInfo[PropertySet.Style] as PropertySetDescription;
          if (info.visualProperties) names = names.concat(Object.keys(info.visualProperties));
          if (info.geometryProperties) names = names.concat(Object.keys(info.geometryProperties));
          let same = true;
          names.forEach((name) => {
            if ("_sdf" !== name) same = same && this.getProperty(name) === style.getProperty(name);
          });
          if (!same) return false;
        }
        if (styleSets.indexOf(PropertySet.FillPaintLayers) >= 0 && !sameLayers(FillPaintLayer)) {
          return false;
        }
        if (
          styleSets.indexOf(PropertySet.BorderPaintLayers) >= 0 &&
          !sameLayers(BorderPaintLayer)
        ) {
          return false;
        }
        if (styleSets.indexOf(PropertySet.Effects) >= 0) {
          let theirs = (style.getEffects() as Effects).getFirstChild();
          let mine = (this.getEffects() as Effects).getFirstChild();
          if ((null === theirs && null !== mine) || (null !== theirs && null === mine))
            return false;
          while (null !== theirs && null !== mine) {
            if (!equals(theirs, mine)) return false;
            theirs = theirs.getNext();
            mine = mine.getNext();
            if ((null === theirs && null !== mine) || (null !== theirs && null === mine)) {
              return false;
            }
          }
        }
        if (styleSets.indexOf(PropertySet.Text) >= 0) {
          let same = true;
          const textSets = [PropertySet.Text, PropertySet.Paragraph];
          let names: string[] = [];
          for (let i = 0; i < textSets.length; ++i) {
            const info = PropertySetInfo[textSets[i] as string] as PropertySetDescription;
            if (info.visualProperties) names = names.concat(Object.keys(info.visualProperties));
            if (info.geometryProperties) {
              names = names.concat(Object.keys(info.geometryProperties));
            }
          }
          if (this.hasProperty("_tff")) {
            names.forEach((name) => {
              same =
                "_fc" === name
                  ? same && RGBColor.equals(this.getProperty(name), style.getProperty(name))
                  : same && this.getProperty(name) === style.getProperty(name);
            });
          }
          return same;
        }
      }
      return true;
    }
  }
  const prototype = StylableMixin.prototype;
  prototype._effects = null;
  prototype._paintLayers = null;
  prototype._layId = null;
  prototype._effId = null;
  return StylableMixin;
};

/** GStylable as a mixin: `class Style extends Stylable(Properties(SceneNode))`. */
const stylableMixin = defineMixin("GStylable", body);
const stylableStatics = {
  StyleLayer,
  StyleLayerName,
  BorderAlignment,
  BorderMarker,
  ParagraphAlignment,
  TypographyScript,
  TextTransformation,
  PropertySet,
  PropertySetInfo,
  AllVisualProperties,
  AllGeometryProperties,
  PaintLayer,
  FillPaintLayer,
  BorderPaintLayer,
  PaintLayers,
  Effects,
  Effect,
};
export const Stylable: typeof stylableMixin & typeof stylableStatics = Object.assign(
  stylableMixin,
  stylableStatics,
);

export type StylableInstance = InstanceType<ReturnType<typeof body>>;
