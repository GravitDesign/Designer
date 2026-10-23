// Old: chunk.vendor.js module 15 (the input namespace).
/**
 * Keys, mouse events, modifiers and the platform, with the scene view, as
 * the old input namespace exported them. GInputRecorder (module 645, a
 * development input recorder) is dropped (port-map.tsv).
 */
export { Key } from "../engine/core/key.ts";
export { SceneWidget } from "./view/scene-widget.ts";
export { MouseEvent } from "../engine/core/mouse-event.ts";
export { Modifiers } from "../engine/core/modifiers.ts";
export { ModifiersChangedEvent } from "../engine/core/modifiers-changed-event.ts";
export { Platform } from "../engine/core/platform.ts";
