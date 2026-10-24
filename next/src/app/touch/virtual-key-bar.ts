// Old: designer.browser.dev.js module 1587 (the assistant bar, "virtual key bar").
/**
 * The touch layout's bar at the bottom of the canvas (#assistant-bar):
 * virtual Shift, Ctrl and Alt keys, the arrow keys (on a side that
 * folds away) and buttons for copy, paste, delete, select, arrange,
 * fullscreen, group, ungroup, convert to path and the quick help.
 *
 *     #assistant-bar.g-collapsible.vertical
 *       .g-collapsible-button
 *       .container
 *         .left-side > .g-property-row * 2     (keys and actions)
 *         .g-collapsible-button
 *         .right-side.g-collapsible.horizontal > .g-property-row * 2   (arrows)
 *
 * A virtual key sends keydown/keyup KeyboardEvents to the active view's
 * element (arrows repeat every 100 ms while pressed) and holds the
 * modifier in GPlatform while pressed; a double tap on a modifier keeps
 * it held (`g-held`) until the next double tap. Buttons show their
 * action's enabled state and keys their pressed state (`g-active`),
 * updated on key, selection, document, fullscreen and modifier changes.
 *
 * The designer creates the element (with its mousedown that brings the
 * bar to the front) and calls activate/deactivate when the touch layout
 * turns on or off.
 *
 * Plain DOM, like the toolbar: _updateActions toggles classes and the
 * disabled state of the buttons it finds in the bar, the menu buttons
 * (MenuButton) add their own classes, and the quick help looks the
 * buttons up by their icon classes.
 */
import type { EventClass, Event as GEvent } from "../../engine/core/event.ts";
import { Key, type KeyValue } from "../../engine/core/key.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { Platform, PlatformType } from "../../engine/core/platform.ts";
import { Element as SceneElement } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import { Editor } from "../../editor/editor.ts";
import { SimpleTouchTarget } from "../../editor/touch/simple-touch-target.ts";
import { TapGesture } from "../../editor/touch/tap-gesture.ts";
import { TouchTarget } from "../../editor/touch/touch-target.ts";
import type { Action } from "../actions/action.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { Menu } from "../menus/menu.ts";
import { MenuItem } from "../menus/menu-item.ts";
import { container, designer } from "../shell/globals.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { Collapsible, Orientation } from "./orientation.ts";
import { propertyRowElement } from "./property-row-element.ts";
import { FullscreenEvent } from "../shell/fullscreen-event.ts";

/** The ids of the actions on the bar (the old classes' ID constants). */
const ID = {
  copy: "edit.copy",
  paste: "paste.paste",
  pasteInPlace: "edit.paste.in-place",
  pasteInside: "edit.paste.inside",
  pasteReplace: "edit.paste.replace",
  pasteStyle: "edit.paste.style",
  remove: "edit.delete",
  selectAll: "edit.select-all",
  deselectAll: "edit.deselect-all",
  arrange: "arrange.order",
  fullscreen: "view.fullscreen",
  group: "modify.group",
  split: "modify.split",
  convertToPath: "modify.converttopath",
  quickHelp: "help.open-quick-help",
} as const;

/**
 * Where the arrow side's state is kept (the name says left, the side is the
 * right one; see "The assistant bar stores its right side as \"left-side\"" in
 * QUESTIONS.md).
 */
const EXPANDED_PROPERTY = "designer.assistant-bar.left-side.expanded";

const C = Key.Constant;
type KeyConstant = number;

/** The DOM keyCode each virtual key sends. */
const KEY_CODES: Record<number, number> = {
  [C.LEFT]: 37,
  [C.UP]: 38,
  [C.RIGHT]: 39,
  [C.DOWN]: 40,
  [C.SHIFT]: 16,
  [C.CONTROL]: 17,
  [C.ALT_LEFT]: 18,
};

const ALL_CODES = Object.values(KEY_CODES);

const ARROWS: number[] = [C.UP, C.LEFT, C.RIGHT, C.DOWN];

function isModifier(key: KeyConstant): boolean {
  return key === C.ALT_LEFT || key === C.ALT_RIGHT || key === C.SHIFT || key === C.CONTROL;
}

