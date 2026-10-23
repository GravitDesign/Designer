// Old: chunk.vendor.js module 1458 (the exporter's post-processing).
import type { SvgDocument, SvgElement, SvgNode } from "./svg-dom.ts";

/**
 * Unwraps redundant groups: a `<g>` without attributes, not marked to keep
 * (_keepIt) and not directly inside `<switch>`, is replaced by its
 * children. The walk continues with the first moved child.
 */
export class SvgPostProcess {
  constructor(private readonly _document: SvgDocument) {}

  postProcess(): void {
    this.removeRedundantGroups();
    this.removeDefaultAttributes();
  }

  removeRedundantGroups(): void {
    this._visit(this._document.documentElement.childNodes);
  }

  removeDefaultAttributes(): void {}

  _visit(nodes: SvgNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as SvgNode;
      if (
        "g" !== node.nodeName ||
        0 != (node as SvgElement).attributes.length ||
        (node as SvgElement)._keepIt ||
        (node.parentNode && "switch" === node.parentNode.nodeName)
      ) {
        this._visit(node.childNodes);
      } else {
        const group = node as SvgElement;
        const parent = group.parentElement as SvgElement;
        while (group.childNodes.length > 0) {
          parent.insertBefore(
            group.childNodes[group.childNodes.length - 1] as SvgNode,
            group.nextSibling,
          );
        }
        parent.removeChild(group);
        i--;
      }
    }
  }
}
