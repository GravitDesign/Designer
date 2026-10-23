// Old: designer.browser.dev.js module 1557 (GRepeatActionError).
/** Thrown by an action that wants to be run again ("REPEAT"). */
export class RepeatActionError extends Error {
  constructor() {
    super("REPEAT");
    this.name = "GRepeatActionError";
  }
}