/** Sends a key event to the active view's element (not bubbling, as before). */
function sendKey(type: "keydown" | "keyup", keyCode: number | undefined): void {
  const document = designer().getActiveDocument();
  const window = document && document.getActiveWindow();
  const view = window && window.getView();
  const element = view && (view.getHtmlElement() as HTMLElement | null);
  if (element) element.dispatchEvent(new KeyboardEvent(type, { keyCode }));
}

/** A touch target that turns taps on one button into mouse events and keeps them from the page. */
class ButtonTouchTarget extends TouchTarget {
  constructor(target: EventTarget) {
    super(target);
    this.addGesture(new TapGesture());
    this.setDelayedTouchEventsEnabled(false);
  }

  override _handleEvent(event: TouchEvent): void {
    if (event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }
    super._handleEvent(event);
  }
}

type Handler = (event: Event) => void;

interface ButtonOptions {
  action?: Action | null;
  name?: string | null;
  menu?: Menu;
  icon?: string | null;
  click?: Handler;
  dblclick?: Handler;
  mousedown?: Handler;
  mouseup?: Handler;
  touchstart?: Handler;
  touchmove?: Handler;
  touchend?: Handler;
  touchcancel?: Handler;
  split?: boolean;
  active?: () => boolean;
  actionClass?: string;
}

interface MenuEntry {
  icon?: string;
  action: Action | null;
  isEnabled?: () => boolean;
}

/** What _updateActions reads of a button ($(el).data("action"), .data("active")). */
interface ButtonData {
  action?: Action;
  active?: () => boolean;
}

interface FullscreenAction extends Action {
  isFullscreen(): boolean;
}

/** The active document as the bar uses it. */
interface BarDocument {
  getEditor(): Editor | null;
  isLockedByVersionHistory(): boolean;
}

/** The scene nodes the arrange checks walk. */
interface ArrangeNode {
  getNext(): ArrangeNode | null;
  getPrevious(): ArrangeNode | null;
  getParent(): ArrangeNode;
  getFirstChild(): ArrangeNode | null;
  hasFlag(flag: number): boolean;
}

export class VirtualKeyBar {
  _htmlElement: HTMLElement;
  _keyState = new Map<number, boolean>();
  _heldKeys: Map<KeyConstant, boolean> | null = new Map();
  _keyDownInterval = new Map<number, ReturnType<typeof setInterval>>();
  _document: BarDocument | null = null;
  private readonly _buttons = new WeakMap<Element, ButtonData>();
  private readonly _touchHandler = new SimpleTouchTarget();
  private readonly _keyDownBound = (event: KeyboardEvent): void => this._keyDown(event);
  private readonly _keyUpBound = (event: KeyboardEvent): void => this._keyUp(event);
  private readonly _mouseUpBound = (event: MouseEvent): void => this._mouseup(event);

  constructor(htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
    this.init();
  }

