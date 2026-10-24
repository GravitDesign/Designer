// Old: designer.browser.dev.js module 78 (GDocumentEvent).
/**
 * What happened to a document, triggered on the designer. Only some types
 * still fire in the local app (Added, Removed, Deactivated, Activated,
 * StorageItemUpdated, Saving, Modified, ContextMenuOpened, BeforeReload);
 * the sync, owner, cloud and auto-save types are kept for their numbers.
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

const Type = {
  Added: 0,
  Removed: 1,
  Opened: 2,
  Deactivated: 10,
  Activated: 11,
  StorageItemUpdated: 12,
  Saving: 20,
  Modified: 23,
  SynchronismUpdated: 30,
  SynchronismUpdateFailed: 31,
  OwnerUpdated: 40,
  CloudSynchronismUpdated: 50,
  UpdateAvailable: 60,
  BeforeReload: 70,
  AutoSaveSynchronizing: 80,
  AutoSaveSynchronized: 81,
  AutoSaveSynchronizationFailed: 82,
  ContextMenuOpened: 90,
} as const;

export type DocumentEventType = (typeof Type)[keyof typeof Type];

export class DocumentEvent<D = unknown> extends Event {
  static {
    registerClass(this, "GDocumentEvent");
  }

  static readonly Type = Type;

  /** Only set when the trigger passes data, like the old `n && (this.data = n)`. */
  data?: unknown;

  constructor(
    public type: DocumentEventType,
    public document: D,
    data?: unknown,
  ) {
    super();
    if (data) this.data = data;
  }

  override toString(): string {
    return "[Object GDocumentEvent]";
  }
}
