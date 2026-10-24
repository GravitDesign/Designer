import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Action } from "../actions/action.ts";
import { applicationManager } from "../actions/host.ts";
import { config } from "../config.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { setLateModules } from "../shell/late.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import type { Window } from "../shell/window.ts";
import { WindowEvent } from "../shell/windows.ts";
import { duplicateTitle, Header, windowOfTab } from "./header.ts";
import { Menu } from "./menu.ts";
import { MenuItem } from "./menu-item.ts";
import { fake, fire, installFakeDom, type FakeDomHandle } from "./testing/fake-dom.testing.ts";

class FakeWindows extends EventTarget {
  active: unknown = null;
  readonly activated: unknown[] = [];
  readonly removed: unknown[] = [];
  readonly list: unknown[] = [];
  getWindows(): unknown[] {
    return this.list;
  }
  getActiveWindow(): unknown {
    return this.active;
  }
  activateWindow(window: unknown): void {
    this.activated.push(window);
  }
  removeWindow(window: unknown): void {
    this.removed.push(window);
  }
  getWindow(): unknown {
    return null;
  }
}

class StubAction extends Action {
  constructor(private readonly _id: string) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._id;
  }
  override getIcon(): string {
    return "icon-" + this._id;
  }
  override getGroupIcon(): string {
    return "group-icon-" + this._id;
  }
  override execute(): void {}
}

class FakeDesigner extends EventTarget {
  readonly windows = new FakeWindows();
  readonly menu = new Menu();
  readonly actions = new Map<string, Action>();
  readonly documents: unknown[] = [];
  readonly added: [unknown, number][] = [];
  getAction(id: string): Action | null {
    return this.actions.get(id) || null;
  }
  getDocuments(): unknown[] {
    return this.documents;
  }
  addDocument(document: unknown, index: number): void {
    this.added.push([document, index]);
  }
  getWorkspace(): string {
    return "workspace";
  }
  getMainMenu(): Menu {
    return this.menu;
  }
  getWindows(): FakeWindows {
    return this.windows;
  }
  getActiveDocument(): null {
    return null;
  }
  isBeta(): boolean {
    return false;
  }
  isTouchEnabled(): boolean {
    return false;
  }
}

function fakeWindow(title: string, modified = false) {
  const document = {
    modified,
    windows: [] as unknown[],
    getWindows() {
      return this.windows;
    },
    isModified() {
      return this.modified;
    },
  };
  const window = {
    getTitle: () => title,
    getTitleWithExtension: () => title,
    getDocument: () => document,
  };
  document.windows.push(window);
  return { window: window as unknown as Window, document };
}

let dom: FakeDomHandle;
let designer: FakeDesigner;
let header: Header;
let part: ReturnType<FakeDomHandle["document"]["createElement"]>;

beforeEach(() => {
  dom = installFakeDom();
  designer = new FakeDesigner();
  setDesigner(designer as never);
  part = dom.document.createElement("div");
  dom.document.body.append(part);
  header = new Header(part as unknown as HTMLElement);
  header.init();
});
afterEach(() => {
  vi.restoreAllMocks();
  setLateModules({});
  resetGlobals();
  dom.uninstall();
});

const tabs = () => part.querySelectorAll(".tab");

describe("Header", () => {
  it("builds the sections in the old order with the main menu in the bar", () => {
    expect(part.children.map((c) => c.className)).toEqual([
      "section menu",
      "section persona",
      "section windows",
      "section busy",
    ]);
    // The persona bar is dropped (REMOVED.md DROP-003): its section is an
    // empty spacer.
    expect(part.children[1]?.children).toEqual([]);
    const nav = part.children[0]?.children[0];
    expect(nav?.className).toBe("g-menu-bar");
    expect(nav?.children[0]).toBe(fake(designer.menu.getHtmlElement()));
    expect(fake(designer.menu.getHtmlElement()).className).toBe("g-menu g-menu-root");
    // The browser drops the placeholder colour; the fake keeps it.
    expect(part.children[3]?.getAttribute("style")).toMatch(/^display: none;/);
  });

  it("adds a tab per window with its title, close button and active state", () => {
    const first = fakeWindow("Untitled-1");
    const second = fakeWindow("Poster");
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, first.window));
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, second.window, 0));
    expect(tabs().map((t) => t.querySelector(".cover")?.textContent)).toEqual([
      "Poster",
      "Untitled-1",
    ]);
    const tab = tabs()[1];
    expect(windowOfTab(tab as unknown as Element)).toBe(first.window);
    expect(tab?.children.map((c) => c.className)).toEqual(["title", "close"]);
    expect(tab?.querySelector("input")?.getAttribute("style")).toBe("display: none;");
    expect(tab?.querySelector(".close")?.getAttribute("style")).toBe("pointer-events: auto;");
    designer.windows.active = first.window;
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Activated, first.window));
    expect(tabs().map((t) => t.classList.contains("g-active"))).toEqual([false, true]);
    fire(tab, "click");
    expect(designer.windows.activated).toEqual([first.window]);
    fire(tab?.querySelector(".close"), "click");
    expect(designer.windows.removed).toEqual([first.window]);
    expect(designer.windows.activated).toHaveLength(1);
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Removed, first.window));
    expect(tabs()).toHaveLength(1);
  });

  it("marks a modified document's tab with a star and adds the sync status", () => {
    const { window, document } = fakeWindow("Untitled-1");
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, window));
    document.modified = true;
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Modified, document as never));
    const tab = tabs()[0];
    expect(tab?.querySelector(".cover")?.textContent).toBe("Untitled-1*");
    expect(tab?.querySelector("input")?.value).toBe("Untitled-1*");
  });
});

