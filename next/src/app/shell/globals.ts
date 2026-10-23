/**
 * The old app's globals as module singletons: gDesigner, gContainer,
 * gDragImage() and window.gravit (designer.browser.dev.js module 1483).
 * Nothing is put on window; see docs/rewrite/UI.md, section 3.
 */
import type { Container } from "./container.ts";
import type { Designer } from "./designer.ts";
import type { AppRegistry } from "./registry.ts";

let currentDesigner: Designer | null = null;
let currentContainer: Container | null = null;
let currentRegistry: AppRegistry | null = null;
let dragImageElement: HTMLDivElement | null = null;

/** The old gDesigner. Throws before boot created it. */
export function designer(): Designer {
  if (!currentDesigner) throw new Error("the designer is not created yet");
  return currentDesigner;
}

/** The designer, or null before boot (for code that may run earlier). */
export function designerOrNull(): Designer | null {
  return currentDesigner;
}

const designerCallbacks: ((designer: Designer) => void)[] = [];

export function setDesigner(value: Designer | null): void {
  currentDesigner = value;
  if (value) for (const callback of designerCallbacks.splice(0)) callback(value);
}

/**
 * Runs `callback` with the designer as soon as it exists (right away when
 * it does): for modules that load before boot and must follow it.
 */
export function whenDesigner(callback: (designer: Designer) => void): void {
  if (currentDesigner) callback(currentDesigner);
  else designerCallbacks.push(callback);
}

/** The old gContainer. Throws before boot set it. */
export function container(): Container {
  if (!currentContainer) throw new Error("the container is not set yet");
  return currentContainer;
}

export function containerOrNull(): Container | null {
  return currentContainer;
}

export function setContainer(value: Container | null): void {
  currentContainer = value;
}

/** The old window.gravit table (tools, actions, sidebars, panels, footer). */
export function appRegistry(): AppRegistry {
  if (!currentRegistry) throw new Error("the app registry is not built yet");
  return currentRegistry;
}

export function appRegistryOrNull(): AppRegistry | null {
  return currentRegistry;
}

export function setAppRegistry(value: AppRegistry | null): void {
  currentRegistry = value;
}

/**
 * The old gDragImage(): the shared drag image element, emptied and with
 * its class and style reset on every call.
 */
export function dragImage(): HTMLDivElement {
  if (!dragImageElement) throw new Error("the drag image is not created yet");
  const element = dragImageElement;
  element.replaceChildren();
  element.setAttribute("class", "g-drag-image");
  element.setAttribute("style", "");
  return element;
}

export function setDragImageElement(element: HTMLDivElement | null): void {
  dragImageElement = element;
}

/** Forgets every singleton (unit tests). */
export function resetGlobals(): void {
  currentDesigner = null;
  currentContainer = null;
  currentRegistry = null;
  dragImageElement = null;
}
