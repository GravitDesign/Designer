// Old: designer.browser.dev.js module 808 (GApplicationStatusEvent).
/** The app finished a boot step: Init after the language, Ready after the first document. */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

const Status = { Init: 0, Ready: 1 } as const;

export type ApplicationStatus = (typeof Status)[keyof typeof Status];

export class ApplicationStatusEvent extends Event {
  static {
    registerClass(this, "GApplicationStatusEvent");
  }

  static readonly Status = Status;

  constructor(public status: ApplicationStatus) {
    super();
  }

  override toString(): string {
    return "[Object GApplicationStatusEvent]";
  }
}