  init(): void {
    PlatformType.bypassKeyDownRestrictionByClassName("g-virtual-key");
    new Collapsible(this._htmlElement);
    const container_ = document.createElement("div");
    container_.className = "container";
    this._htmlElement.appendChild(container_);

    const release = (key: KeyConstant): void => {
      const interval = this._keyDownInterval.get(key);
      if (interval) {
        clearInterval(interval);
        this._keyDownInterval.delete(key);
      }
      if (isModifier(key)) Platform.releaseKey(key);
      sendKey("keyup", KEY_CODES[key]);
    };
    const press = (key: KeyConstant): void => {
      const interval = this._keyDownInterval.get(key);
      if (interval) clearInterval(interval);
      if (ARROWS.includes(key))
        this._keyDownInterval.set(
          key,
          setInterval(() => {
            sendKey("keydown", KEY_CODES[key]);
          }, 100),
        );
      if (isModifier(key)) Platform.holdKey(key);
      sendKey("keydown", KEY_CODES[key]);
    };
    const virtualKey = (options: {
      key: KeyConstant;
      icon?: string;
      dblclick?: () => void;
      actionClass?: string;
    }): HTMLElement => {
      const { key, icon, dblclick, actionClass } = options;
      const element = this._createButton({
        name: icon ? null : (Key.toLocalizedShort(key as KeyValue, true) ?? null),
        icon,
        actionClass: "g-virtual-key" + (actionClass ? " " + actionClass : ""),
        mousedown: (event) => {
          event.stopImmediatePropagation();
          if (!this._isHoldingKey(key)) press(key);
        },
        // Mouseup and click both release (see "A tap on a virtual key sends
        // keyup twice" in QUESTIONS.md).
        click: (event) => {
          event.stopImmediatePropagation();
          if (!this._isHoldingKey(key)) release(key);
        },
        dblclick: dblclick ? () => dblclick() : undefined,
        mouseup: (event) => {
          event.stopImmediatePropagation();
          if (!this._isHoldingKey(key)) release(key);
        },
        touchstart: () => {
          if (!this._isHoldingKey(key)) press(key);
        },
        touchend: () => {
          if (!this._isHoldingKey(key)) release(key);
        },
        touchcancel: () => {
          if (!this._isHoldingKey(key)) release(key);
        },
        active: () => !!this._keyState.get(KEY_CODES[key] as number) || this._isHoldingKey(key),
      });
      new ButtonTouchTarget(element);
      return element;
    };
    const menu = (entries: MenuEntry[], className = ""): Menu => {
      const result = new Menu(null, "g-assistant-bar-menu");
      // Old: new GMenu(null, "g-assistant-bar-menu paste-menu"), where
      // jQuery's addClass took several classes.
      if (className) result._htmlElement.classList.add(className);
      for (const { icon, action, isEnabled } of entries) {
        const item = result.createAddItem(action);
        if (icon) item.setIcon(icon);
        if (isEnabled)
          item.addEventListener(MenuItem.UpdateEvent, () => {
            item.setEnabled(isEnabled());
          });
      }
      return result;
    };
    const action = (id: string): Action | null => designer().getAction(id);

    const left = document.createElement("div");
    left.className = "left-side";
    container_.appendChild(left);
    const right = document.createElement("div");
    right.className = "right-side";
    container_.appendChild(right);
    const rightSide = new Collapsible(right, { orientation: Orientation.Horizontal }).collapse();
    rightSide.onVisibilityChanged((expanded) => {
      container().setProperty(EXPANDED_PROPERTY, !!expanded);
    });

    left.appendChild(
      propertyRowElement({
        height: "auto",
        columns: [
          {
            width: "86px",
            content: virtualKey({
              key: C.SHIFT,
              actionClass: "g-virtual-key-" + C.SHIFT,
              dblclick: () => this._toggleModifierKey(C.SHIFT),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-copy",
              action: action(ID.copy),
            }),
          },
          {
            width: "68px",
            content: this._createButton({
              icon: "gravit-icon-touch-paste",
              action: action(ID.paste),
              menu: menu(
                [
                  { icon: "gravit-icon-touch-paste-in-place", action: action(ID.pasteInPlace) },
                  { icon: "gravit-icon-touch-paste-inside", action: action(ID.pasteInside) },
                  {
                    icon: "gravit-icon-touch-paste-and-replace",
                    action: action(ID.pasteReplace),
                  },
                  { icon: "gravit-icon-touch-paste-style", action: action(ID.pasteStyle) },
                ],
                "paste-menu",
              ),
              split: true,
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-trash-2",
              action: action(ID.remove),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-selection",
              click: () => {
                const document = designer().getActiveDocument();
                const editor = document && document.getEditor();
                if (editor) {
                  const selection = editor.getSelection();
                  if (selection && selection.length > 0)
                    designer().executeAction(ID.deselectAll, undefined, "assistantbar");
                  else designer().executeAction(ID.selectAll, undefined, "assistantbar");
                }
              },
            }),
          },
          {
            width: "62px",
            content: this._createButton({
              icon: "gravit-icon-touch-arrange-order",
              menu: menu(
                Object.values(Editor.ArrangeOrderType).map((type) => ({
                  icon: "gravit-icon-touch-arrange-" + type,
                  action: action(ID.arrange + "." + type),
                  isEnabled: () => this._isArrangeActionEnabled(type),
                })),
                "arrange-menu",
              ),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-fullscreen",
              action: action(ID.fullscreen),
              active: () => (action(ID.fullscreen) as FullscreenAction).isFullscreen(),
            }),
          },
        ],
      }),
    );
    left.appendChild(
      propertyRowElement({
        height: "auto",
        columns: [
          {
            width: "86px",
            content: virtualKey({
              key: C.CONTROL,
              actionClass: "g-virtual-key-" + C.CONTROL,
              dblclick: () => this._toggleModifierKey(C.CONTROL),
            }),
          },
          {
            width: "114px",
            content: virtualKey({
              key: C.ALT_LEFT,
              actionClass: "g-virtual-key-" + C.ALT_LEFT,
              dblclick: () => this._toggleModifierKey(C.ALT_LEFT),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-group",
              action: action(ID.group),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-ungroup",
              action: action(ID.split),
            }),
          },
          {
            width: "62px",
            content: this._createButton({
              icon: "gravit-icon-touch-convert-to-path",
              action: action(ID.convertToPath),
            }),
          },
          {
            width: "auto",
            content: this._createButton({
              icon: "gravit-icon-touch-help",
              click: () => {
                designer().executeAction(ID.quickHelp, undefined, "assistantbar");
              },
            }),
          },
        ],
      }),
    );
    right.appendChild(
      propertyRowElement({
        height: "auto",
        columns: [
          {
            width: "auto",
            content: virtualKey({ key: C.UP, icon: "gravit-icon-touch-arrow-key-up" }),
          },
          {
            width: "auto",
            content: virtualKey({ key: C.DOWN, icon: "gravit-icon-touch-arrow-key-down" }),
          },
        ],
      }),
    );
    right.appendChild(
      propertyRowElement({
        height: "auto",
        columns: [
          {
            width: "auto",
            content: virtualKey({ key: C.LEFT, icon: "gravit-icon-touch-arrow-key-left" }),
          },
          {
            width: "auto",
            content: virtualKey({ key: C.RIGHT, icon: "gravit-icon-touch-arrow-key-right" }),
          },
        ],
      }),
    );
    void container()
      .getProperty(EXPANDED_PROPERTY)
      .then((expanded) => {
        if (expanded) rightSide.expand();
        else rightSide.collapse();
      });
  }

