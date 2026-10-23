// Old: chunk.vendor.js module 472 (GReferenceEvent, not in the G barrel).
/**
 * Sent to a node when the scene links it to a reference (a style, a
 * symbol master, a path for text) or unlinks it; the node keeps the
 * reference ids in its `refs` property (SceneNode._referenceEvent).
 */
import { Event } from "../core/event.ts";
import { registerClass } from "../core/object.ts";
import type { Node } from "./node.ts";

export class ReferenceEvent extends Event {
  static {
    registerClass(this, "GReferenceEvent");
  }

  declare reference: Node | null;
  declare target: Node | null;
  declare linked: boolean | null;

  constructor(reference: Node, target: Node, linked: boolean) {
    super();
    this.reference = reference;
    this.target = target;
    this.linked = linked;
  }

  override toString(): string {
    return "[Event GReferenceEvent]";
  }
}

const proto = ReferenceEvent.prototype as unknown as Record<string, unknown>;
proto["reference"] = null;
proto["target"] = null;
proto["linked"] = null;
