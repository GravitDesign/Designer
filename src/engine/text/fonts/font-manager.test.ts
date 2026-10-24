import { describe, expect, it } from "vitest";
import { getTypeId } from "../../core/object.ts";
import { Font } from "./font.ts";
import { FontEntry } from "./font-entry.ts";
import {
  FontAvailableEvent,
  FontManager,
  FontUnavailableEvent,
  QueryFontFamilyEvent,
  ResolveFontEvent,
} from "./font-manager.ts";

/** A resolved font for the tests (only the identity matters). */
class ResolvedFont extends FontEntry {
  override isResolved(): boolean {
    return true;
  }
}

function recorder(manager: FontManager) {
  const events: string[] = [];
  manager.addEventListener(FontAvailableEvent, (e) =>
    events.push("available " + e.font.getWeight()),
  );
  manager.addEventListener(FontUnavailableEvent, (e) =>
    events.push("unavailable " + e.font.getWeight()),
  );
  return events;
}

describe("FontManager.getFont", () => {
  it("returns null and remembers nothing without a resolver", () => {
    const manager = new FontManager();
    expect(manager.getFont("Open Sans", "N", 400)).toBe(null);
    expect(manager.getFonts()).toEqual([]);
    expect(manager.hasPendingFonts()).toBe(false);
  });

  it("returns a font the resolver resolves synchronously and announces it", () => {
    const manager = new FontManager();
    const events = recorder(manager);
    const font = new ResolvedFont("Open Sans", "N", 700);
    const requests: unknown[] = [];
    manager.addEventListener(ResolveFontEvent, (e) => {
      requests.push([e.family, e.style, e.weight, e.tryToResolveMissingFont]);
      e.resolved(font);
    });
    expect(manager.getFont("Open Sans", "N", 700)).toBe(font);
    expect(manager.getFont("Open Sans", "N", 700)).toBe(font);
    expect(requests).toEqual([["Open Sans", "N", 700, true]]);
    expect(events).toEqual(["available 700"]);
    expect(manager.getFonts()).toEqual([font]);
  });

  it("keeps a pending placeholder and asks again on every call until resolved", () => {
    const manager = new FontManager();
    const pending: ResolveFontEvent[] = [];
    manager.addEventListener(ResolveFontEvent, (e) => pending.push(e));
    const placeholder = manager.getFont("Open Sans", "I", 800, false);
    expect(placeholder).toBeInstanceOf(FontEntry);
    expect(placeholder?.isResolved()).toBe(false);
    expect(manager.getFont("Open Sans", "I", 800)).toBe(placeholder);
    expect(pending.map((e) => e.tryToResolveMissingFont)).toEqual([false, true]);
    expect(manager.hasPendingFonts()).toBe(true);
    expect(manager.hasUnresolvedFonts()).toBe(true);
    const font = new ResolvedFont("Open Sans", "I", 800);
    pending[0]?.resolved(font);
    expect(manager.getFonts()).toEqual([font]);
    expect(manager.hasPendingFonts()).toBe(false);
    expect(manager.hasUnresolvedFonts()).toBe(false);
  });

  it("marks a font failed until it is asked for again", () => {
    const manager = new FontManager();
    const events = recorder(manager);
    let fail = true;
    manager.addEventListener(ResolveFontEvent, (e) => {
      if (fail) e.failed();
    });
    const placeholder = manager.getFont("Missing", "N", 400) as Font;
    expect(placeholder.isFailed()).toBe(true);
    expect(events).toEqual(["unavailable 400"]);
    expect(manager.hasPendingFonts()).toBe(false);
    expect(manager.hasUnresolvedFonts()).toBe(true);
    fail = false;
    expect(manager.getFont("Missing", "N", 400)).toBe(placeholder);
    expect(placeholder.isFailed()).toBe(false);
    expect(manager.hasPendingFonts()).toBe(true);
  });

  it("ignores unresolved fonts and fonts nobody asked for in resolved()", () => {
    const manager = new FontManager();
    const events = recorder(manager);
    let event: ResolveFontEvent | null = null;
    manager.addEventListener(ResolveFontEvent, (e) => (event = e));
    manager.getFont("A", "N", 400);
    const resolve = (event as unknown as ResolveFontEvent).resolved;
    resolve(new FontEntry("A", "N", 400));
    resolve(new ResolvedFont("B", "N", 400));
    expect(events).toEqual([]);
    expect(manager.getFonts()[0]?.isResolved()).toBe(false);
  });
});

