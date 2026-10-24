import { GDate } from "../../engine/core/date.ts";
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { GObject } from "../../engine/core/object.ts";
import { System } from "../../engine/core/system.ts";
import { Util } from "../../engine/core/util.ts";

// Only the names the old G barrel (vendor module 1) exported: GKey,
// GPlatform and the input events were reachable only through other
// modules, and the type-id scenario walks every class in G.
export const engineCore = {
  GObject,
  GEvent: Event,
  GEventTarget: EventTarget,
  GSystem: System,
  GUtil: Util,
  GDate,
};
