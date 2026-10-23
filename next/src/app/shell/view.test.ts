import { describe, expect, it } from "vitest";
import { Panel } from "../inspector/panel.ts";
import { View } from "./view.ts";

describe("GView (UI-INSPECT-013)", () => {
  it("triggers the shared update event its hosts listen for", () => {
    class TestView extends View {
      override getId(): string {
        return "test";
      }

      update(): void {
        this._fireUpdateEvent();
      }
    }
    const view = new TestView();
    const seen: unknown[] = [];
    view.addEventListener(View.UpdateEvent, (event) => seen.push(event));
    view.update();
    expect(seen).toEqual([View.UPDATE_EVENT]);
    expect(view.isEnabled()).toBe(true);
    expect(view.isVisible()).toBe(true);
  });

  it("has no id or title of its own", () => {
    expect(() => new View().getId()).toThrow("Not Supported");
    expect(() => new View().getTitle()).toThrow("Not Supported");
  });

  it("makes panels views", () => {
    const panel = new Panel();
    expect(panel).toBeInstanceOf(View);
    expect(panel.toString()).toBe("[Object GPanel]");
  });
});
