import { afterEach, describe, expect, it, vi } from "vitest";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { AppError } from "./app-error.ts";
import { AsyncCache } from "./async-cache.ts";
import { decode, encode, isBase64, isUrlSafeBase64, trim } from "./base64.ts";
import {
  base64StringToString,
  debounce,
  getExtensionFromString,
  getFileNameWithoutExtension,
  getSizeInfo,
  isDifferent,
  iterateAroundIndex,
  mergeNode,
  removeAllSuffixWhichLikeExtension,
  stringToBase64String,
  throttle,
  trimStart,
  watchDog,
} from "./designer-util.ts";
import { dataUrlToBlob, readACVFile, sanitizeFilename } from "./download.ts";
import { GError } from "./error.ts";
import { TypeMap } from "./type-map.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("AsyncCache", () => {
  it("keeps the promise until reset", async () => {
    let calls = 0;
    const cache = new AsyncCache(() => Promise.resolve(++calls));
    expect(await cache.get()).toBe(1);
    expect(await cache.get()).toBe(1);
    cache.reset();
    expect(await cache.get()).toBe(2);
    cache.setCacheValue(7);
    expect(await cache.get()).toBe(7);
  });

  it("drops the promise after the timeout", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const cache = new AsyncCache(() => Promise.resolve(++calls), 1000);
    expect(await cache.get()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(await cache.get()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(await cache.get()).toBe(2);
  });
});

describe("base64 helpers", () => {
  it("converts between the alphabets", () => {
    expect(encode("a+b/c==")).toBe("a-b_c==");
    expect(trim(encode("a+b/c=="))).toBe("a-b_c");
    expect(decode("a-b_c..")).toBe("a+b/c==");
    expect(isBase64("ab+/==")).toBe(true);
    expect(isBase64("ab-_")).toBe(false);
    expect(isUrlSafeBase64("ab-_..")).toBe(true);
  });

  it("round-trips UTF-8 text and gives '' for bad input", () => {
    expect(base64StringToString(stringToBase64String("Größe ✓"))).toBe("Größe ✓");
    expect(base64StringToString("###")).toBe("");
  });
});

describe("string helpers", () => {
  it("handles extensions", () => {
    expect(getFileNameWithoutExtension("Plan.GVDESIGN", "gvdesign")).toBe("Plan");
    expect(getFileNameWithoutExtension("Plan.pdf", "gvdesign")).toBe("Plan.pdf");
    expect(removeAllSuffixWhichLikeExtension("a.svg.SVG.svg", "svg")).toBe("a");
    expect(getExtensionFromString("my file.PDF here", ["pdf", "svg"])).toBe("PDF");
    expect(getExtensionFromString("nothing", ["pdf"])).toBeNull();
    expect(trimStart("prefix-name", "prefix-")).toBe("name");
    expect(trimStart("name", "prefix-")).toBe("name");
  });

  it("splits sizes into decimal units", () => {
    expect(getSizeInfo(2_345_678_901)).toEqual({ gb: 2, mb: 345, kb: 678 });
    expect(getSizeInfo(999)).toEqual({ gb: 0, mb: 0, kb: 0 });
  });
});

describe("iterateAroundIndex", () => {
  it("alternates outwards from the start", () => {
    const seen: number[] = [];
    iterateAroundIndex([0, 1, 2, 3, 4, 5], 2, (_item, index) => seen.push(index));
    expect(seen).toEqual([2, 3, 1, 4, 0, 5]);
    const fromEnd: number[] = [];
    iterateAroundIndex([0, 1, 2, 3], 3, (_item, index) => fromEnd.push(index));
    expect(fromEnd).toEqual([3, 2, 1, 0]);
  });
});

describe("timing helpers", () => {
  it("debounce calls once after the last call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    vi.advanceTimersByTime(50);
    debounced(2);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it("throttle ignores calls within the wait", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    throttled(2);
    vi.advanceTimersByTime(100);
    throttled(3);
    expect(fn.mock.calls).toEqual([[1], [3]]);
  });

  it("watchDog lets everything through (every Pro feature is on)", () => {
    const handler = vi.fn(() => "ran");
    expect(watchDog.trap(handler)("event")).toBe("ran");
    expect(watchDog.check(5)).toBe(5);
  });
});

describe("isDifferent and mergeNode", () => {
  it("finds property and child differences and merges them", () => {
    const source = new Group();
    source.appendChild(new Rectangle());
    const json = Node.serialize(source) as string;
    const a = Node.deserialize(json) as Group;
    const b = Node.deserialize(json) as Group;
    expect(isDifferent(a, b)).toBe(false);
    (b.getFirstChild() as Rectangle).setProperty("name", "Changed");
    // Merging a rectangle copies its properties.
    const target = a.getFirstChild() as Rectangle;
    mergeNode(target, b.getFirstChild() as Rectangle);
    expect(target.getProperty("name")).toBe("Changed");
    b.appendChild(new Rectangle());
    expect(isDifferent(a, b)).toBe(true);
    // A group has no paint layers, so _mergeStyle throws and the merge
    // stops there (logged), like the old code.
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mergeNode(a, b);
    expect(log).toHaveBeenCalled();
    expect(a.getChildren()).toHaveLength(1);
  });
});

describe("download helpers", () => {
  it("re-exports the exporter's sanitizeFilename", () => {
    expect(sanitizeFilename('a:b*c"d.')).toBe("a_b_c_d_");
  });

  it("decodes data URLs", async () => {
    const blob = dataUrlToBlob("data:text/plain;base64,aGk=");
    expect(blob.type).toBe("text/plain");
    expect(await blob.text()).toBe("hi");
    expect(await dataUrlToBlob("data:text/plain,hello").text()).toBe("hello");
    expect((await dataUrlToBlob("data:text/plain;base64,###").arrayBuffer()).byteLength).toBe(0);
  });

  it("reads an ACV curve file", () => {
    // Version 4, 4 curves; composite: 2 points, then r, g, b with 1 point each.
    const words = [4, 4, 2, 7, 0, 255, 200, 1, 10, 20, 1, 30, 40, 1, 50, 60];
    const view = new DataView(new ArrayBuffer(words.length * 2));
    words.forEach((word, i) => view.setUint16(i * 2, word));
    expect(readACVFile(view.buffer)).toEqual({
      rgb: [
        [0, 7],
        [200, 255],
      ],
      r: [[20, 10]],
      g: [[40, 30]],
      b: [[60, 50]],
    });
  });
});

describe("small classes", () => {
  it("TypeMap copies keys and checks values", () => {
    expect(TypeMap.from({})).toBeNull();
    const map = TypeMap.from({ a: "12", b: null }) as TypeMap;
    expect(map.hasKey("b")).toBe(true);
    expect(map.hasValue("b")).toBe(false);
    expect(map.getAsInt("a")).toBe(12);
  });

  it("errors keep their names and texts", () => {
    expect(String(new AppError("shown as is"))).toBe("shown as is");
    expect(new AppError("x")).toBeInstanceOf(AppError);
    expect(String(new GError("x"))).toBe("[Object GError]");
  });
});
