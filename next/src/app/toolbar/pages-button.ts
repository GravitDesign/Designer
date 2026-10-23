// Old: designer.browser.dev.js module 1735 ($.fn.gPageButton).
/**
 * The page button of the simple (view or comment only) toolbar:
 * `.g-page-button` showing the active page's name, opening `g-page-menu`
 * with the visible pages; picking one activates it. On the desktop:
 *
 *     .container > span.gravit-icon-pages, span.caption, span.gravit-icon-down
 *
 * in touch mode `.action-button` (gravit-icon-touch-pages-panel, caption)
 * plus a dropdown button the menu opens under.
 */
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AfterFlagChangeEvent } from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Menu } from "../menus/menu.ts";
import { designerOrNull } from "../shell/globals.ts";
import { MenuButton } from "../widgets/menu-button.ts";

function span(className: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.classList.add(className);
  return element;
}

function isTouch(): boolean {
  const designer = designerOrNull();
  return !!designer && designer.isTouchEnabled();
}

/** The desktop content. */
function desktopContent(element: HTMLElement): void {
  const container = document.createElement("div");
  container.classList.add("container");
  container.append(span("gravit-icon-pages"), span("caption"), span("gravit-icon-down"));
  element.replaceChildren(container);
}

/** The touch content, with the dropdown button when there is one. */
function touchContent(element: HTMLElement, dropdown?: HTMLElement): void {
  const button = document.createElement("div");
  button.classList.add("action-button");
  button.append(span("gravit-icon-touch-pages-panel"), span("caption"));
  element.replaceChildren(button);
  if (dropdown) element.append(dropdown);
}

export class PageButton {
  readonly element: HTMLElement;
  private readonly _dropdownButton: HTMLButtonElement;
  private _scene: Scene | null = null;
  private readonly _flagChanged = (event: AfterFlagChangeEvent): void => {
    if (event.node instanceof Page && event.flag === NodeFlag.Active)
      this._activatePage(event.node);
  };

  /** `$(element).gPageButton()`. */
  constructor(element: HTMLElement) {
    this.element = element;
    const dropdown = document.createElement("button");
    dropdown.classList.add("dropdown-button");
    dropdown.append(span("gravit-icon-down"));
    this._dropdownButton = dropdown;
    const menu = new Menu(undefined, "g-page-menu");
    element.classList.add("g-page-button");
    new MenuButton(element, {
      menu: () => {
        const scene = this._scene;
        if (scene) {
          menu.clearItems();
          for (const page of scene.getChildren())
            if (page instanceof Page && page.isVisible())
              menu.createAddItem(page.getLabel(), () => {
                page.setFlag(NodeFlag.Active);
              });
        }
        return menu;
      },
      getActiveItem: () => {
        const scene = this._scene;
        if (scene) {
          const page = scene.getActivePage();
          if (page) return menu.findItem(page.getLabel());
        }
        return null;
      },
      reference: () => (isTouch() ? this._dropdownButton : null),
    });
    if (isTouch()) touchContent(element);
    else desktopContent(element);
  }

  getScene(): Scene | null {
    return this._scene;
  }

  /** `gPageButton("scene", scene)`: follows the scene's active page. */
  scene(scene: Scene | null): this {
    if (this._scene !== scene) {
      if (this._scene) this._scene.removeEventListener(AfterFlagChangeEvent, this._flagChanged);
      this._scene = scene;
      if (scene) {
        this._activatePage(scene.getActivePage());
        scene.addEventListener(AfterFlagChangeEvent, this._flagChanged);
      }
    }
    return this;
  }

  /** `gPageButton("reinit")`: rebuilds the content for the current mode. */
  reinit(): void {
    if (isTouch()) touchContent(this.element, this._dropdownButton);
    else desktopContent(this.element);
    const scene = this._scene;
    if (scene) {
      this._activatePage(scene.getActivePage());
      // As before: any flag listener on the scene counts as this one.
      if (!scene.hasEventListeners(AfterFlagChangeEvent))
        scene.addEventListener(AfterFlagChangeEvent, this._flagChanged);
    }
  }

  /** `gPageButton("release")`: stops following the scene and removes the element. */
  release(): this {
    if (this._scene) this._scene.removeEventListener(AfterFlagChangeEvent, this._flagChanged);
    this.element.remove();
    return this;
  }

  private _activatePage(page: Page | null): void {
    for (const caption of this.element.querySelectorAll(".caption"))
      caption.textContent = page ? page.getLabel() : "";
  }
}
