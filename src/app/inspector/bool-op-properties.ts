// Old: designer.browser.dev.js module 1264 (GBoolOpProperties).
/**
 * The boolean operation (union, subtract, intersect, difference) of the
 * children of a compound shape after the first one. Shown for a compound
 * shape with children, or for such children themselves.
 */
import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Document } from "../document/document.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";
import {
  editorOf,
  el,
  Properties,
  propertyRow,
  sceneOf,
  text,
  type InspectedElements,
} from "./properties.ts";

/** A node with the properties mixin. */
type PropertyNode = Node & {
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): unknown;
};

/** The statistics name of an operation. */
export function boolOpStatsName(op: number): string {
  return op === VertexPolyBoolean.OR
    ? "merge"
    : op === VertexPolyBoolean.AND
      ? "intersect"
      : op === VertexPolyBoolean.XOR
        ? "difference"
        : op === VertexPolyBoolean.SUB
          ? "subtract"
          : "unkn";
}

/**
 * The elements whose operation the panel edits: compound shape children
 * after the first one, or every child after the first of a selected
 * compound shape.
 */
export function boolOpElements(elements: readonly Node[]): Node[] {
  const out: Node[] = [];
  for (let n = 0; n < elements.length; ++n) {
    const element = elements[n] as Node;
    const parent = element.getParent();
    if (parent && parent instanceof CompoundShape && element.getPrevious()) out.push(element);
    else if (element instanceof CompoundShape && element.getFirstChild())
      for (
        let child = (element.getFirstChild() as Node).getNext();
        null !== child;
        child = child.getNext()
      )
        out.push(child);
  }
  return out;
}

export class BoolOpProperties extends Properties {
  _panel: HTMLElement | null = null;
  override _document: Document | null = null;
  _elements: Node[] | null = null;

  /** A divider only after the appearance panel. */
  override isGroup(previous: Properties | null): boolean {
    const appearance = lateExport<abstract new () => Properties>(
      "inspector/appearance-properties.ts",
      "AppearanceProperties",
    );
    return typeof appearance === "function" && previous instanceof appearance;
  }

  override init(panel: HTMLElement): void {
    this._panel = panel;
    const click = (event: MouseEvent) => {
      const op = parseInt(
        (event.target as HTMLElement).closest("[data-op]")?.getAttribute("data-op") as string,
      );
      designer().stats("booleanops_click_" + boolOpStatsName(op));
      const editor = editorOf(this._document as Document);
      editor.beginTransaction();
      try {
        const elements = this._elements as Node[];
        for (let i = 0; i < elements.length; ++i)
          (elements[i] as PropertyNode).setProperty("bool", op);
      } finally {
        editor.commitTransaction(text("GBoolOpProperties", "action.modify-merge-mode"));
      }
    };
    const button = (op: number, title: string, icon: string) => {
      const element = el("button", "compound-chooser-btn");
      element.setAttribute("data-op", String(op));
      element.setAttribute("data-title", text("GBoolOpProperties", title));
      element.appendChild(el("span", icon));
      element.addEventListener("click", click);
      return element;
    };
    const row = el("div", "compound-row");
    propertyRow(row, {
      label: text("GBoolOpProperties", "text.boolean"),
      columns: [
        {
          width: "25%",
          content: button(VertexPolyBoolean.OR, "text.union", "gravit-icon-merge-union"),
        },
        {
          width: "25%",
          content: button(VertexPolyBoolean.SUB, "text.subtract", "gravit-icon-merge-subtract"),
        },
        {
          width: "25%",
          content: button(VertexPolyBoolean.AND, "text.intersect", "gravit-icon-merge-intersect"),
        },
        {
          width: "25%",
          content: button(VertexPolyBoolean.XOR, "text.difference", "gravit-icon-merge-difference"),
        },
      ],
    });
    panel.appendChild(row);
    panel.appendChild(el("hr"));
  }

  override update(document: Document | null, elements: InspectedElements | null): boolean {
    if (this._document) {
      // The old code removed the scene listener without its target.
      sceneOf(this._document as Document).removeEventListener(
        AfterPropertiesChangeEvent,
        this._afterPropertiesChange,
      );
      this._document = null;
    }
    this._elements = [];
    if (document && elements) {
      this._elements = boolOpElements(elements);
      if (this._elements.length) {
        this._document = document;
        sceneOf(document).addEventListener(
          AfterPropertiesChangeEvent,
          this._afterPropertiesChange,
          this,
        );
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    const elements = this._elements as Node[];
    if (!event.temporary && elements.length > 0 && elements[0] === event.node)
      this._updateProperties();
  }

  _updateProperties(): void {
    const element = (this._elements as Node[])[0] as PropertyNode;
    for (const button of (this._panel as HTMLElement).querySelectorAll("button[data-op]"))
      button.classList.toggle(
        "g-active",
        element.getProperty("bool") === parseInt(button.getAttribute("data-op") as string),
      );
  }

  override toString(): string {
    return "[Object GBoolOpProperties]";
  }
}
