import { describe, expect, it } from "vitest";
import { getTypeId } from "../object.ts";
import { readBrowserLanguage } from "./browser-language.ts";
import { className } from "./class-name.ts";
import { LocaleKey } from "./locale-key.ts";
import { TranslationEvent } from "./translation-event.ts";
import { TranslationEventTarget } from "./translation-event-target.ts";
import { TranslationNotificationEvent } from "./translation-notification-event.ts";

class OtherEvent extends TranslationEvent {}

describe("TranslationEventTarget", () => {
  it("delivers events of exactly the registered class, in order", () => {
    const target = new TranslationEventTarget();
    const calls: string[] = [];
    target.addEventListener(TranslationNotificationEvent, () => calls.push("second"));
    target.addEventListener(
      TranslationNotificationEvent,
      () => calls.push("first"),
      null,
      null,
      true,
    );
    target.addEventListener(TranslationEvent, () => calls.push("base"));
    const event = new TranslationNotificationEvent("Designer", "Warning", "x", null);
    target.trigger(event);
    expect(calls).toEqual(["first", "second"]);
    expect(event.sender).toBe(target);
    target.trigger(new OtherEvent());
    expect(calls).toHaveLength(2);
  });

  it("binds listeners to a target with extra arguments", () => {
    const target = new TranslationEventTarget();
    const owner = { name: "owner" };
    const seen: unknown[] = [];
    function listener(this: { name: string }, extra: string, event: TranslationEvent) {
      seen.push(this.name, extra, event instanceof OtherEvent);
    }
    target.addEventListener(OtherEvent, listener as never, owner, ["extra"]);
    target.trigger(new OtherEvent());
    expect(seen).toEqual(["owner", "extra", true]);
  });

  it("removes listeners, by target when given", () => {
    const target = new TranslationEventTarget();
    const calls: string[] = [];
    const listener = () => calls.push("x");
    const a = {};
    const b = {};
    target.addEventListener(OtherEvent, listener, a);
    target.addEventListener(OtherEvent, listener, b);
    expect(target.removeEventListener(OtherEvent, listener, a)).toBe(true);
    target.trigger(new OtherEvent());
    expect(calls).toEqual(["x"]);
    expect(target.removeEventListener(OtherEvent, listener)).toBe(true);
    expect(target.hasEventListeners(OtherEvent)).toBe(false);
    expect(target.removeEventListener(OtherEvent, listener)).toBe(false);
  });

  it("skips a listener removed by an earlier one during trigger", () => {
    const target = new TranslationEventTarget();
    const calls: string[] = [];
    const second = () => calls.push("second");
    target.addEventListener(OtherEvent, () => {
      calls.push("first");
      target.removeEventListener(OtherEvent, second);
    });
    target.addEventListener(OtherEvent, second);
    target.trigger(new OtherEvent());
    expect(calls).toEqual(["first"]);
  });

  it("stops when a listener stops immediate propagation", () => {
    const target = new TranslationEventTarget();
    const calls: string[] = [];
    target.addEventListener(OtherEvent, (e) => {
      calls.push("first");
      e.isImmediatePropagationStopped = true;
    });
    target.addEventListener(OtherEvent, () => calls.push("second"));
    target.trigger(new OtherEvent());
    expect(calls).toEqual(["first"]);
  });
});

describe("small helpers", () => {
  it("names class ids", () => {
    class GThing {
      readonly kind = "thing";
    }
    expect(className("GThing")).toBe("GThing");
    expect(className(GThing)).toBe("GThing");
    expect(className(new GThing())).toBe("GThing");
    expect(className(null)).toBe("<null>");
    expect(new LocaleKey("GLength", "unit.pt").getClassReference()).toBe("GLength");
    expect(new LocaleKey("GLength", "unit.pt").getKey()).toBe("unit.pt");
  });

  it("reads the browser language like the old library", () => {
    expect(readBrowserLanguage({ language: "de-DE" })).toEqual({
      language: "de",
      fullLanguage: "de-de",
    });
    expect(readBrowserLanguage({ userLanguage: "zh-Hant-TW" })).toEqual({
      language: "zh",
      fullLanguage: "zh-hant-tw",
    });
    expect(readBrowserLanguage(undefined)).toEqual(readBrowserLanguage(globalThis.navigator));
  });

  it("formats the notification event", () => {
    expect(String(new TranslationNotificationEvent(null, null, null, null))).toBe(
      "[Object GTranslationNotificationEvent]",
    );
  });
});

describe("type id", () => {
  it("keeps the old id of GTranslationNotificationEvent", () => {
    expect(getTypeId(TranslationNotificationEvent)).toBe(1);
  });
});
