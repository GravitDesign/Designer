import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Action } from "../actions/action.ts";
import type { Category } from "../actions/category.ts";
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { Menu } from "./menu.ts";
import { MenuItem } from "./menu-item.ts";
import { installFakeDom, type FakeDomHandle } from "./testing/fake-dom.testing.ts";

class GroupedAction extends Action {
  constructor(
    private readonly _id: string,
    private readonly _category: string | null,
    private readonly _group: string | null,
    private readonly _available = true,
  ) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._id;
  }
  override getCategory(): Category | null {
    // Locale.get passes a plain string through, as the old category labels did.
    return this._category as unknown as Category | null;
  }
  override getGroup(): string | null {
    return this._group;
  }
  override isAvailable(): boolean {
    return this._available;
  }
  override execute(): void {}
}

/** The menu as a tree: dividers "-", submenus [caption, children], items by action id. */
function tree(menu: Menu): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < menu.getItemCount(); i++) {
    const item = menu.getItem(i) as MenuItem;
    if (item.getType() === MenuItem.Type.Divider) out.push("-");
    else if (item.getAction()) out.push(item.getAction()?.getId());
    else out.push([item.getCaption(), tree(item.getMenu() as Menu)]);
  }
  return out;
}

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => {
  dom.uninstall();
});

describe("ActiveMenuManager.createActionMenu", () => {
  it("nests items by category and adds a divider where the group changes", () => {
    const menu = new Menu();
    ActiveMenuManager.createActionMenu(
      [
        new GroupedAction("top", null, null),
        new GroupedAction("new", "File", "a"),
        new GroupedAction("open", "File", "a"),
        new GroupedAction("hidden", "File", "a", false),
        new GroupedAction("close", "File", "b"),
        new GroupedAction("png", "File/Export", "a/x"),
        new GroupedAction("svg", "File/Export", "a/y"),
      ],
      menu,
    );
    expect(tree(menu)).toEqual([
      "top",
      "-",
      ["File", ["new", "open", "-", "close", "-", ["Export", ["png", "-", "svg"]]]],
    ]);
  });

  it("throws when an action has more categories than groups", () => {
    expect(() =>
      ActiveMenuManager.createActionMenu(
        [new GroupedAction("png", "File/Export", "a")],
        new Menu(),
      ),
    ).toThrow("Number of categories different thant number of groups.");
  });
});
