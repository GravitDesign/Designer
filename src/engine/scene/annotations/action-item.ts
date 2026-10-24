// Old: chunk.vendor.js module 727 (GActionItem).
/**
 * A button drawn next to an actionable element (GActionable): it paints
 * itself, says how big it is and runs when clicked. Subclasses implement
 * all three; the base paints nothing and throws for the first two.
 */
import type { Rect } from "../../math/rect.ts";

export class ActionItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature, implemented by subclasses
  paint(context: unknown, transform: unknown): void {
    throw new Error("Not implemented");
  }

  getSourceBBox(): Rect {
    throw new Error("Not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature, implemented by subclasses
  execute(element: unknown, event: unknown, arg: unknown): void {}
}
