/**
 * What the shell expects of the views it hosts in the footer, the panels
 * part and the sidebars (GView subclasses: GPanel, GSidebar and the
 * footer panels). Structural, so the clusters that write them don't
 * depend on these files.
 */
import type { Event, EventClass } from "../../engine/core/event.ts";
import type { LocaleKey } from "../../engine/core/locale/locale-key.ts";

export interface HostedView {
  getId(): string;
  getTitle?(): LocaleKey | string;
  isEnabled(): boolean;
  init(container: HTMLElement): void;
  activate(): void;
  deactivate(): void;
  addEventListener<E extends Event>(
    eventClass: EventClass<E>,
    listener: (event: E) => void,
    target?: object | null,
  ): void;
}

/** A part of the frame (header, toolbar, ...) as GDesigner drove it. */
export interface ShellPart {
  init(): void;
  relayout(): void;
}