type Fake = ReturnType<typeof tabs>[number];

/** The tab menu of a window: its items in order and what it shows. */
function tabMenu(window: Window, tab: unknown) {
  const created = vi.spyOn(Menu.prototype, "createAddItem");
  const element = (
    header as unknown as { _createContextMenu(w: Window, t: unknown): HTMLElement }
  )._createContextMenu(window, tab);
  const items = created.mock.results.map((r) => r.value as MenuItem);
  created.mockRestore();
  return {
    items,
    // Visible entries: dividers as "-", items by caption, " (off)" when disabled.
    shown: fake(element)
      .children.filter((e) => e.getAttribute("style") !== "display: none;")
      .map((e) =>
        e.classList.contains("g-menu-item-divider")
          ? "-"
          : (e.children[1]?.textContent ?? "") +
            (e.classList.contains("g-disabled") ? " (off)" : ""),
      ),
  };
}

function addTab(title: string) {
  const created = fakeWindow(title);
  designer.windows.list.push(created.window);
  designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, created.window));
  return { ...created, tab: tabs()[tabs().length - 1] as Fake };
}

describe("Header tab menu", () => {
  it("skips entries whose action is missing and disables Close Other with one window", () => {
    designer.actions.set("file.save", new StubAction("file.save"));
    designer.actions.set("file.export", new StubAction("file.export"));
    const { window, tab } = addTab("Poster");
    const menu = tabMenu(window, tab);
    // Save As (cloud), Open Shared File and Version History have no action.
    expect(menu.items).toHaveLength(7);
    expect(menu.shown).toEqual([
      "Rename",
      "-",
      "Save",
      "-",
      "Share (off)",
      "Advanced Export...",
      "Duplicate",
      "-",
      "Close Other Files (off)",
      "Close All",
    ]);
    expect(menu.items[1]?.getIcon()).toBe("icon-file.save");
    expect(menu.items[3]?.getIcon()).toBe("group-icon-file.export");
    expect(menu.items[4]?.getIcon()).toBe("gravit-icon-duplicate");
    expect(menu.items[6]?.getIcon()).toBe("gravit-icon-close");
    const second = addTab("Flyer");
    expect(tabMenu(window, tab).shown).toContain("Close Other Files");
    expect(tabMenu(second.window, second.tab).shown).toContain("Close Other Files");
  });

  it("asks the application manager for Rename and Duplicate", () => {
    const { window, tab } = addTab("Poster");
    vi.spyOn(applicationManager(), "isEditingEnabled").mockReturnValue(false);
    vi.spyOn(applicationManager(), "isSavingAsEnabled").mockReturnValue(false);
    const shown = tabMenu(window, tab).shown;
    expect(shown).toContain("Rename (off)");
    expect(shown).toContain("Duplicate (off)");
  });

  it("clears the items and re-checks isEnabled before an item runs", () => {
    const { window, tab } = addTab("Poster");
    const menu = tabMenu(window, tab);
    const clear = vi.spyOn(Menu.prototype, "clearItems");
    const closeOther = menu.items[menu.items.length - 2] as MenuItem;
    expect(closeOther.isEnabled()).toBe(false);
    designer.windows.list.push(fakeWindow("Flyer").window);
    closeOther.trigger(MenuItem.BEFORE_ACTIVATE_EVENT);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(closeOther.isEnabled()).toBe(true);
  });

  it("duplicates the document after the source with a counted-up title", () => {
    class FakeDocumentClass {
      title = "";
      version: unknown = null;
      constructor(readonly scene: unknown) {}
      setTitle(title: string): void {
        this.title = title;
      }
      setFileFormatVersion(version: unknown): void {
        this.version = version;
      }
    }
    setLateModules({ "document/document.ts": { Document: FakeDocumentClass } });
    const { window, document, tab } = addTab("Poster(4)");
    const clones: unknown[] = [];
    Object.assign(document, {
      getScene: () => ({
        clone: (options: unknown, workspace: unknown) => {
          clones.push([options, workspace]);
          return "scene copy";
        },
      }),
      getFileFormatVersion: () => 7,
      getTitle: () => "Poster(4)",
    });
    designer.documents.push("other", document, "last");
    const menu = tabMenu(window, tab);
    (menu.items[2] as MenuItem).activate();
    expect(clones).toEqual([[null, "workspace"]]);
    expect(designer.added).toHaveLength(1);
    const [copy, index] = designer.added[0] as [FakeDocumentClass, number];
    expect(index).toBe(2);
    expect(copy.title).toBe("Poster(5)");
    expect(copy.version).toBe(7);
    expect(copy.scene).toBe("scene copy");
  });
});

