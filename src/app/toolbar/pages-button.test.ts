import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { ActiveMenuManager } from "../menus/active-menu-manager.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { PageButton } from "./pages-button.ts";

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  dom.uninstall();
});

function sceneWithPages(...names: string[]): { scene: Scene; pages: Page[] } {
  const scene = new Scene(new EditorWorkspace());
  const pages = names.map((name) => {
    const page = new Page();
    page.setProperty("name", name);
    scene.appendChild(page);
    return page;
  });
  return { scene, pages };
}

describe("PageButton", () => {
  it("builds the desktop content", () => {
    const element = dom.document.createElement("div");
    new PageButton(element as unknown as HTMLElement);
    expect([...element.classList]).toEqual(["g-page-button", "g-menu-button"]);
    expect(element.children.map((c) => c.className)).toEqual(["container"]);
    expect(element.children[0]?.children.map((c) => c.className)).toEqual([
      "gravit-icon-pages",
      "caption",
      "gravit-icon-down",
    ]);
  });

  it("shows the active page and follows its changes", () => {
    const { scene, pages } = sceneWithPages("One", "Two");
    (pages[0] as Page).setFlag(NodeFlag.Active);
    const element = dom.document.createElement("div");
    const button = new PageButton(element as unknown as HTMLElement).scene(scene);
    const caption = () => element.querySelector(".caption")?.textContent;
    expect(caption()).toBe("One");
    (pages[1] as Page).setFlag(NodeFlag.Active);
    expect(caption()).toBe("Two");
    button.scene(null);
    (pages[0] as Page).setFlag(NodeFlag.Active);
    expect(caption()).toBe("Two");
  });

  it("lists the visible pages and activates the picked one", () => {
    const { scene, pages } = sceneWithPages("One", "Two");
    (pages[0] as Page).setFlag(NodeFlag.Active);
    const element = dom.document.createElement("div");
    dom.document.body.append(element);
    new PageButton(element as unknown as HTMLElement).scene(scene);
    fire(element, "mousedown");
    const menu = (MenuButton.of(element as unknown as Element) as MenuButton).menu;
    expect([...fake(menu.getHtmlElement()).classList]).toContain("g-page-menu");
    expect(fake(menu.getHtmlElement()).children.map((li) => li.textContent)).toEqual([
      "Page 1",
      "One",
      "Two",
    ]);
    // The new scene's own first page is listed too.
    expect(menu.getItem(1)?.isActive()).toBe(true);
    menu.getItem(2)?.activate();
    expect(scene.getActivePage()).toBe(pages[1]);
  });
});
