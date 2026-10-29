import { describe, expect, it } from "vitest";
import { Event } from "./event.ts";
import { EventTarget, EventTargetMixin } from "./event-target.ts";
import { GObject, getTypeId, registerClass } from "./object.ts";

class PingEvent extends Event {
  static {
    registerClass(this, "GTestOnly.PingEvent");
  }
  constructor(public readonly value = 0) {
    super();
  }
}

class LoudPingEvent extends PingEvent {
  static {
    registerClass(this, "GTestOnly.LoudPingEvent");
  }
}

class OtherEvent extends Event {
  static {
    registerClass(this, "GTestOnly.OtherEvent");
  }
}

describe("EventTarget", () => {
  it("calls listeners of the event's own class in order and sets the sender", () => {
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(PingEvent, (e) => log.push("a" + e.value));
    target.addEventListener(PingEvent, (e) => log.push("b" + e.value));
    target.addEventListener(OtherEvent, () => log.push("other"));
    const event = new PingEvent(1);
    target.trigger(event);
    expect(log).toEqual(["a1", "b1"]);
    expect(event.sender).toBe(target);
  });

  it("doesn't call a parent class's listeners for a registered subclass", () => {
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(PingEvent, () => log.push("ping"));
    target.trigger(new LoudPingEvent());
    expect(log).toEqual([]);
  });

  it("prepends, binds to a target and passes extra arguments first", () => {
    const target = new EventTarget();
    const log: unknown[] = [];
    const receiver = { name: "receiver" };
    target.addEventListener(PingEvent, () => log.push("plain"));
    target.addEventListener(
      PingEvent,
      function (this: { name: string }, extra: string, e: PingEvent) {
        log.push([this.name, extra, e.value]);
      },
      receiver,
      ["x"],
      true,
    );
    target.trigger(new PingEvent(7));
    expect(log).toEqual([["receiver", "x", 7], "plain"]);
  });

  it("calls an unbound listener with the target as this", () => {
    const target = new EventTarget();
    let self: unknown = null;
    target.addEventListener(PingEvent, function (this: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- the test checks what `this` is
      self = this;
    });
    target.trigger(new PingEvent());
    expect(self).toBe(target);
  });

  it("removes by source listener, optionally only for one target", () => {
    const target = new EventTarget();
    const log: string[] = [];
    const a = { id: "a" };
    const b = { id: "b" };
    const listener = function (this: { id: string }) {
      log.push(this.id);
    };
    target.addEventListener(PingEvent, listener, a);
    target.addEventListener(PingEvent, listener, b);
    expect(target.removeEventListener(PingEvent, listener, a)).toBe(true);
    target.trigger(new PingEvent());
    expect(log).toEqual(["b"]);
    expect(target.removeEventListener(PingEvent, listener)).toBe(true);
    expect(target.hasEventListeners(PingEvent)).toBe(false);
    expect(target.removeEventListener(PingEvent, listener)).toBe(false);
  });

  it("skips listeners removed during a trigger and defers ones added during it", () => {
    const target = new EventTarget();
    const log: string[] = [];
    const second = () => log.push("second");
    const late = () => log.push("late");
    target.addEventListener(PingEvent, () => {
      log.push("first");
      target.removeEventListener(PingEvent, second);
      target.addEventListener(PingEvent, late);
    });
    target.addEventListener(PingEvent, second);
    target.trigger(new PingEvent());
    expect(log).toEqual(["first"]);
  });

  it("stops at isImmediatePropagationStopped", () => {
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(PingEvent, (e) => {
      log.push("one");
      e.isImmediatePropagationStopped = true;
    });
    target.addEventListener(PingEvent, () => log.push("two"));
    target.trigger(new PingEvent());
    expect(log).toEqual(["one"]);
  });

  it("removeAllEventListeners keeps persistent listeners unless forced", () => {
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(PingEvent, () => log.push("normal"));
    target.addEventListener(PingEvent, () => log.push("kept"), null, null, false, true);
    target.addEventListener(OtherEvent, () => log.push("other"));
    target.removeAllEventListeners();
    target.trigger(new PingEvent());
    expect(log).toEqual(["kept"]);
    expect(target.hasEventListeners(OtherEvent)).toBe(false);
    target.removeAllEventListeners(true);
    expect(target.hasEventListeners(PingEvent)).toBe(false);
  });

  it("accepts type ids instead of classes", () => {
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(getTypeId(PingEvent) as number, () => log.push("by id"));
    expect(target.hasEventListeners(PingEvent)).toBe(true);
    target.trigger(new PingEvent());
    expect(log).toEqual(["by id"]);
  });

  describe("listeners bound to targets", () => {
    /** A listener shared by several targets, as editors share their prototype's method. */
    class Owner {
      constructor(
        readonly name: string,
        readonly log: string[],
      ) {}
      ping(this: Owner): void {
        this.log.push(this.name);
      }
      pong(this: Owner): void {
        this.log.push(this.name + "!");
      }
    }

    /** The per-target counts must match the entries, or removal stops too early (or too late). */
    function expectCountsInStep(target: EventTarget): void {
      for (const group of target._listeners?.values() ?? []) {
        const counts = new Map<unknown, number>();
        for (const entry of group.listeners) {
          if (entry.target) counts.set(entry.target, (counts.get(entry.target) || 0) + 1);
        }
        expect(new Map(group.targets)).toEqual(counts);
      }
    }

    function ping(target: EventTarget, log: string[]): string[] {
      log.length = 0;
      target.trigger(new PingEvent());
      return log.slice();
    }

    it("removes only the given target's registrations, duplicates included", () => {
      const target = new EventTarget();
      const log: string[] = [];
      const [a, b, c] = ["a", "b", "c"].map((name) => new Owner(name, log)) as [
        Owner,
        Owner,
        Owner,
      ];
      target.addEventListener(PingEvent, Owner.prototype.ping, a);
      target.addEventListener(PingEvent, Owner.prototype.ping, b);
      target.addEventListener(PingEvent, Owner.prototype.pong, a);
      target.addEventListener(PingEvent, Owner.prototype.ping, c, null, true);
      target.addEventListener(PingEvent, Owner.prototype.ping, a);
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["c", "a", "b", "a!", "a"]);
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping, a)).toBe(true);
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["c", "b", "a!"]);
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping, a)).toBe(false);
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping, c)).toBe(true);
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["b", "a!"]);
    });

    it("keeps the counts through removal without a target and removeAllEventListeners", () => {
      const target = new EventTarget();
      const log: string[] = [];
      const a = new Owner("a", log);
      const b = new Owner("b", log);
      target.addEventListener(PingEvent, Owner.prototype.ping, a);
      target.addEventListener(PingEvent, Owner.prototype.ping, b);
      target.addEventListener(PingEvent, Owner.prototype.pong, b, null, false, true);
      // Without a target every registration of the listener goes.
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping)).toBe(true);
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["b!"]);
      target.addEventListener(PingEvent, Owner.prototype.ping, a);
      target.addEventListener(PingEvent, Owner.prototype.ping, b);
      target.removeAllEventListeners();
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["b!"]);
      target.addEventListener(PingEvent, Owner.prototype.ping, b);
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping, b)).toBe(true);
      expectCountsInStep(target);
      expect(ping(target, log)).toEqual(["b!"]);
      target.removeAllEventListeners(true);
      expect(target.hasEventListeners(PingEvent)).toBe(false);
      target.addEventListener(PingEvent, Owner.prototype.ping, a);
      expectCountsInStep(target);
      expect(target.removeEventListener(PingEvent, Owner.prototype.ping, a)).toBe(true);
      expect(target.hasEventListeners(PingEvent)).toBe(false);
    });
  });
});