  /** One `.toolbar-button` with its `button.action-button` (the old local `s`). */
  private _createButton(options: ButtonOptions): HTMLElement {
    const {
      action,
      name,
      menu,
      dblclick,
      mousedown,
      mouseup,
      touchstart,
      touchmove,
      touchend,
      touchcancel,
      split = false,
      active,
      actionClass,
    } = options;
    let { icon, click } = options;
    const element = document.createElement("div");
    element.className = "toolbar-button";
    element.classList.toggle("split", !!split);
    const button = document.createElement("button");
    button.className = "action-button";
    element.appendChild(button);
    const data: ButtonData = {};
    if (actionClass) for (const name of actionClass.split(" ")) button.classList.add(name);
    if (active) {
      data.active = active;
      element.classList.toggle("g-active", !!active());
    }
    if (action) {
      data.action = action;
      if (!icon) icon = action.getIcon();
      if (!click)
        click = () => {
          designer().executeAction(action.getId(), undefined, "assistantbar");
        };
    }
    this._buttons.set(element, data);
    if (name) {
      const span = document.createElement("span");
      span.textContent = name;
      button.appendChild(span);
    }
    if (icon) {
      const span = document.createElement("span");
      span.className = icon;
      button.appendChild(span);
    }
    if (click) button.addEventListener("click", click);
    if (dblclick) button.addEventListener("dblclick", dblclick);
    if (mousedown) element.addEventListener("mousedown", mousedown);
    if (mouseup) element.addEventListener("mouseup", mouseup);
    if (touchstart) element.addEventListener("touchstart", touchstart);
    if (touchmove) element.addEventListener("touchmove", touchmove);
    if (touchend) element.addEventListener("touchend", touchend);
    if (touchcancel) element.addEventListener("touchcancel", touchcancel);
    if (menu) {
      menu.__which = "assistantbar";
      let target: HTMLElement;
      const arrow = document.createElement("span");
      arrow.className = "gravit-icon-touch-arrow-up";
      if (split) {
        target = document.createElement("button");
        target.className = "dropdown-button";
        target.appendChild(arrow);
        element.appendChild(target);
      } else {
        button.appendChild(arrow);
        target = button;
      }
      new MenuButton(target, { menu, touch: true });
    }
    return element;
  }

