// Old: designer.browser.dev.js module 606 (GPanel).
/**
 * A view the #panels part hosts (the panels next to the canvas). The
 * part calls init with the panel's container, then activate and
 * deactivate as the panel is shown and hidden.
 */
import { registerClass } from "../../engine/core/object.ts";
import { View } from "../shell/view.ts";

export class Panel extends View {
  static {
    registerClass(this, "GPanel");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the container
  init(_htmlElement: HTMLElement): void {}

  activate(): void {}

  deactivate(): void {}

  override isEnabled(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GPanel]";
  }
}
