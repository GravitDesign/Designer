/**
 * The bits of the browser the storage tests need, for Vitest's node
 * environment: window with localStorage and the File System Access
 * functions, document with a fake <input>/<a> and body, FileReader,
 * MouseEvent and navigator.
 */
import { vi } from "vitest";

export class FakeLocalStorage {
  private readonly _map = new Map<string, string>();

  get length(): number {
    return this._map.size;
  }

  getItem(key: string): string | null {
    return this._map.has(key) ? (this._map.get(key) as string) : null;
  }

  setItem(key: string, value: unknown): void {
    this._map.set(key, String(value));
  }

  removeItem(key: string): void {
    this._map.delete(key);
  }

  key(index: number): string | null {
    return [...this._map.keys()][index] ?? null;
  }

  clear(): void {
    this._map.clear();
  }
}

export class FakeElement {
  readonly tagName: string;
  readonly attributes = new Map<string, string>();
  readonly style: Record<string, string> = {};
  readonly listeners = new Map<string, (() => void)[]>();
  readonly dispatched: Event[] = [];
  multiple = false;
  value = "";
  href = "";
  download = "";
  files: File[] | null = null;
  clicks = 0;
  focused = 0;

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  addEventListener(type: string, listener: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(event: Event): boolean {
    this.dispatched.push(event);
    return true;
  }

  focus(): void {
    this.focused++;
  }

  click(): void {
    this.clicks++;
  }

  /** Fires the change listeners with these files chosen. */
  choose(files: File[]): void {
    this.files = files;
    for (const listener of this.listeners.get("change") ?? []) listener();
  }
}

/** FileReader that answers from Blob.arrayBuffer on a later microtask. */
export class FakeFileReader {
  result: ArrayBuffer | string | null = null;
  onload: (() => void) | null = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onload?.();
      this.onloadend?.();
    });
  }

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.();
      this.onloadend?.();
    });
  }
}

export interface FakeDom {
  window: Record<string, unknown> & { localStorage: FakeLocalStorage };
  created: FakeElement[];
  appended: FakeElement[];
  navigator: { userAgent: string };
}

/** Installs the fakes as globals; undo with vi.unstubAllGlobals(). */
export function installFakeDom(): FakeDom {
  const created: FakeElement[] = [];
  const appended: FakeElement[] = [];
  const localStorage = new FakeLocalStorage();
  const win: FakeDom["window"] = { localStorage };
  const nav = { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120" };
  const create = (tag: string): FakeElement => {
    const element = new FakeElement(tag);
    created.push(element);
    return element;
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("navigator", nav);
  vi.stubGlobal("document", {
    createElement: create,
    createElementNS: (_ns: string, tag: string) => create(tag),
    body: { appendChild: (e: FakeElement) => appended.push(e) },
  });
  vi.stubGlobal("FileReader", FakeFileReader);
  vi.stubGlobal("MouseEvent", class extends Event {});
  return { window: win, created, appended, navigator: nav };
}

/** Lets pending promise callbacks and Blob reads run (not with fake timers). */
export async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));
  // saveAs clicks on a zero-delay timer, which Node runs after at least 1 ms.
  await new Promise((resolve) => setTimeout(resolve, 5));
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}
