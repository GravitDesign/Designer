// Old: chunk.vendor.js module 891.

/** Base class of the events the translation library sends. */
export class TranslationEvent {
  /** The event target that sent the event; set by trigger. */
  sender: unknown = null;
  /** The library never sets it; a listener can, to skip the remaining listeners. */
  isImmediatePropagationStopped?: boolean;

  protected _paramsToString(): string {
    return "";
  }
}