describe("Header tab rename", () => {
  function setUp(withItem: boolean) {
    const { window, document } = fakeWindow("Poster");
    const renamed: string[] = [];
    const fileNames: string[] = [];
    Object.assign(document, {
      setTitle: (title: string) => renamed.push(title),
      getStorageItem: () =>
        withItem
          ? { getExtension: () => "GVDESIGN", setFileName: (n: string) => fileNames.push(n) }
          : null,
    });
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, window));
    const tab = tabs()[0] as Fake;
    const input = tab.querySelector("input") as Fake;
    const cover = tab.querySelector(".cover") as Fake;
    const rename = () =>
      (header as unknown as { _renameTab(w: Window, t: unknown): void })._renameTab(window, tab);
    return { input, cover, renamed, fileNames, rename };
  }

  it("commits once on Enter and ignores the focusout that follows", () => {
    const { input, cover, renamed, rename } = setUp(false);
    rename();
    expect(input.style.display).toBe("");
    expect(cover.style.display).toBe("none");
    expect(input.value).toBe("Poster");
    expect(dom.document.activeElement).toBe(input);
    input.value = "  Flyer ";
    fire(input, "keypress", { keyCode: 65 });
    expect(renamed).toEqual([]);
    fire(input, "keypress", { keyCode: 13 });
    fire(input, "focusout");
    fire(input, "keypress", { keyCode: 13 });
    expect(renamed).toEqual(["Flyer"]);
    expect(input.style.display).toBe("none");
    expect(cover.style.display).toBe("");
  });

  it("commits on focusout, and restores the old value for a blank or unchanged name", () => {
    const { input, renamed, rename } = setUp(false);
    rename();
    input.value = "Flyer";
    fire(input, "focusout");
    expect(renamed).toEqual(["Flyer"]);
    rename();
    input.value = "   ";
    fire(input, "focusout");
    expect(input.value).toBe("Poster");
    rename();
    input.value = "Poster";
    fire(input, "keypress", { keyCode: 13 });
    expect(renamed).toEqual(["Flyer"]);
  });

  it("drops the listeners of an earlier rename", () => {
    const { input, renamed, rename } = setUp(false);
    rename();
    rename();
    expect(input.listenerCount("focusout")).toBe(1);
    expect(input.listenerCount("keypress")).toBe(1);
    input.value = "Flyer";
    fire(input, "focusout");
    expect(renamed).toEqual(["Flyer"]);
  });

  it("renames the storage item too, fires Modified and shows the extension", () => {
    vi.spyOn(config, "USE_EXTENSION_IN_FILENAME", "get").mockReturnValue(true);
    const { input, cover, renamed, fileNames, rename } = setUp(true);
    const events: DocumentEvent[] = [];
    designer.addEventListener(DocumentEvent, (event: DocumentEvent) => {
      events.push(event);
    });
    rename();
    expect(cover.textContent).toBe("Poster.gvdesign");
    input.value = "Flyer";
    fire(input, "keypress", { keyCode: 13 });
    expect(renamed).toEqual(["Flyer"]);
    expect(fileNames).toEqual(["Flyer"]);
    expect(events.map((e) => e.type)).toContain(DocumentEvent.Type.Modified);
    expect(cover.textContent).toBe("Flyer.gvdesign");
  });
});

describe("duplicateTitle", () => {
  it("appends (1) or counts up the number at the end", () => {
    expect(duplicateTitle("Poster")).toBe("Poster(1)");
    expect(duplicateTitle("Poster(4)")).toBe("Poster(5)");
    expect(duplicateTitle("Poster (9) x")).toBe("Poster (9) x(1)");
  });
});
