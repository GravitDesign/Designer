// Old: chunk.vendor.js module 2 (the GNode.*Event classes).
/**
 * The events a node sends about itself and its children. A node sends
 * them to itself and then to every ancestor that is an event target
 * (Node._sendEvent), so a listener on the scene sees the events of every
 * node in it.
 *
 * The fields are assigned in the old constructors' order; the old
 * prototype defaults were null (false for `temporary`).
 */
import { Event } from "../core/event.ts";
import { registerClass } from "../core/object.ts";
import type { Node } from "./node.ts";

/** Before a child is inserted into `node`'s parent; `node` is the child. */
export class BeforeInsertEvent extends Event {
  static {
    registerClass(this, "GNode.BeforeInsertEvent");
  }
  declare node: Node | null;

  constructor(node: Node) {
    super();
    this.node = node;
  }

  override toString(): string {
    return "[Event GNode.BeforeInsertEvent]";
  }
}

/** After a child was inserted; `customObj` is a scratch object for listeners. */
export class AfterInsertEvent extends Event {
  static {
    registerClass(this, "GNode.AfterInsertEvent");
  }
  declare node: Node | null;
  declare customObj: Record<string, unknown> | null;

  constructor(node: Node) {
    super();
    this.customObj = {};
    this.node = node;
  }

  override toString(): string {
    return "[Event GNode.AfterInsertEvent]";
  }
}

export class BeforeRemoveEvent extends Event {
  static {
    registerClass(this, "GNode.BeforeRemoveEvent");
  }
  declare node: Node | null;
  declare customObj: Record<string, unknown> | null;

  constructor(node: Node) {
    super();
    this.node = node;
    this.customObj = {};
  }

  override toString(): string {
    return "[Event GNode.BeforeRemoveEvent]";
  }
}

export class AfterRemoveEvent extends Event {
  static {
    registerClass(this, "GNode.AfterRemoveEvent");
  }
  declare node: Node | null;

  constructor(node: Node) {
    super();
    this.node = node;
  }

  override toString(): string {
    return "[Event GNode.AfterRemoveEvent]";
  }
}

/**
 * Before properties change. `values` are the new values; listeners may
 * change entries (GBlock filters names this way), the node sets what is
 * in the array afterwards.
 */
export class BeforePropertiesChangeEvent extends Event {
  static {
    registerClass(this, "GNode.BeforePropertiesChangeEvent");
  }
  declare node: Node | null;
  declare properties: string[] | null;
  declare values: unknown[] | null;
  declare custom: boolean | null | undefined;
  declare temporary: boolean;

  constructor(
    node: Node,
    properties: string[],
    values: unknown[],
    custom?: boolean | null,
    temporary?: boolean | null,
  ) {
    super();
    this.node = node;
    this.properties = properties;
    this.values = values;
    this.custom = custom;
    this.temporary = !!temporary;
  }

  override toString(): string {
    return "[Event GNode.BeforePropertiesChangeEvent]";
  }
}

/** After properties changed; `values` are the old values. */
export class AfterPropertiesChangeEvent extends Event {
  static {
    registerClass(this, "GNode.AfterPropertiesChangeEvent");
  }
  declare node: Node | null;
  declare properties: string[] | null;
  declare values: unknown[] | null;
  declare custom: boolean | null | undefined;
  declare customObj: Record<string, unknown> | null;
  /** Unlike the Before event, stored as given (undefined stays undefined). */
  declare temporary: boolean | null | undefined;

  constructor(
    node: Node,
    properties: string[],
    values: unknown[],
    custom?: boolean | null,
    temporary?: boolean | null,
  ) {
    super();
    this.node = node;
    this.properties = properties;
    this.values = values;
    this.custom = custom;
    this.customObj = {};
    this.temporary = temporary;
  }

  override toString(): string {
    return "[Event GNode.AfterPropertiesChangeEvent]";
  }
}

export class BeforeFlagChangeEvent extends Event {
  static {
    registerClass(this, "GNode.BeforeFlagChangeEvent");
  }
  declare node: Node | null;
  declare flag: number | null;
  declare set: boolean | null;

  constructor(node: Node, flag: number, set: boolean) {
    super();
    this.node = node;
    this.flag = flag;
    this.set = set;
  }

  override toString(): string {
    return "[Event GNode.BeforeFlagChangeEvent]";
  }
}

export class AfterFlagChangeEvent extends Event {
  static {
    registerClass(this, "GNode.AfterFlagChangeEvent");
  }
  declare node: Node | null;
  declare flag: number | null;
  declare set: boolean | null;

  constructor(node: Node, flag: number, set: boolean) {
    super();
    this.node = node;
    this.flag = flag;
    this.set = set;
  }

  override toString(): string {
    return "[Event GNode.AfterFlagChangeEvent]";
  }
}

/** A change that is neither a property, a flag nor the tree (symbols, text, images use it). */
export class BeforeSpecialChangeEvent extends Event {
  static {
    registerClass(this, "GNode.BeforeSpecialChangeEvent");
  }
  declare node: Node | null;
  declare data: unknown;

  constructor(node: Node, data?: unknown) {
    super();
    this.node = node;
    this.data = data || null;
  }

  override toString(): string {
    return "[Event GNode.BeforeSpecialChangeEvent]";
  }
}

export class AfterSpecialChangeEvent extends Event {
  static {
    registerClass(this, "GNode.AfterSpecialChangeEvent");
  }
  declare node: Node | null;
  declare data: unknown;

  constructor(node: Node, data?: unknown) {
    super();
    this.node = node;
    this.data = data || null;
  }

  override toString(): string {
    return "[Event GNode.AfterSpecialChangeEvent]";
  }
}

/** A node finished restoring from a blob (sent for every restored node). */
export class AfterRestoreEvent extends Event {
  static {
    registerClass(this, "GNode.AfterRestoreEvent");
  }
  declare node: Node | null;

  constructor(node: Node) {
    super();
    this.node = node;
  }

  override toString(): string {
    return "[Event GNode.AfterRestoreEvent]";
  }
}

for (const cls of [
  BeforeInsertEvent,
  AfterInsertEvent,
  BeforeRemoveEvent,
  AfterRemoveEvent,
  BeforePropertiesChangeEvent,
  AfterPropertiesChangeEvent,
  BeforeFlagChangeEvent,
  AfterFlagChangeEvent,
  BeforeSpecialChangeEvent,
  AfterSpecialChangeEvent,
  AfterRestoreEvent,
]) {
  const proto = cls.prototype as unknown as Record<string, unknown>;
  proto["node"] = null;
}
for (const cls of [AfterInsertEvent, BeforeRemoveEvent, AfterPropertiesChangeEvent]) {
  (cls.prototype as unknown as Record<string, unknown>)["customObj"] = null;
}
for (const cls of [BeforePropertiesChangeEvent, AfterPropertiesChangeEvent]) {
  const proto = cls.prototype as unknown as Record<string, unknown>;
  proto["properties"] = null;
  proto["values"] = null;
  proto["custom"] = null;
  proto["temporary"] = false;
}
for (const cls of [BeforeFlagChangeEvent, AfterFlagChangeEvent]) {
  const proto = cls.prototype as unknown as Record<string, unknown>;
  proto["flag"] = null;
  proto["set"] = null;
}
for (const cls of [BeforeSpecialChangeEvent, AfterSpecialChangeEvent]) {
  (cls.prototype as unknown as Record<string, unknown>)["data"] = null;
}
