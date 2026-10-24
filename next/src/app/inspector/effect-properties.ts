// Old: designer.browser.dev.js module 1262 (GEffectProperties).
/**
 * The Effects panel of the inspector: one row (`.effect-block`) per effect
 * of the first selected element, newest on top, each with a header
 * (drag handle, title with fold button, visibility, delete) and the
 * effect's settings form (effect-forms.ts). Below the list are quick-add
 * buttons for the default effects and "More", which opens the add panel
 * (effects-panel.ts) by category; the toolbar's plus opens it too.
 *
 * Edits go to every selected element: the equal effect at the same place
 * of each element changes with the row's effect (`_iterateEqualEffects`).
 * Rows can be dragged to reorder (Shift duplicates); a drag that ends
 * without a drop removes the effect, the drag image showing a trash icon.
 */
import type { Pattern } from "../../engine/style/pattern.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { getTypeId } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { equals, formatOpacity } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerNode } from "../../engine/scene/node-container.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import { Effect } from "../../engine/style/effect.ts";
import type { Effects } from "../../engine/style/effects.ts";
import { BlurEffect } from "../../engine/style/effects/blur-effect.ts";
import { ContactShadowEffect } from "../../engine/style/effects/contact-shadow-effect.ts";
import { CurvedShadowEffect } from "../../engine/style/effects/curved-shadow-effect.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../engine/style/effects/inner-shadow-effect.ts";
import { LongShadowEffect } from "../../engine/style/effects/long-shadow-effect.ts";
import { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { GLColorAdjustEffect } from "../../engine/style/webgl/effects/gl-color-adjust-effect.ts";
import { WebGLEffect } from "../../engine/style/webgl/webgl-effect.ts";
import { Editor } from "../../editor/editor.ts";
import { StyleEdManager, type StyleEditorEvent } from "../../editor/style-ed-manager.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import type { Document } from "../document/document.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { computed, css, height, outerHeight } from "../shell/dom.ts";
import { designer, dragImage } from "../shell/globals.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";
import { SidebarEvent } from "../shell/sidebar-event.ts";
import { SidebarsIds } from "../shell/sidebar-ids.ts";
import { initAccordion, toggleAccordionOpen } from "../widgets/accordion.ts";
import { offset } from "../widgets/dom-helpers.ts";
import { InputBox } from "../widgets/input-box.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { chooserOf, clickPreview } from "./color-deps.ts";
import {
  compareCategories,
  effectTable,
  entryOf,
  setBoxValue,
  setUnitValue,
  statsName,
  type EffectAssign,
  type EffectCategories,
  type EffectClass,
  type EffectEntry,
  type EffectFormHost,
} from "./effect-forms.ts";
import { EffectsPanel, type EffectsPanelItem } from "./effects-panel.ts";
import { PanelIds } from "./panel-ids.ts";
import { addClass, el, fadeCopyHint, getData, setData, toggleClass } from "./paint-dom.ts";
import { Properties, type InspectedElements } from "./properties.ts";
import { handleDragForDeleteIcon } from "../widgets/drag-delete.ts";
import { PressMode } from "../shell/press-mode.ts";

/** A selected element that has effects. */
interface EffectsOwner extends Node {
  getEffects(): Effects;
  getScene(): Scene | null;
  getStylePropertySets(): string[];
}

/** The undo data the sidebar passes on a StorageItemUpdated update. */
interface RelatedData {
  evtType?: number;
  chooserOn?: boolean;
  effectIndex?: number | null;
  activeStopIdx?: number | null;
}

const text = (className: string, key: string): string =>
  Locale.get(new LocaleKey(className, key)) as string;

/** The category names (module locals of the old code, set by every constructor). */
let categories: EffectCategories | null = null;

/** `$(el).position().top`: the top relative to the offset parent, without the margin. */
function positionTop(element: HTMLElement): number {
  return element.offsetTop - (parseFloat(computed(element, "margin-top")) || 0);
}

// The drag state shared by all rows (old module locals A and T).
let dragAllowed = false;
let dragged: Effect | null = null;

/** Old G: whether the dragged row can be dropped on `block`. */
function canDropOn(block: Element): boolean {
  if (dragged) {
    const effect = getData<Effect>(block, "effect");
    if (effect && (effect !== dragged || Platform.modifiers.shiftKey))
      return dragged.getParent() === effect.getParent();
  }
  return false;
}

export class EffectProperties extends Properties implements EffectFormHost {
  /** The English category name of a localized one, for the statistics. */
  static EngCat = (category: string): string => {
    const c = categories as EffectCategories;
    return category === c.mostUsed
      ? "MostUsed"
      : category === c.blur
        ? "Blur"
        : category === c.artistic
          ? "Artistic"
          : category === c.adjust
            ? "Adjust"
            : category === c.distortion
              ? "Distortion"
              : category === c.other
                ? "Other"
                : "Shadow";
  };

  _panel: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  override _document: Document | null = null;
  _elements: EffectsOwner[] | null = null;
  _addEffectMenu: EffectsPanel | null = null;
  _effectsPanel: HTMLElement | null = null;
  _disableFx: unknown = null;
  /** The effects of the quick-add buttons. */
  _defaultEffects: unknown[] = [
    DropShadowEffect,
    InnerShadowEffect,
    BlurEffect,
    GLColorAdjustEffect,
  ];
  _styleEditorChange = false;
  _styleEdOn = false;
  _ownChange = false;
  _chooserElem: HTMLElement | null = null;
  private _checkContext: ((event: MouseEvent) => void) | null = null;

  constructor() {
    super();
    this._elements = [];
    categories = {
      mostUsed: text("GEffectProperties", "text.most-used"),
      blur: text("GEffectProperties", "text.blur"),
      artistic: text("GEffectProperties", "text.artistic"),
      adjust: text("GEffectProperties", "text.adjust"),
      distortion: text("GEffectProperties", "text.distortion"),
      other: text("GEffectProperties", "text.other"),
      shadow: text("GEffectProperties", "text.shadow"),
    };
    effectTable(categories);
  }

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._toolbar = addClass(toolbar, "list-toolbar effects-toolbar");
    this._createAddEffectMenu();
    this._panel = addClass(panel, "effects-properties-panel");
    this.setTouchTools([
      new TouchTool({
        id: "effect",
        icon: "gravit-icon-touch-effect-panel",
        panel: this._panel,
        toolbar: this._toolbar,
        panelWidth: "368px",
      }) as SidebarTouchTool,
    ]);
    const label = el("label");
    label.textContent = text("GEffectProperties", "title");
    this._toolbar.appendChild(label);
    const add = el("button");
    add.append(el("span", "gravit-icon-plus"), el("span", "gravit-icon-touch-plus"));
    add.addEventListener("click", () => {
      designer().stats("effects_open_effectsmenu", "main");
      this._openEffectsMenu(add);
    });
    attachRichTooltip(
      add,
      RichTooltipConfig.from({
        title: text("GEffectProperties", "text.add-effect-tooltip-title"),
        description: text("GEffectProperties", "text.add-effect-tooltip-description"),
        learnMore: "",
      }),
    );
    this._toolbar.appendChild(add);
    this._effectsPanel = el("div", "effects-panel");
    this._effectsPanel.appendChild(el("div", "effects"));
    this._panel.appendChild(this._effectsPanel);
    // The quick-add buttons add to every element and close the add panel per element.
    const addDefault = (clazz: EffectClass, entry: EffectEntry) => {
      designer().stats(
        "effects_add_effectsmenu",
        (clazz && statsName((entry && entry.i18n) || clazz, "unknown", 0)) || "unkn",
      );
      const elements = this._elements as EffectsOwner[];
      Editor.tryRunTransaction(
        elements[0],
        () => {
          for (let e = 0; e < elements.length; ++e) {
            const effect = new clazz();
            const owner = elements[e] as EffectsOwner;
            if (this._validateInsertation(owner.getEffects(), effect))
              owner.getEffects().appendChild(effect);
            (this._addEffectMenu as EffectsPanel).close();
            const sidebar = inspectorSidebar();
            sidebar.trigger(new SidebarEvent(SidebarEvent.Type.ChildAdded, sidebar));
          }
        },
        text("GEffectProperties", "action.add"),
      );
    };
    const entries = effectTable();
    for (let r = 0; r < entries.length; ++r) {
      const entry = entries[r] as EffectEntry;
      if (this._defaultEffects.indexOf(entry.clazz) > -1)
        this._createDefaultEffect(false, entry, addDefault);
    }
    this._createDefaultEffect(true);
    designer()
      .getWorkspace()
      .getStyleEdManager()
      .addEventListener(StyleEdManager.EditorEvent, this._styleEditorEventHandler, this);
    // Old: this._panel.data("contextmenu", true), read by
    // Designer.propertyPanelHasContextMenu.
    (this._panel as unknown as { __contextmenu?: boolean }).__contextmenu = true;
  }

  _openEffectsMenu(target: Element): void {
    (this._addEffectMenu as EffectsPanel).open(target);
  }

  override update(
    document: Document | null,
    elements: InspectedElements | null,
    data?: unknown,
  ): boolean {
    if (this._styleEditorChange) {
      this._styleEditorChange = false;
      return true;
    }
    if (this._ownChange) return true;
    if (this._chooserElem) {
      const chooser = chooserOf(this._chooserElem);
      if (chooser) chooser.close();
    }
    if (this._document) {
      const scene = this._document.getScene() as Scene;
      scene.removeEventListener(AfterInsertEvent, this._afterInsert, this);
      scene.removeEventListener(BeforeRemoveEvent, this._beforeRemove, this);
      scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
      this._document = null;
      this._elements = null;
      this._invalidateEffects();
    }
    this._elements = [];
    if (document && elements && elements.length) {
      for (let o = 0; o < elements.length; ++o) {
        const element = elements[o] as EffectsOwner;
        if (
          element.hasMixin(Stylable) &&
          element.getStylePropertySets().indexOf(Stylable.PropertySet.Effects) >= 0
        )
          this._elements.push(element);
      }
      if (this._elements.length) {
        this._document = document;
        const scene = this._document.getScene() as Scene;
        scene.addEventListener(AfterInsertEvent, this._afterInsert, this);
        scene.addEventListener(BeforeRemoveEvent, this._beforeRemove, this);
        scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
        this._invalidateEffects((data as RelatedData | null | undefined) ?? undefined);
        return true;
      }
    }
    return false;
  }

  _styleEditorEventHandler(event: StyleEditorEvent): void {
    if (this._styleEdOn && event.type == StyleEdManager.EditorEventType.PrepareModifiedEvent)
      this._styleEditorChange = true;
  }

  _afterInsert(event: AfterInsertEvent): void {
    const node = event.node;
    if (node instanceof Effect && (node.getOwnerStylable() as unknown) === this._first()) {
      this._insertEffect(node);
      this._updateToolbar();
    }
  }

  _beforeRemove(event: BeforeRemoveEvent): void {
    const node = event.node;
    if (node instanceof Effect && (node.getOwnerStylable() as unknown) === this._first()) {
      this._removeEffect(node);
      this._updateToolbar();
    }
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const node = event.node;
    if (
      (!event.temporary || node instanceof OverlayEffect) &&
      node instanceof Effect &&
      (node.getOwnerStylable() as unknown) === this._first()
    )
      this._updateEffect(node);
  }

  private _first(): EffectsOwner | undefined {
    return this._elements ? this._elements[0] : undefined;
  }

  /**
   * Calls `callback` with the effects of the other selected elements that
   * stand for `effect`: equal ones, or of the same class at the same
   * index. With `all`, every element's effect of the same class and index,
   * `effect` included.
   */
  _iterateEqualEffects(effect: Effect, callback: (other: Effect) => void, all?: boolean): void {
    const owner = effect.getOwnerStylable();
    const index = (effect.getParent() as ContainerNode).getIndexOfChild(effect);
    const elements = this._elements as EffectsOwner[];
    for (let r = 0; r < elements.length; ++r) {
      if (!owner || (elements[r] as unknown) !== owner || all) {
        const effects = (elements[r] as EffectsOwner).getEffects();
        for (let other = effects.getFirstChild(); null !== other; other = other.getNext()) {
          if (
            (other !== effect || all) &&
            ((equals(other, effect) && !all) ||
              (other.constructor === effect.constructor &&
                effects.getIndexOfChild(other) === index))
          )
            callback(other as Effect);
        }
      }
    }
  }

  _insertEffect(effect: Effect, data?: RelatedData): void {
    const panel = this._panel as HTMLElement;
    const effectsPanel = this._effectsPanel as HTMLElement;
    let image: HTMLElement | null = null;
    let panelOffset: { top: number; left: number } | null = null;
    let panelHeight = 0;
    let grabX = 0;
    let grabY = 0;
    let pressTarget: EventTarget | null = null;
    const toggleCollapse = () => {
      Editor.tryRunTransaction(
        effect,
        () => {
          this._iterateEqualEffects(effect, (other) => {
            other.setProperty("cl", !effect.getProperty("cl"));
          });
          effect.setProperty("cl", !effect.getProperty("cl"));
        },
        text("GEffectProperties", "action.toggle-collapse"),
      );
    };
    const toggleVisibility = (event: Event) => {
      event.stopPropagation();
      Editor.tryRunTransaction(
        effect,
        () => {
          this._iterateEqualEffects(effect, (other) => {
            other.setProperty("vs", !effect.getProperty("vs"));
          });
          effect.setProperty("vs", !effect.getProperty("vs"));
        },
        text("GEffectProperties", "action.toggle-visibility"),
      );
    };
    const remove = (event: Event) => {
      const entry = effectTable().find((e) => effect instanceof e.clazz);
      designer().stats(
        "effects_delete_effect",
        statsName((entry && entry.i18n) || effect, effect.getNodeName(), 666),
      );
      event.stopPropagation();
      Editor.tryRunTransaction(
        effect,
        () => {
          this._iterateEqualEffects(effect, (other) => {
            (other.getParent() as ContainerNode).removeChild(other);
          });
          (effect.getParent() as ContainerNode).removeChild(effect);
          designer().setMouseOverContext(null, undefined, undefined);
        },
        text("GEffectProperties", "action.remove"),
      );
      const sidebar = inspectorSidebar();
      sidebar.trigger(new SidebarEvent(SidebarEvent.Type.ChildRemoved, sidebar));
    };
    // The row of the previous effect: the new row goes above it.
    let previousRow: HTMLElement | null = null;
    const previous = effect.getPrevious();
    if (previous)
      for (const row of effectsPanel.querySelectorAll<HTMLElement>(".effect-block"))
        if (getData(row, "effect") === previous) {
          previousRow = row;
          break;
        }
    const entry = entryOf(effect);
    const dropIndicator = el("div", "g-drop-indicator");
    const header = el("div", "effect-header");
    header.classList.add("g-cursor-hand-open");
    const block = el("div", "effect-block");
    block.setAttribute("data-drag-mode", String(PressMode.PRESS_AND_HOLD));
    setData(block, "effect", effect);
    block.setAttribute("draggable", "true");
    block.addEventListener("mousedown", (event) => {
      const target = event.target as Element;
      dragAllowed =
        target.classList.contains("effect-title") ||
        target.classList.contains("gravit-icon-drag-indicator") ||
        target.classList.contains("effect-header");
      const row = target.closest(".effect-block");
      if (row) toggleClass(row, "g-draggable-disabled", !dragAllowed);
    });
    block.addEventListener("click", (event) => {
      // $(target).parents(".effect-block"): the ancestors, not the target itself.
      const start = (event.target as Element).parentElement;
      const row = start ? start.closest(".effect-block") : null;
      if (!row) return;
      for (const child of row.children) child.classList.add("selected");
      const parent = row.parentElement;
      if (parent)
        for (const sibling of parent.children)
          if (sibling !== row)
            for (const child of sibling.children) child.classList.remove("selected");
    });
    block.addEventListener("mousedown", (event) => {
      pressTarget = event.target;
    });
    block.addEventListener("dragstart", (event) => {
      const start = (pressTarget || event.target) as Element;
      if (!dragAllowed || (designer().isTouchEnabled() && !start.closest(".effect-header"))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const row = (event.target as Element).closest(".effect-block") as HTMLElement;
      const rowOffset = offset(row);
      image = dragImage();
      addClass(image, "drag-delete gravit-icon-trash");
      panelOffset = offset(panel);
      panelHeight = outerHeight(effectsPanel);
      grabX = event.clientX - rowOffset.left;
      grabY = event.clientY - rowOffset.top;
      event.stopPropagation();
      dragged = getData<Effect>(row, "effect") ?? null;
      const transfer = event.dataTransfer;
      if (transfer) {
        transfer.effectAllowed = "move";
        transfer.setData("text/plain", "dummy_data");
      }
      for (const other of effectsPanel.querySelectorAll<HTMLElement>(".effect-block")) {
        const overlay = el("div", "grid-drag-overlay");
        overlay.addEventListener("dragenter", () => {
          const target = overlay.parentNode as HTMLElement;
          const over = getData<Effect>(target, "effect");
          if (canDropOn(target)) {
            // Sic: the old code called these on the dragstart event.
            event.preventDefault();
            event.stopPropagation();
            if (transfer) transfer.dropEffect = "move";
            if (dragged && over && dragged.getParent() === over.getParent()) {
              const parent = dragged.getParent() as ContainerNode;
              const from = parent.getIndexOfChild(dragged);
              const to = parent.getIndexOfChild(over);
              if (from !== to) {
                if (from < to) target.before(dropIndicator);
                else target.after(dropIndicator);
              }
            }
          } else dropIndicator.remove();
        });
        overlay.addEventListener("dragleave", () => {
          if (canDropOn(overlay.parentNode as Element))
            for (const indicator of (overlay.parentNode as Element).querySelectorAll(
              ".g-drop-indicator",
            ))
              indicator.remove();
        });
        overlay.addEventListener("dragover", (over) => {
          if (canDropOn(overlay.parentNode as Element)) {
            over.preventDefault();
            over.stopPropagation();
            if (over.dataTransfer) over.dataTransfer.dropEffect = "move";
          }
        });
        overlay.addEventListener("drop", () => {
          const targetRow = (overlay.parentNode as Element).closest(".effect-block");
          const target = getData<Effect>(targetRow, "effect");
          for (const indicator of panel.querySelectorAll(".g-drop-indicator")) indicator.remove();
          for (const grid of panel.querySelectorAll(".grid-drag-overlay")) grid.remove();
          if (dragged && target && dragged.getParent() === target.getParent()) {
            const moving = dragged;
            const parent = moving.getParent() as ContainerNode;
            const from = parent.getIndexOfChild(moving);
            const to = parent.getIndexOfChild(target);
            Editor.tryRunTransaction(
              parent,
              () => {
                if (Platform.modifiers.shiftKey) {
                  const copy = moving.clone() as Node;
                  parent.insertChild(copy, from < to ? target.getNext() : target);
                } else if (from !== to) {
                  parent.removeChild(moving);
                  parent.insertChild(moving, from < to ? target.getNext() : target);
                }
              },
              Platform.modifiers.shiftKey
                ? text("GEffectProperties", "action.duplicate")
                : text("GEffectProperties", "action.move"),
            );
          }
          dragged = null;
        });
        other.appendChild(overlay);
      }
    });
    block.addEventListener("drag", (event) => {
      if (image) handleDragForDeleteIcon(event, image, panelOffset, panelHeight, grabX, grabY);
    });
    block.addEventListener("dragend", (event) => {
      for (const indicator of panel.querySelectorAll(".g-drop-indicator")) indicator.remove();
      for (const grid of panel.querySelectorAll(".grid-drag-overlay")) grid.remove();
      if (image) css(image, "display", "none");
      image = null;
      event.stopPropagation();
      // A drag that wasn't dropped on a row removes the effect, wherever it
      // ended (BF-105 in docs/rewrite/bugfix-plan.md: "Dragging an effect row
      // and not dropping it on a row deletes the effect").
      if (dragged) {
        const removing = dragged;
        const elements = this._elements as EffectsOwner[];
        Editor.tryRunTransaction(
          elements[0],
          () => {
            const doomed: Effect[] = [];
            this._iterateEqualEffects(removing, (other) => doomed.push(other), true);
            for (const one of doomed) (one.getParent() as ContainerNode).removeChild(one);
          },
          text("GEffectProperties", "action.remove"),
        );
      }
    });
    const title = el("div", "effect-title g-cursor-hand-open");
    const titleLabel = el("label");
    const titleText = el("span");
    titleText.textContent = effect.getNodeNameTranslated();
    titleLabel.appendChild(titleText);
    title.appendChild(titleLabel);
    const visible = !!effect.getProperty("vs");
    const visibility = el("div", "effect-icon effect-visibility normal");
    visibility.addEventListener("click", (event) => {
      event.stopPropagation();
      const icon = visibility.querySelector("span") as HTMLElement;
      const hidden = icon.classList.contains("gravit-icon-hide");
      designer().stats("effects_toggle_visibility", hidden ? "hidden" : "visible");
      icon.classList.remove("gravit-icon-" + (hidden ? "hide" : "display"));
      icon.classList.add("gravit-icon-" + (hidden ? "display" : "hide"));
      toggleVisibility(event);
    });
    visibility.appendChild(el("span", "gravit-icon-" + (visible ? "display" : "hide")));
    const deleteButton = el("div", "effect-icon effect-delete normal");
    deleteButton.setAttribute("data-title", text("GEffectProperties", "action.remove"));
    deleteButton.addEventListener("click", remove);
    deleteButton.appendChild(el("span", "gravit-icon-trash"));
    const settingsButton = el("div", "effect-icon effect-setting touch");
    settingsButton.setAttribute("data-action", "stroke-settings");
    settingsButton.appendChild(el("span", "gravit-icon-touch-settings"));
    settingsButton.addEventListener("click", (event) => {
      openContextMenu(event, block);
    });
    const touchDelete = el("div", "effect-icon effect-delete touch");
    touchDelete.setAttribute("data-title", text("GEffectProperties", "action.remove"));
    touchDelete.addEventListener("click", remove);
    touchDelete.appendChild(el("span", "gravit-icon-touch-trash"));
    const touchVisibility = el("div", "effect-icon effect-visibility touch");
    touchVisibility.addEventListener("click", (event) => {
      event.stopPropagation();
      const icon = touchVisibility.querySelector("span") as HTMLElement;
      const hidden = icon.classList.contains("gravit-icon-touch-hide");
      designer().stats("effects_toggle_visibility", hidden ? "hidden" : "visible");
      icon.classList.remove("gravit-icon-touch-" + (hidden ? "hide" : "show"));
      icon.classList.add("gravit-icon-touch-" + (hidden ? "show" : "hide"));
      toggleVisibility(event);
    });
    touchVisibility.appendChild(el("span", "gravit-icon-touch-" + (visible ? "show" : "hide")));
    header.append(
      el("div", "gravit-icon-drag-indicator g-cursor-hand-open gravit-icon-touch-drag-indicator"),
      title,
      visibility,
      deleteButton,
      settingsButton,
      touchDelete,
      touchVisibility,
    );
    block.appendChild(header);
    if (entry.createSettings) {
      const assign: EffectAssign = (names, values, temporary, related) => {
        if (temporary) {
          this._iterateEqualEffects(effect, (other) => {
            other.setProperties(names, values, false, false, true);
          });
          effect.setProperties(names, values, false, false, true);
        } else {
          if (!this._document) return;
          designer().stats(
            "effects_assign_effectproperty",
            statsName(entry.i18n, effect.getNodeName(), 666),
          );
          let undoData: Record<string, unknown> | null = null;
          if (related) {
            const index = (effect.getParent() as ContainerNode).getIndexOfChild(effect);
            undoData = { effectIndex: index, ...related };
          }
          this._ownChange = true;
          const editor = this._document.getEditor() as Editor;
          editor.beginTransaction();
          try {
            this._iterateEqualEffects(effect, (other) => {
              other.setProperties(names, values);
            });
            effect.setProperties(names, values);
          } finally {
            editor.commitTransaction(
              text("GEffectProperties", "action.change-properties"),
              undoData,
            );
            this._ownChange = false;
          }
        }
      };
      const form = entry.createSettings(this, effect, assign);
      if (form) {
        const settings = el("div", "effect-settings");
        form.classList.add("content");
        settings.appendChild(form);
        block.appendChild(settings);
      }
    }
    if (previousRow) previousRow.before(block);
    else (effectsPanel.querySelector(".effects") as HTMLElement).appendChild(block);
    initAccordion(header, { next: ".effect-settings", title: "label" });
    header.addEventListener("change", () => {
      designer().stats("effects_toggle_collapse");
      toggleCollapse();
    });
    block.addEventListener("contextmenu", (event) => {
      openContextMenu(event, block);
    });
    block.addEventListener("mouseenter", (event) => {
      if (this._document) this._document.updateActiveStylesList("Effect", effect);
      designer().setMouseOverContext(PanelIds.EffectPropertiesPanel, event, (copied?: Event) => {
        const previousHint = panel.querySelector(".copy-info-overlay");
        // Old: e && $(e.target).closest(".effect-block"), then its height()
        // and position().top; an empty set's position() is undefined, so
        // reading its top threw (the row is always found: the event is the
        // row's own mouseenter).
        let rowHeight = 0;
        let rowTop = 0;
        if (copied) {
          const row = (copied.target as Element | null)?.closest<HTMLElement>(".effect-block");
          if (!row) throw new TypeError("Cannot read properties of undefined (reading 'top')");
          rowHeight = height(row) || 0;
          rowTop = positionTop(row) || 0;
        }
        const top = rowHeight ? rowTop + rowHeight / 2 : rowTop;
        const hint = el("span", "copy-info-overlay");
        css(hint, "top", top);
        hint.textContent = text("GEffectProperties", "text.copy-effect");
        if (previousHint) previousHint.remove();
        panel.appendChild(hint);
        setTimeout(() => fadeCopyHint(hint), 1e3);
      });
      if (this._checkContext) panel.removeEventListener("mousemove", this._checkContext);
      this._checkContext = (move: MouseEvent) => {
        const height = outerHeight(panel);
        const top = offset(panel).top;
        if (move.clientY > top + height - 2) {
          designer().setMouseOverContext(null, null, null);
          if (this._checkContext) panel.removeEventListener("mousemove", this._checkContext);
          this._checkContext = null;
        }
      };
      panel.addEventListener("mousemove", this._checkContext);
    });
    block.addEventListener("mouseleave", () => {
      if (this._checkContext) panel.removeEventListener("mousemove", this._checkContext);
      this._checkContext = null;
      if (this._document) this._document.updateActiveStylesList("Effect", null);
      designer().setMouseOverContext(null, null, null);
    });
    this._updateEffect(effect, data);
  }

  _updateEffect(effect: Effect, data?: RelatedData): void {
    const effectsPanel = this._effectsPanel as HTMLElement;
    for (const row of effectsPanel.querySelectorAll<HTMLElement>(".effect-block")) {
      if (getData(row, "effect") !== effect) continue;
      entryOf(effect);
      if (
        effect instanceof OverlayEffect ||
        effect instanceof DropShadowEffect ||
        effect instanceof InnerShadowEffect ||
        effect instanceof CurvedShadowEffect ||
        effect instanceof ContactShadowEffect ||
        effect instanceof LongShadowEffect
      ) {
        const choosers = row.querySelectorAll<HTMLElement>('[data-property="pat"]');
        for (const element of choosers) {
          const chooser = chooserOf(element);
          if (!chooser) continue;
          chooser.setPattern(effect.getProperty("pat", false, false, true) as Pattern | null);
          chooser.value(effect.getProperty("pat", false, false, true) as Pattern | null);
          chooser.opacity(effect.getProperty("opc", false, false, true) as number);
        }
        setBoxValue(
          row.querySelectorAll('[data-property="opc"]'),
          formatOpacity(100 * (effect.getProperty("opc", false, false, true) as number)),
        );
        if (
          data &&
          (data.evtType == Editor.ModifiedEvent.Type.Undo ||
            data.evtType == Editor.ModifiedEvent.Type.Redo) &&
          data.chooserOn &&
          null != data.effectIndex
        ) {
          // Reopens the chooser the undone change came from, at its gradient stop.
          if ((effect.getParent() as ContainerNode).getIndexOfChild(effect) == data.effectIndex)
            for (const element of choosers)
              for (const preview of element.querySelectorAll(".preview"))
                clickPreview(preview, null != data.activeStopIdx ? data.activeStopIdx : null);
        }
      }
      const collapsed = !!effect.getProperty("cl");
      toggleClass(row, "g-selected", effect.hasFlag(Node.Flag.Selected as number));
      // Old: .effect-title input[type=checkbox] got the visibility; there is no such box.
      for (const header of row.querySelectorAll(".effect-header"))
        toggleAccordionOpen(header, !collapsed);
      const settingsList = row.querySelectorAll<HTMLElement>(".effect-settings");
      for (const settings of settingsList) css(settings, "display", collapsed ? "none" : "");
      if (effect instanceof BlurEffect)
        for (const settings of settingsList)
          setUnitValue(
            settings.querySelectorAll('[data-property="r"]:not(.g-input-slider)'),
            new Length(effect.getProperty("r") as number),
          );
      if (effect instanceof WebGLEffect) {
        const parameters = effect.getProperty("shp") as Record<string, unknown>;
        for (const name in parameters) {
          const value = parameters[name];
          if ("number" == typeof value)
            for (const settings of settingsList)
              for (const input of settings.querySelectorAll(
                "[data-property=" + name + "]:not(.g-input-slider)",
              )) {
                if (Object.prototype.hasOwnProperty.call(inputOptions(input), "unit"))
                  setUnitValue([input], new Length(value, Length.Unit.PT));
              }
        }
      }
      if (effect instanceof DropShadowEffect)
        for (const settings of settingsList) {
          setUnitValue(
            settings.querySelectorAll('[data-property="r"]'),
            new Length(effect.getProperty("r") as number),
          );
          setUnitValue(
            settings.querySelectorAll('[data-property="x"]'),
            new Length(effect.getProperty("x") as number),
          );
          setUnitValue(
            settings.querySelectorAll('[data-property="y"]'),
            new Length(effect.getProperty("y") as number),
          );
        }
      // Old: the row's .effect-layer badge got the layer the effect applies
      // to; no row has one, so nothing changes.
      return;
    }
  }

  _removeEffect(effect: Effect): void {
    for (const row of (this._effectsPanel as HTMLElement).querySelectorAll(".effect-block"))
      if (getData(row, "effect") === effect) {
        row.remove();
        return;
      }
  }

  _invalidateEffects(data?: RelatedData): void {
    (this._effectsPanel as HTMLElement).querySelector(".effects")?.replaceChildren();
    if (this._elements && this._elements.length) {
      const effects = (this._elements[0] as EffectsOwner).getEffects();
      for (let effect = effects.getFirstChild(); null !== effect; effect = effect.getNext())
        if (effect instanceof Effect) this._insertEffect(effect, data);
    }
    this._updateToolbar();
  }

  _createAddEffectMenu(): void {
    this._addEffectMenu = new EffectsPanel(EffectProperties.EngCat);
    const menu = this._addEffectMenu;
    const select = menu.createSelector();
    const addEffect = (clazz: EffectClass, entry: EffectEntry) => {
      const elements = this._elements as EffectsOwner[];
      (elements[0] as EffectsOwner).getScene();
      designer().stats(
        "effects_add_panelbutton",
        (clazz && statsName((entry && entry.i18n) || clazz, "unknown", 0)) || "unkn",
      );
      Editor.tryRunTransaction(
        elements[0],
        () => {
          for (let e = 0; e < elements.length; ++e) {
            const effect = new clazz();
            const owner = elements[e] as EffectsOwner;
            if (this._validateInsertation(owner.getEffects(), effect))
              owner.getEffects().appendChild(effect);
            menu.close();
          }
        },
        text("GEffectProperties", "action.add"),
      );
      const toolbar = this._toolbar as HTMLElement;
      toggleAccordionOpen(toolbar, true);
      initAccordion(toolbar);
      const sidebar = inspectorSidebar();
      sidebar.trigger(new SidebarEvent(SidebarEvent.Type.ChildAdded, sidebar));
    };
    const c = categories as EffectCategories;
    const byCategory: Record<string, EffectsPanelItem<EffectClass>[]> = {};
    byCategory[c.mostUsed] = [];
    const mostUsed = el("option");
    mostUsed.setAttribute("value", c.mostUsed);
    mostUsed.append(c.mostUsed);
    select.appendChild(mostUsed);
    const options: HTMLOptionElement[] = [];
    const entries = effectTable();
    for (let d = 0; d < entries.length; ++d) {
      const entry = entries[d] as EffectEntry;
      if (entry.hidden) continue;
      entry.cb = addEffect;
      const category = entry.category;
      if (category) {
        if (!byCategory[category]) {
          byCategory[category] = [];
          const option = el("option");
          option.setAttribute("value", category);
          option.append(category);
          options.push(option);
        }
        (byCategory[category] as EffectsPanelItem<EffectClass>[]).push(
          entry as unknown as EffectsPanelItem<EffectClass>,
        );
      }
      if (entry.mostUsed)
        (byCategory[c.mostUsed] as EffectsPanelItem<EffectClass>[]).push(
          entry as unknown as EffectsPanelItem<EffectClass>,
        );
    }
    const other = text("GEffectProperties", "text.other");
    const order = compareCategories(other);
    options.sort((a, b) =>
      order(a.getAttribute("value") as string, b.getAttribute("value") as string),
    );
    for (const option of options) select.appendChild(option);
    select.addEventListener("change", () => {
      designer().stats("effects_choose_type", EffectProperties.EngCat(select.value));
      menu.addItems(byCategory[select.value] as EffectsPanelItem<EffectClass>[]);
    });
    menu.addItems(byCategory[c.mostUsed] as EffectsPanelItem<EffectClass>[]);
  }

  /** A singleton effect can't be added twice to one element. */
  _validateInsertation(effects: Effects, effect: Effect): boolean {
    if (effect.isSingleton()) {
      const type = getTypeId(effect);
      for (let other = effects.getFirstChild(); null !== other; other = other.getNext())
        if (getTypeId(other) === type) return false;
    }
    return true;
  }

  _createDefaultEffect(
    more: boolean,
    entry?: EffectEntry,
    add?: (clazz: EffectClass, entry: EffectEntry) => void,
  ): void {
    const click = (target: Element) => {
      if (more) {
        designer().stats("effects_open_effectsmenu", "more");
        this._openEffectsMenu(target);
      } else if (add && entry) add(entry.clazz, entry);
    };
    const label = el("span");
    label.textContent = more
      ? text("GEffectProperties", "text.more")
      : (Locale.getValue((entry as EffectEntry).i18n, "name") as string);
    label.classList.add("effects-default-label");
    const plus = el("span");
    plus.textContent = "+";
    const button = el("div", "effects-default");
    button.append(label, plus);
    button.addEventListener("click", () => click(button));
    (this._panel as HTMLElement).appendChild(button);
  }

  _updateToolbar(): void {
    const panel = this._panel as HTMLElement;
    const filled =
      panel.querySelectorAll(".effect-block").length > 0 ||
      panel.querySelectorAll(".effects-default").length > 0;
    toggleClass(this._toolbar as HTMLElement, "empty-list", !filled);
  }

  override toString(): string {
    return "[Object GEffectProperties]";
  }
}

/** `gUnitBox("options")` of an input: the options of its InputBox. */
function inputOptions(input: Element): Record<string, unknown> {
  // The old plugin read $(input).data("ginputbox").options.
  return (InputBox.of(input)?.options as Record<string, unknown> | undefined) ?? {};
}

/** The inspector sidebar, as the rows notify it of added and removed effects. */
function inspectorSidebar(): { trigger(event: SidebarEvent): void } {
  return designer().getRightSidebars().getSidebar(SidebarsIds.GInspectorSidebar) as unknown as {
    trigger(event: SidebarEvent): void;
  };
}

/**
 * The row's context menu (the effect menu of the context menu): the old
 * handler took the contextmenu event, or the touch settings button's click
 * with data.context set, and re-triggered it on #windows with the effect.
 */
function openContextMenu(event: MouseEvent, block: HTMLElement): void {
  event.preventDefault();
  const effect = getData(block, "effect");
  const menu = designer().getContextMenu();
  if (!menu) return;
  menu.trigger({
    previousEvent: {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
      data: { context: ContextMenuContext.EffectPropertyPanel },
    },
    data: { effect },
  });
}
