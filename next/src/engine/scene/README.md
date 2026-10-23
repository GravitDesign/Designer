# engine/scene

The document tree: GNode with its mixins, the scene node base, GElement
with its mixins, GBlock and GItem. Every page, layer, shape, text, style,
paint layer and effect is a node declared the way this file describes.
Read core/README.md first (registerClass, defineMixin, prototype defaults).

| File                                                                               | Old             | What                                                                      |
| ---------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| node.ts                                                                            | v2              | GNode, registry, store/restore/serialize/deserialize, GNode.MapContainer  |
| node-change.ts                                                                     | v2              | GNode.Flag (`NodeFlag`), GNode._Change (`NodeChange`)                     |
| node-events.ts                                                                     | v2              | GNode.BeforeInsertEvent ... AfterRestoreEvent                             |
| node-properties.ts, node-identity.ts, node-container.ts, node-store.ts             | v2              | GNode.Properties, Identity/Tag/Reference/Multireference, Container, Store |
| scene-node.ts                                                                      | v76             | the base of GElement: scene, page, refs                                   |
| reference-event.ts                                                                 | v472            | GReferenceEvent                                                           |
| element.ts                                                                         | v22             | GElement, GElement.GeometryChangeEvent                                    |
| element-change.ts                                                                  | v22             | GElement.Flag, CollisionFlag, _Change, `isElement`                        |
| element-transform.ts, element-layout.ts, element-anchor.ts, element-accelerated.ts | v908-v910, v912 | the GElement mixins                                                       |
| element-linkable.ts                                                                | v914            | GAnnotation.Linkable                                                      |
| style-hooks.ts                                                                     | (v28, v911)     | what GElement calls on GStylable / GElement.Stylable (engine/style)       |
| block.ts, item.ts                                                                  | v69, v104       | GBlock (+ LabelHolder), GItem                                             |
| scene-options.ts                                                                   | v207            | GSceneOptions                                                             |
| anchor.ts, anchor-link.ts                                                          | v569, v512      | GAnchor, GAnchorLink (paths graph)                                        |

The blob format and `deserializeAsync` are in ../serialize.

## Declaring a node class

Old code:

```js
function GRectangle() {
  GShape.call(this);
  this._setDefaultProperties(GRectangle.GeometryProperties);
}
GNode.inheritAndMix("rectangle", GRectangle, GShape, [GElement.Transform]);
GRectangle.GeometryProperties = { uf: true, tl_ct: "R" /* ... */ };
GRectangle.prototype._handleChange = function (change, args) {
  if (change === GNode._Change.Store) this.storeProperties(args.blob, GRectangle.GeometryProperties);
  else if (change === GNode._Change.Restore) this.restoreProperties(args.blob, GRectangle.GeometryProperties);
  this._handleGeometryChangeForProperties(change, args, GRectangle.GeometryProperties);
  GShape.prototype._handleChange.call(this, change, args);
};
GRectangle.prototype.validateInsertion = function (parent, reference) { ... };
```

New code:

```ts
import { registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Transform } from "../scene/element-transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";

const GeometryProperties = { uf: true, tl_ct: "R" /* ... */ };

export class Rectangle extends Transform(Shape) {
  static {
    registerNodeClass(this, "rectangle", "GRectangle");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;

  // Property fields are declared, never initialized (see below).
  declare $uf: boolean;
  declare $tl_ct: string;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, GeometryProperties);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    super._handleChange(change, args);
  }
}
```

The parts, one by one:

- **Node name and type id.** `registerNodeClass(this, nodeName, oldName)`
  in a static block. `nodeName` is what `@` holds in the file and must
  be the old string byte for byte ("rectangle", "Compound Shape",
  "Paths Graph"). `oldName` is the old G path ("GRectangle",
  "GStylable.FillPaintLayer"), which gives the old type id (`_sdf` in
  files, listener keys). A class without a node name (GBlock, GItem)
  calls `registerClass(this, "GOld")` instead. Every class gets one of
  the two, also subclasses: an unregistered subclass shares its parent's
  id, its parent's node name and its parent's listeners.
