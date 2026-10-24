// Old: designer.browser.dev.js module 592 (an error description with an id).
/** A described error with its id; the old class had no methods. */
export class ErrorCode {
  constructor(
    public description: string | null = null,
    public cid: string | number | null = null,
  ) {}
}
