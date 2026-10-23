# engine/core

The base layer every other engine cluster builds on: the type system
(object.ts), events (event.ts, event-target.ts), Util, Key, the input
events, Platform and System. The locale runtime lives in locale/ and has
its own owner.

## Declaring a class

Old code:

```js
function GRectangle() {
  GShape.call(this);
}
GObject.inheritAndMix(GRectangle, GShape, [GElement.Transform]);
GRectangle.prototype.foo = 0;
```

New code:

```ts
import { registerClass } from "../core/object.ts";

export class Rectangle extends Transform(Shape) {
  static {
    registerClass(this, "GRectangle");
  }
  foo = 0;
}
```

- `registerClass(this, "<old G path>")` gives the class the number the old
  engine had (type-ids.ts, generated from the old app by
  scripts/gen-type-ids.ts). Use the path where the old code defined the
  class: "GNode.BeforeInsertEvent", not the subclass path the recording
  happened to list it under; the alias table covers that. Classes that had
  no recorded number get a fresh id from 1000 up.
- Register every class that the old code created with `GObject.inherit`.
  An unregistered subclass shares its parent's id, which means it shares
  its parent's event listeners and its `_sdf` number.
- Extend `GObject` where the old class extended GObject (it adds
  `hasMixin` and the old `toString`).
- `getTypeId(x)`, `getName(x)` and `hasMixin(obj, mixin)` keep the old
  rules; `GObject.getTypeId` and `GObject.getName` are the same functions.

## Nested classes

The old code hung classes off other classes (`GMouseEvent.DragEnd`,
`GNode.Properties`). Define them as separate classes and attach them as
statics, declared on the owner for typing:

```ts
export class MouseEvent extends InputEvent {
  declare static Drag: typeof MouseDragEvent;
}
export class MouseDragEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Drag");
  }
}
MouseEvent.Drag = MouseDragEvent;
```

ES classes inherit statics through the prototype chain, so
`Rectangle.BeforeInsertEvent` works when Node defines it, as it did with
the old static copying.

## Events

```ts
export class AfterThingEvent extends Event {
  static {
    registerClass(this, "GThing.AfterThingEvent");
  }
  constructor(readonly thing: Thing) {
    super();
  }
}

target.addEventListener(AfterThingEvent, (e) => e.thing);
target.trigger(new AfterThingEvent(thing));
```

Listeners are keyed by the event class's type id, not by `instanceof`: a
listener for `MouseEvent.Drag` doesn't receive `MouseEvent.DragEnd`.
`addEventListener(cls, fn, target, args, prepend, persistent)` keeps the
old optional arguments (bind to `target`, pass `args` before the event,
put first, survive `removeAllEventListeners()`).

A class that triggers events either extends `EventTarget` or, when it
extends something else, mixes it in: `class Node extends
EventTargetMixin(GObject)`. Both answer `hasMixin(EventTarget)` the way the
old code did (true for the mixin only).

## Mixins

A mixin is a TypeScript mixin factory registered with `defineMixin`:

```ts
export const Tag = defineMixin(
  "GNode.Tag",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class TagMixin extends Base {
      getTag(): string { ... }
    }
    return TagMixin;
  },
);

class Layer extends Tag(Container(Node)) { ... }
layer.hasMixin(Tag); // true, also for subclasses of Layer
```

- The factory function is the mixin's identity: `hasMixin(Tag)`,
  `getTypeId(Tag)`, and what goes on the owner as a static
  (`Node.Tag = Tag`).
- Mixins applied inside a mixin body count too (the old code copied a
  mixin's own mixins).
- When the old code mixed in a class that is also used on its own
  (GEventTarget, GVertexSource, GAnnotation), register the class and pass
  it as the identity: `defineMixin(VertexSource, body)`. If there's no
  sensible factory, `markMixins(Cls, [VertexSource])` records the id
  without one.
- The old `inheritAndMix` threw when a mixin member already existed on the
  class (unless forced). A factory class overrides the base silently, so
  keep the old structure: a mixin shouldn't redefine base members.

## Prototype defaults and field initializers

The old code put defaults on the prototype (`X.prototype._listeners =
null`). A class field initializer runs after the base constructor, so if
the base constructor calls an overridden method that sets the field, the
initializer resets it. Where a base constructor can call into the class
(nodes do this a lot), declare the field without an initializer
(`declare _x: T | undefined`) and handle undefined, or set the default on
the prototype after the class. event-target.ts shows both.

## The G namespace

`src/parity/g/engine-core.ts` exposes exactly the names the old G barrel
(vendor module 1) had. The type-id scenario walks every class in G, so
don't add names the old barrel didn't have.