- **Mixins.** `Transform(Shape)` and so on. Node mixins:
  `Properties`, `Identity`, `Tag`, `Reference`, `Multireference`,
  `Container`, `Store` (node-_.ts). Element mixins: `Transform`, `Layout`,
  `Anchor`, `Accelerated` (element-_.ts) and `ElementStylable` (engine/style).
  The old order `[A, B]` becomes `B(A(Base))`. Anything that is stored
  needs `Store`; anything with properties needs `Properties` (GBlock has
  both). `hasMixin(Node.Container)` and the type guards `hasContainer`,
  `hasProperties`, `hasIdentity`, `hasReference`, `hasMultireference`
  check them at runtime. The old `inheritAndMix` never copied a mixin's
  `toString` (and refused to let a mixin override an existing member), so
  a mixin body defines neither `toString` nor members its base already
  has; the class itself can.
- **Properties** live as own fields `$name` (custom: `@name`, temporary
  backups `#$name`; node-properties.ts explains them). Declare the ones
  you use with `declare $name: Type;`. Never give them an initializer: a
  field initializer runs after the base constructors and overwrites what
  `_setDefaultProperties` set there. The same goes for other fields the
  old code put on the prototype: `declare` them and assign the default to
  the prototype after the class (`Rectangle.prototype._cache = null`), as
  node.ts and element.ts do.
- **Defaults.** One plain object per group (`VisualProperties`,
  `GeometryProperties`, `MetaProperties`, ...), copied in the constructor
  with `_setDefaultProperties`. `storeProperties` writes only the values
  that differ from it, so the tables are part of the file format; keep
  the old keys, values and key order. A filter argument maps values to
  and from their JSON form (`Transform.serialize`/`deserialize`,
  `Rect.serialize`/`deserialize`, patterns); see the anchor filters in
  element-anchor.ts.
- **Changes.** Override `_handleChange(change, args)` and call
  `super._handleChange(change, args)`. Switch on the constants, not on
  the class statics: `NodeChange` (node-change.ts), `SceneNodeChange`
  (scene-node.ts), `ElementChange` (element-change.ts). The payload is
  typed per change: `PropertiesChangeArgs` for Before/AfterPropertiesChange
  (Before handlers may edit `values` or add entries), `StoreChangeArgs`
  for PrepareStore/Store, `RestoreChangeArgs` for PrepareRestore/Restore,
  the child node for the child changes, `{ flag, set }` for flags. Where
  the old handler stored, restored, then called the parent, keep that
  order: it is the key order of the blob. Geometry properties go through
  `_handleGeometryChangeForProperties` (a geometry update bracket),
  purely visual ones through `_handleVisualChangeForProperties`. Classes
  with `Anchor` call `this._handleAnchorChange(change, args)` themselves,
  after super, like GItem.
- **Events.** A node class with its own events defines them as
  `Event` subclasses registered under the old path
  ("GImage.StatusEvent") and attaches them as statics
  (`static StatusEvent = ImageStatusEvent;`). Send them with
  `if (this._canEventBeSent(Cls)) this._sendEvent(new Cls(...))`, which
  reaches the node and every event-target ancestor (scene nodes are event
  targets).
- **Insertion.** `validateInsertion(parent, reference)` returns false in
  GNode, so a class that can be inserted anywhere must override it (the
  old code compared node names: `"layer" === Node.getName(parent)`).
  `validateRemoval()` is true by default.
- **Static tables** (`Flag`, `_Change`, `VisualProperties`, ...) that
  subclasses replace with their own entries are typed
  `Readonly<Record<string, number>>` (or `unknown`) on the base, because
  TypeScript checks a subclass's statics against the base's. `G.GElement.Flag`
  must hold only the element bits, as in the old code.
- **G namespace.** Expose the class under its old name in
  src/parity/g/<cluster>.ts. Only names the old barrel (vendor module 1)
  had.

## Late binding

Some old modules reached classes of later clusters through `instanceof`
or a direct require. Here:

- `Node.getClassFromId(typeId)` and `Node._nameToNodeClassMap` find node
  classes by id or name (registration fills them).
- `isElement(x)` (element-change.ts) is `x instanceof GElement` for files
  element.ts imports.
- GStylable and GElement.Stylable: engine-style calls
  `registerStyleMixins(Stylable, ElementStylable)` (element.ts) when its
  module loads; style-hooks.ts has the interface GElement, GBlock and
  GItem call. Until then `hasMixin(Element.Stylable)` is false.
- What nodes need from GWorkspace (`NodeWorkspace`,
  `NodeTransactionRecorder` in node.ts) and from GScene (`SceneHooks` in
  scene-node.ts) are interfaces; engine-scene-document implements them.
- GAnnotation (engine-annotations-model) sets `static Linkable = Linkable`
  and forwards `_handleAnnotationLinkableChange` to
  `handleAnnotationLinkableChange` (element-linkable.ts).
