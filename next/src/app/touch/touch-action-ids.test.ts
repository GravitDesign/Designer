import { describe, expect, it } from "vitest";
import { Editor } from "../../editor/editor.ts";
import { installFakeDom } from "../menus/testing/fake-dom.testing.ts";
import { buildRegistry, loadAppModules } from "../shell/bootstrap.ts";
import type { Container } from "../shell/container.ts";
import { resetGlobals, setContainer } from "../shell/globals.ts";
import { ID as MENU_ID, Transform } from "./touch-context-menu.ts";
import { ID as BAR_ID } from "./virtual-key-bar.ts";

/**
 * The touch menu and the assistant bar look their actions up by id. A
 * renamed id makes getAction return null: a dead button, or a throw in
 * _fillMenu. So every id must be one the app registers.
 */
describe("touch action ids", () => {
  it("are all registered by the app", async () => {
    const dom = installFakeDom();
    // The actions' constructors only ask the container for settings.
    setContainer({
      getProperty: () => Promise.resolve(null),
      setProperty: () => {},
      getRuntime: () => "browser",
    } as unknown as Container);
    let registered: Set<string>;
    try {
      await loadAppModules();
      registered = new Set(buildRegistry().actions.map((action) => action.getId()));
    } finally {
      dom.uninstall();
      resetGlobals();
    }
    const menu = [
      ...Object.values(MENU_ID).filter((id) => id !== MENU_ID.transform),
      ...Object.values(Transform).map((type) => MENU_ID.transform + "." + type),
    ];
    const bar = [
      ...Object.values(BAR_ID).filter((id) => id !== BAR_ID.arrange),
      ...Object.values(Editor.ArrangeOrderType).map((type) => BAR_ID.arrange + "." + type),
    ];
    expect(menu.filter((id) => !registered.has(id))).toEqual([]);
    expect(bar.filter((id) => !registered.has(id))).toEqual([]);
  }, 60000);
});
