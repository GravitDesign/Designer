// Old: designer.browser.dev.js module 355 (AppError).
/** An error whose text is shown to the user as is (toString gives the message). */
export class AppError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = "AppError";
  }

  override toString(): string {
    return this.message;
  }
}
