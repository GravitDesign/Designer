// Old: chunk.vendor.js module 638 (GTranslationNotificationEvent).
import { registerClass } from "../object.ts";
import { TranslationEvent } from "./translation-event.ts";

/** Sent when a lookup uses a class object instead of a class name. */
export class TranslationNotificationEvent extends TranslationEvent {
  static {
    // The number comes from the translation library's own type counter.
    registerClass(this, "GTranslationNotificationEvent", { id: 1 });
  }

  static readonly Type = {
    Warning: "Warning",
  } as const;

  project: string | null;
  type: string | null;
  content: string | null;
  data: unknown;

  constructor(project: string | null, type: string | null, content: string | null, data: unknown) {
    super();
    this.project = project;
    this.type = type;
    this.content = content;
    this.data = data;
  }

  override toString(): string {
    return "[Object GTranslationNotificationEvent]";
  }
}
