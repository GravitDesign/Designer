/**
 * window.__parity.app.platform, the hooks declared in
 * parity/scenarios/platform/contract.ts, over the designer's documents.
 */
import type { Node } from "../../engine/scene/node.ts";
import { designer } from "../../app/shell/globals.ts";

export const platformHooks = {
  platform: {
    /**
     * The open documents as the tab bar shows them: titles in tab order,
     * the active one, its modified flag and the node names on its active
     * page (top level only), as old-hooks.js reports them.
     */
    documents(): {
      titles: string[];
      active: string | null;
      modified: boolean | null;
      nodes: string[];
    } {
      const d = designer();
      const active = d.getActiveDocument();
      const nodes: string[] = [];
      if (active) {
        const page = active.getScene()?.getActivePage() ?? null;
        for (let n: Node | null = page ? page.getFirstChild() : null; n; n = n.getNext()) {
          nodes.push(n.getNodeName());
        }
      }
      return {
        titles: d.getDocuments().map((doc) => doc.getTitle()),
        active: active ? active.getTitle() : null,
        modified: active ? active.isModified() : null,
        nodes,
      };
    },
  },
};