  _toggleModifierKey(key: KeyConstant): void {
    const hold = !Platform.isHoldingKey(key);
    this._toggleKey(key, hold);
    for (const element of this._htmlElement.querySelectorAll(".g-virtual-key-" + key))
      element.classList.toggle("g-held", hold);
    this._updateActions();
  }

  _toggleKey(key: KeyConstant, hold: boolean): void {
    if (hold) {
      Platform.holdKey(key);
      (this._heldKeys as Map<KeyConstant, boolean>).set(key, true);
    } else {
      Platform.releaseKey(key);
      (this._heldKeys as Map<KeyConstant, boolean>).delete(key);
    }
  }

  _isHoldingKey(key: KeyConstant): boolean {
    return !!this._heldKeys && !!this._heldKeys.get(key);
  }

  _keyDown(event: KeyboardEvent): void {
    const code = event.which || event.keyCode;
    if (ALL_CODES.includes(code)) {
      this._keyState.set(code, true);
      this._updateActions();
    }
  }

  _keyUp(event: KeyboardEvent): void {
    const code = event.which || event.keyCode;
    if (ALL_CODES.includes(code)) {
      this._keyState.delete(code);
      this._updateActions();
    }
  }

  /** A real mouse release anywhere ends every repeating arrow key. */
  _mouseup(event: MouseEvent): void {
    if (!event.isTrusted) return;
    // Old: Object.keys of the interval table, so in ascending key order.
    const keys = [...this._keyDownInterval.keys()].sort((a, b) => a - b);
    for (const key of keys) {
      sendKey("keyup", KEY_CODES[key]);
      clearInterval(this._keyDownInterval.get(key));
    }
    this._keyDownInterval = new Map();
  }

  activate(): void {
    document.addEventListener("keydown", this._keyDownBound, true);
    document.addEventListener("keyup", this._keyUpBound, true);
    document.addEventListener("mouseup", this._mouseUpBound, true);
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    const fullscreenEvent = this._fullscreenEventClass();
    if (fullscreenEvent) designer().addEventListener(fullscreenEvent, this._fullScreenEvent, this);
    Platform.addEventListener(ModifiersChangedEvent, this._modifiersChangedEvent, this);
    this._activateDocument(designer().getActiveDocument() as unknown as BarDocument | null);
    this._touchHandler.activate(this._htmlElement);
    this._heldKeys = new Map();
    this._updateActions();
  }

  deactivate(): void {
    document.removeEventListener("keydown", this._keyDownBound, true);
    document.removeEventListener("keyup", this._keyUpBound, true);
    document.removeEventListener("mouseup", this._mouseUpBound, true);
    designer().removeEventListener(DocumentEvent, this._documentEvent, this);
    const fullscreenEvent = this._fullscreenEventClass();
    if (fullscreenEvent)
      designer().removeEventListener(fullscreenEvent, this._fullScreenEvent, this);
    Platform.removeEventListener(ModifiersChangedEvent, this._modifiersChangedEvent, this);
    this._deactivateDocument(designer().getActiveDocument() as unknown as BarDocument | null);
    Platform.releaseKey(C.ALT_LEFT);
    Platform.releaseKey(C.ALT_RIGHT);
    Platform.releaseKey(C.SHIFT);
    Platform.releaseKey(C.CONTROL);
    this._touchHandler.deactivate(this._htmlElement);
    this._heldKeys = null;
  }

  /** GFullscreenEvent (shell/fullscreen-event.ts). */
  private _fullscreenEventClass(): EventClass<GEvent> | null {
    return FullscreenEvent as unknown as EventClass<GEvent>;
  }