describe("FontManager defaults and families", () => {
  it("swaps an unresolved default font for a resolved equal one, now or when it resolves", () => {
    const manager = new FontManager();
    const known = new ResolvedFont("Open Sans", "N", 400);
    manager.addEventListener(ResolveFontEvent, (e) => e.resolved(known));
    manager.getFont("Open Sans", "N", 400);
    manager.setDefaultFont(new FontEntry("Open Sans", "N", 400));
    expect(manager.getDefaultFont()).toBe(known);

    const later = new FontManager();
    let event: ResolveFontEvent | null = null;
    later.addEventListener(ResolveFontEvent, (e) => (event = e));
    later.getFont("Lato", "N", 400);
    const placeholder = new FontEntry("Lato", "N", 400);
    later.setDefaultFont(placeholder);
    expect(later.getDefaultFont()).toBe(placeholder);
    const lato = new ResolvedFont("Lato", "N", 400);
    (event as unknown as ResolveFontEvent).resolved(lato);
    expect(later.getDefaultFont()).toBe(lato);
  });

  it("stores default styles and weights as given", () => {
    const manager = new FontManager();
    expect(manager.getDefaultFontStyles()).toBe(null);
    manager.setDefaultFontStyles(["N", "I"]);
    manager.setDefaultFontWeights([400, 700]);
    expect(manager.getDefaultFontStyles()).toEqual(["N", "I"]);
    expect(manager.getDefaultFontWeights()).toEqual([400, 700]);
  });

  it("turns the resolved fonts of a family back into placeholders", () => {
    const manager = new FontManager();
    manager.addEventListener(ResolveFontEvent, (e) =>
      e.resolved(new ResolvedFont(e.family, e.style, e.weight)),
    );
    manager.getFont("A", "N", 400);
    manager.getFont("A", "I", 400);
    manager.getFont("B", "N", 400);
    manager.removeFont("A");
    expect(manager.getFonts().map((f) => [f.getFamily(), f.getStyle(), f.isResolved()])).toEqual([
      ["A", "N", false],
      ["A", "I", false],
      ["B", "N", true],
    ]);
  });

  it("answers queryFontFamily through the listener, else undefined", () => {
    const manager = new FontManager();
    expect(manager.queryFontFamily("A")).toBe(undefined);
    manager.addEventListener(QueryFontFamilyEvent, (e) => e.callback([e.family + "!"]));
    expect(manager.queryFontFamily("A")).toEqual(["A!"]);
  });

  it("keeps the old type ids and event names", () => {
    expect(getTypeId(FontManager)).toBe(57);
    expect(getTypeId(FontManager.FontAvailableEvent)).toBe(58);
    expect(getTypeId(FontManager.ResolveFontEvent)).toBe(60);
    expect(String(new QueryFontFamilyEvent("A", () => {}))).toBe(
      "[Event GFontManager.QueryFontFamilyEvent]",
    );
  });
});

describe("Font", () => {
  it("compares by family, style and weight; two missing fonts are equal", () => {
    expect(Font.equals(new FontEntry("A", "N", 400), new FontEntry("A", "N", 400))).toBe(true);
    expect(Font.equals(new FontEntry("A", "N", 400), new FontEntry("A", "I", 400))).toBe(false);
    expect(Font.equals(null, undefined)).toBe(true);
    expect(Font.equals(new FontEntry("A", "N", 400), null)).toBe(false);
  });

  it("corrects the old CJK family names only", () => {
    expect(
      ["Noto Sans CS", "Noto Sans CT", "Open Sans"].map((f) => Font.getFontFamilyCorrected(f)),
    ).toEqual(["Noto Sans CJK SC", "Noto Sans CJK TC", "Open Sans"]);
  });

  it("builds CSS properties and throws on unknown styles", () => {
    expect(new FontEntry("A", "I", 700).toCssProperties()).toEqual({
      "font-family": "A",
      "font-style": "italic",
      "font-weight": "700",
    });
    expect(new FontEntry("A", "N", 0).toCssProperties()["font-weight"]).toBe(null);
    expect(() => new FontEntry("A", "X", 400).toCssProperties()).toThrow("Unknown style");
  });

  it("throws for the glyph API on the base class", () => {
    const font = new Font();
    expect(() => font.isResolved()).toThrow("Unsupported operation.");
    expect(() => font.getAdvance(10, "a")).toThrow("Unsupported operation.");
    expect(font.isFailed()).toBe(false);
    expect(font.hasFeature("smcp")).toBe(false);
    expect(getTypeId(Font)).toBe(55);
  });
});
