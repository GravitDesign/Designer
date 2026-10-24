import { describe, expect, it, vi } from "vitest";
import { EventTarget } from "../core/event-target.ts";
import { getTypeId, hasMixin } from "../core/object.ts";
import { Dictionary, DictionaryEntry } from "./dictionary.ts";

describe("Dictionary", () => {
  it("keeps the old type ids and base class", () => {
    expect(getTypeId(Dictionary)).toBe(64);
    expect(getTypeId(Dictionary.Entry)).toBe(65);
    expect(new Dictionary()).toBeInstanceOf(EventTarget);
    expect(hasMixin(new Dictionary(), EventTarget)).toBe(false);
    expect(new Dictionary().toString()).toBe("[GDictionary]");
  });

  it("recognizes dictionary urls", () => {
    expect(Dictionary.isDictionary("dictionary://abc")).toBe(true);
    expect(Dictionary.isDictionary("dictionary:/abc")).toBe(false);
    expect(Dictionary.isDictionary("http://x")).toBe(false);
    expect(Dictionary.isDictionary(null)).toBe(false);
  });

  it("reuses entries with the same value and counts references", () => {
    const dictionary = new Dictionary();
    expect(dictionary.putValueIfAbsent(null)).toBeNull();
    const a = dictionary.putValueIfAbsent("data:a") as DictionaryEntry;
    expect(a.references).toBe(1);
    expect(dictionary.putValueIfAbsent("data:a")).toBe(a);
    expect(a.references).toBe(2);
    const b = dictionary.putValueIfAbsent("data:b") as DictionaryEntry;
    expect(b).not.toBe(a);
    expect(dictionary.getEntries()).toEqual([a, b]);
    expect(dictionary.getValue(a.getUrl())).toBe("data:a");
    expect(dictionary.getValue(String(a.uuid))).toBe("data:a");
    expect(dictionary.getValue("dictionary://missing")).toBeNull();
    expect(a.getUrl()).toBe("dictionary://" + String(a.uuid));
  });

  it("removes entries only when asked and unreferenced", () => {
    const dictionary = new Dictionary();
    const entry = dictionary.putValueIfAbsent("v") as DictionaryEntry;
    dictionary.putValueIfAbsent("v");
    dictionary.removeEntry(entry.getUrl(), true);
    expect(entry.references).toBe(1);
    expect(dictionary.getEntry(entry.getUrl())).toBe(entry);
    dictionary.removeEntry(entry);
    expect(entry.references).toBe(0);
    expect(dictionary.getEntry(entry.getUrl())).toBe(entry);
    dictionary.removeEntry(entry, true);
    expect(entry.references).toBe(0);
    expect(dictionary.getEntry(entry.getUrl())).toBeUndefined();
  });

  it("warns on duplicated uuids", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dictionary = new Dictionary();
    expect(dictionary.addEntry(new DictionaryEntry("a", "id"))).toBe(true);
    expect(dictionary.addEntry(new DictionaryEntry("b", "id"))).toBe(false);
    expect(warn).toHaveBeenCalledWith("Duplicated entry");
    warn.mockRestore();
  });

  it("serializes and restores the entries", () => {
    const dictionary = new Dictionary();
    dictionary.addEntry(new DictionaryEntry("a", "u1", 3));
    dictionary.addEntry(new DictionaryEntry("b", "u2"));
    const blob = dictionary.serialize();
    expect(blob).toEqual({
      entries: [
        { uuid: "u1", value: "a", references: 3 },
        { uuid: "u2", value: "b", references: 1 },
      ],
    });
    const restored = new Dictionary();
    restored.deserialize(blob);
    expect(restored.getEntry("u1")?.references).toBe(3);
    restored.deserialize(null);
    expect(restored.getEntries()).toEqual([]);
  });

  it("merges values of known uuids and returns the old entries", () => {
    const target = new Dictionary();
    target.addEntry(new DictionaryEntry("old", "u1", 2));
    const source = new Dictionary();
    source.addEntry(new DictionaryEntry("new", "u1"));
    source.addEntry(new DictionaryEntry("other", "u2"));
    const previous = target.merge(source);
    expect(target.getValue("u1")).toBe("new");
    expect(target.getEntry("u2")).toBeUndefined();
    expect(previous.serialize().entries).toEqual([{ uuid: "u1", value: "old", references: 2 }]);
  });
});