  _activateDocument(document: BarDocument | null): void {
    if (document)
      (document.getEditor() as Editor).addEventListener(
        Editor.SelectionChangedEvent,
        this._selectionChangedEvent,
        this,
      );
    this._document = document;
  }

  _deactivateDocument(document: BarDocument | null): void {
    if (document)
      (document.getEditor() as Editor).removeEventListener(
        Editor.SelectionChangedEvent,
        this._selectionChangedEvent,
        this,
      );
    this._document = null;
  }

  _selectionChangedEvent(): void {
    this._updateActions();
  }

  _fullScreenEvent(): void {
    this._updateActions();
  }

  _modifiersChangedEvent(): void {
    this._updateActions();
  }

  _documentEvent(event: DocumentEvent): void {
    const document = event.document as BarDocument;
    if (document.isLockedByVersionHistory()) return;
    switch (event.type) {
      case DocumentEvent.Type.Activated:
        this._activateDocument(document);
        this._updateActions();
        break;
      case DocumentEvent.Type.Deactivated:
        this._deactivateDocument(document);
        this._updateActions();
        break;
      case DocumentEvent.Type.Modified:
        this._updateActions();
    }
  }

  /** Every button's enabled state from its action, and its pressed state. */
  _updateActions(): void {
    for (const element of this._htmlElement.querySelectorAll(".toolbar-button")) {
      const data = this._buttons.get(element) || {};
      const action = data.action;
      if (action) {
        const disabled = !action.isAvailable() || !action.isEnabled();
        for (const button of element.querySelectorAll("button")) {
          button.disabled = disabled;
          button.classList.toggle("g-disabled", disabled);
        }
      }
      if (data.active) element.classList.toggle("g-active", !!data.active());
    }
  }

  /** Whether the arrange step would move anything (the touch menu greys out what wouldn't). */
  _isArrangeActionEnabled(type: string): boolean {
    const action = designer().getAction(ID.arrange + "." + type);
    if (!action || !action.isEnabled()) return false;
    const editor = this._document ? this._document.getEditor() : null;
    const selection = editor
      ? (editor.getIndividualSelection() as unknown as ArrangeNode[] | null)
      : null;
    if (!selection) return false;
    if (selection.length > 1) return true;
    const node = selection[0] as ArrangeNode;
    const parent = node.getParent();
    const Order = Editor.ArrangeOrderType;
    const Selected = Node.Flag.Selected as number;
    switch (type) {
      case Order.SendToFront:
        if (node.getNext()) {
          let next = node.getNext();
          let found: ArrangeNode | null = null;
          for (; !found && next;) {
            if (next instanceof SceneElement) found = next;
            next = next.getNext();
          }
          return !!found && Editor.validateBlockInsertion(parent, node);
        }
        return false;
      case Order.BringForward: {
        let next = node.getNext();
        if (next) {
          let found: ArrangeNode | null = null;
          for (; !found && next;) {
            if (next instanceof SceneElement && !next.hasFlag(Selected)) found = next;
            next = next.getNext();
          }
          if (null !== found) {
            const after = found.getNext();
            return Editor.validateBlockInsertion(parent, node, after);
          }
        }
        return false;
      }
      case Order.SendBackward: {
        let previous = node.getPrevious();
        if (null !== previous) {
          let found: ArrangeNode | null = null;
          for (; !found && previous;) {
            if (
              previous instanceof SceneElement &&
              !previous.hasFlag(Selected) &&
              Editor.validateBlockInsertion(parent, node, previous)
            )
              found = previous;
            previous = previous.getPrevious();
          }
          return !!found;
        }
        return false;
      }
      case Order.SendToBack:
        if (null !== node.getPrevious()) {
          let child = parent.getFirstChild();
          let found: ArrangeNode | null = null;
          for (; !found && child && child !== node;) {
            if (child instanceof SceneElement && Editor.validateBlockInsertion(parent, node, child))
              found = child;
            child = child.getNext();
          }
          return !!found;
        }
        return false;
    }
    return true;
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }
}
