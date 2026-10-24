// Old: designer.browser.dev.js module 217 (GDocumentStatusEvent).
/**
 * A document's status changed (module 86 numbers). Triggered on the
 * document and on the fonts provider manager, which closes its dialogs
 * while a file loads.
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export class DocumentStatusEvent extends Event {
  static {
    registerClass(this, "GDocumentStatusEvent");
  }

  constructor(
    public status: number,
    public data?: unknown,
  ) {
    super();
  }

  override toString(): string {
    return "[Object GDocumentStatusEvent]";
  }
}