describe("EventTargetMixin", () => {
  class Node extends GObject {
    readonly created: string;
    constructor() {
      super();
      this.created = "node";
      this.init();
    }
    init(): void {}
  }
  class Element extends EventTargetMixin(Node) {
    static {
      registerClass(this, "GTestOnly.Element");
    }
    // Runs from the base constructor, before the mixin's own constructor.
    override init(): void {
      this.addEventListener(PingEvent, () => undefined);
    }
  }

  it("keeps listeners added while the base constructor runs", () => {
    expect(new Element().hasEventListeners(PingEvent)).toBe(true);
  });

  it("adds the event target members and marks the mixin", () => {
    const element = new Element();
    const log: string[] = [];
    element.addEventListener(OtherEvent, () => log.push(element.created));
    element.trigger(new OtherEvent());
    expect(log).toEqual(["node"]);
    expect(element.hasMixin(EventTarget)).toBe(true);
    expect(element instanceof EventTarget).toBe(false);
    expect(element.temporaryReceiver).toBe(false);
  });

  it("doesn't mark plain EventTarget instances as having the mixin", () => {
    expect(new (class extends EventTarget {})()).toBeInstanceOf(EventTarget);
    expect(getTypeId(EventTargetMixin)).toBe(getTypeId(EventTarget));
    expect(getTypeId(EventTarget)).toBe(20);
  });
});
