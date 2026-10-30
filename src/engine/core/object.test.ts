import { describe, expect, it } from "vitest";
import {
  FIRST_FRESH_TYPE_ID,
  GObject,
  defineMixin,
  getMixinsVersion,
  getName,
  getOldName,
  getRegisteredClass,
  getTypeId,
  hasMixin,
  markMixins,
  registerClass,
  type AnyConstructor,
} from "./object.ts";
import { OLD_TYPE_IDS, lookupOldTypeId } from "./type-ids.ts";

describe("type ids", () => {
  it("gives a class its old number from the table", () => {
    class Rectangle extends GObject {
      static {
        registerClass(this, "GTestOnly.Rectangle", { id: 107 });
      }
    }
    expect(getTypeId(Rectangle)).toBe(107);
    expect(getTypeId(new Rectangle())).toBe(107);
    expect(getOldName(Rectangle)).toBe("GTestOnly.Rectangle");
    expect(getRegisteredClass("GTestOnly.Rectangle")).toBe(Rectangle);
  });

  it("reads the old table by name", () => {
    expect(lookupOldTypeId("GRectangle")).toBe(107);
    expect(lookupOldTypeId("GObject")).toBe(-1);
    expect(lookupOldTypeId("GEvent")).toBe(0);
    expect(lookupOldTypeId("GNoSuchClass")).toBeUndefined();
    expect(lookupOldTypeId("constructor")).toBeUndefined();
    expect(Object.keys(OLD_TYPE_IDS).length).toBe(206);
  });

  it("keeps GObject at -1 like the old prototype default", () => {
    expect(getTypeId(GObject)).toBe(-1);
    expect(getTypeId(new GObject())).toBe(-1);
  });

  it("gives classes without an old id fresh ids above every old one", () => {
    class A extends GObject {
      static {
        registerClass(this, "GTestOnly.FreshA");
      }
    }
    class B extends GObject {
      static {
        registerClass(this, "GTestOnly.FreshB");
      }
    }
    const a = getTypeId(A) as number;
    const b = getTypeId(B) as number;
    expect(a).toBeGreaterThanOrEqual(FIRST_FRESH_TYPE_ID);
    expect(b).toBe(a + 1);
  });

  it("returns null for an unregistered class but the parent's id for its instances", () => {
    class Parent extends GObject {
      static {
        registerClass(this, "GTestOnly.Parent");
      }
    }
    class Child extends Parent {}
    expect(getTypeId(Child)).toBeNull();
    expect(getTypeId(new Child())).toBe(getTypeId(Parent));
  });

  it("passes numbers through and gives null for other values", () => {
    expect(getTypeId(42)).toBe(42);
    expect(getTypeId(null)).toBeNull();
    expect(getTypeId(undefined)).toBeNull();
    expect(getTypeId({})).toBeNull();
    expect(getTypeId("GObject")).toBeNull();
    expect(getTypeId(() => 1)).toBeNull();
  });

  it("refuses to register a class or a name twice", () => {
    class Twice extends GObject {
      static {
        registerClass(this, "GTestOnly.Twice");
      }
    }
    expect(() => registerClass(Twice, "GTestOnly.Twice2")).toThrow(/twice/);
    class Other extends GObject {}
    expect(() => registerClass(Other, "GTestOnly.Twice")).toThrow(/already taken/);
  });
});

describe("getName", () => {
  it("uses the old name, then the class name", () => {
    class Named extends GObject {
      static {
        registerClass(this, "GTestOnly.Named");
      }
    }
    class Plain {
      readonly plain = true;
    }
    expect(getName(Named)).toBe("GTestOnly.Named");
    expect(getName(new Named())).toBe("GTestOnly.Named");
    expect(getName(new Plain())).toBe("Plain");
    expect(getName(null)).toBe("<null>");
    expect(getName(0)).toBe("<null>");
    expect(getName("text")).toBe("text");
    expect(String(new Named())).toBe("[Object GTestOnly.Named]");
  });
});

describe("mixins", () => {
  class Base extends GObject {
    static {
      registerClass(this, "GTestOnly.MixBase");
    }
    base(): string {
      return "base";
    }
  }

  const Tag = defineMixin("GTestOnly.Tag", <T extends AnyConstructor<Base>>(B: T) => {
    abstract class TagMixin extends B {
      tag(): string {
        return "tag:" + this.base();
      }
    }
    return TagMixin;
  });

  const Labeled = defineMixin("GTestOnly.Labeled", <T extends AnyConstructor<Base>>(B: T) => {
    abstract class LabeledMixin extends Tag(B) {
      label(): string {
        return "label+" + this.tag();
      }
    }
    return LabeledMixin;
  });

  const Unused = defineMixin("GTestOnly.Unused", <T extends AnyConstructor>(B: T) => {
    abstract class UnusedMixin extends B {}
    return UnusedMixin;
  });

  class Tagged extends Tag(Base) {
    static {
      registerClass(this, "GTestOnly.Tagged");
    }
  }
  class SubTagged extends Tagged {
    static {
      registerClass(this, "GTestOnly.SubTagged");
    }
  }
  class LabeledThing extends Labeled(Base) {
    static {
      registerClass(this, "GTestOnly.LabeledThing");
    }
  }

  it("records the mixin on the class and its subclasses", () => {
    const tagged = new Tagged();
    expect(tagged.tag()).toBe("tag:base");
    expect(tagged.hasMixin(Tag)).toBe(true);
    expect(new SubTagged().hasMixin(Tag)).toBe(true);
    expect(hasMixin(Tagged.prototype, Tag)).toBe(true);
    expect(new Base().hasMixin(Tag)).toBe(false);
    expect(tagged.hasMixin(Unused)).toBe(false);
  });

  it("records mixins applied inside a mixin", () => {
    const thing = new LabeledThing();
    expect(thing.label()).toBe("label+tag:base");
    expect(thing.hasMixin(Labeled)).toBe(true);
    expect(thing.hasMixin(Tag)).toBe(true);
    expect(new Tagged().hasMixin(Labeled)).toBe(false);
  });

  it("gives mixins type ids, and the mixin's class keeps the base's id until registered", () => {
    expect(typeof getTypeId(Tag)).toBe("number");
    expect(getTypeId(Tag)).not.toBe(getTypeId(Labeled));
    expect(getTypeId(Tagged)).not.toBe(getTypeId(Base));
    const Anonymous = Tag(Base);
    expect(getTypeId(Anonymous)).toBeNull();
  });

  it("uses a registered class as the identity of a class-shaped mixin", () => {
    class Source extends GObject {
      static {
        registerClass(this, "GTestOnly.Source");
      }
    }
    const SourceMixin = defineMixin(Source, <T extends AnyConstructor>(B: T) => {
      abstract class SourceMembers extends B {}
      return SourceMembers;
    });
    class Path extends SourceMixin(GObject) {}
    expect(getTypeId(SourceMixin)).toBe(getTypeId(Source));
    expect(new Path().hasMixin(Source)).toBe(true);
    // Extending the class itself is not mixing it in (old behaviour).
    class Sub extends Source {}
    expect(new Sub().hasMixin(Source)).toBe(false);
  });

  it("sees mixins marked after hasMixin was first asked", () => {
    class Early extends GObject {}
    class EarlySub extends Early {}
    expect(new EarlySub().hasMixin(Unused)).toBe(false);
    expect(new Early().hasMixin(Unused)).toBe(false);
    markMixins(Early, [Unused]);
    expect(new EarlySub().hasMixin(Unused)).toBe(true);
    expect(new Early().hasMixin(Unused)).toBe(true);
  });

  it("changes the mixins version whenever a mixin is recorded", () => {
    class Late extends GObject {}
    const before = getMixinsVersion();
    expect(new Late().hasMixin(Unused)).toBe(false);
    expect(getMixinsVersion()).toBe(before);
    markMixins(Late, [Unused]);
    const marked = getMixinsVersion();
    expect(marked).not.toBe(before);
    Tag(Base);
    expect(getMixinsVersion()).not.toBe(marked);
  });

  it("marks whole classes as mixins", () => {
    class Annotation extends GObject {
      static {
        registerClass(this, "GTestOnly.Annotation");
      }
    }
    class Note extends GObject {}
    markMixins(Note, [Annotation]);
    expect(new Note().hasMixin(Annotation)).toBe(true);
    expect(() => markMixins(Note, [class extends GObject {}])).toThrow(/not a registered mixin/);
  });

  it("refuses a mixin body that returns its base", () => {
    const Broken = defineMixin("GTestOnly.Broken", <T extends AnyConstructor>(B: T) => B);
    expect(() => Broken(GObject)).toThrow(/new class/);
  });

  it("has no mixins on objects without a type", () => {
    expect(hasMixin(null, Tag)).toBe(false);
    expect(hasMixin({}, Tag)).toBe(false);
    expect(hasMixin(new Tagged(), class extends GObject {})).toBe(false);
  });
});

describe("instanceof on a mixin", () => {
  it("is false, as with the old constructor-function mixins, instead of throwing", () => {
    const Marker = defineMixin(
      "TestInstanceofMarker",
      (Base: new () => object) => class extends Base {},
    );
    class Plain {
      readonly kind = "plain";
    }
    const Mixed = Marker(Plain as never);
    const value: unknown = new Mixed();
    expect(value instanceof (Marker as unknown as new () => object)).toBe(false);
    expect(hasMixin(value, Marker)).toBe(true);
  });
});
