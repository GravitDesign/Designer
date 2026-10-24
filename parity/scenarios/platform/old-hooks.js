/* global window */
// Platform hooks for the old app (window.__parity.app.platform). The
// TypeScript contract is in contract.ts; the new app must provide the same
// functions with the same results. Plain JavaScript on purpose: it is
// evaluated in the page as is.
(() => {
  const parity = window.__parity;
  if (!parity || parity.app.platform) return;
  const designer = parity.app.designer;

  parity.app.platform = {
    // The open documents as the tab bar shows them: titles in tab order,
    // the active one, its modified flag and the node names on its active
    // page (top level only).
    documents() {
      const active = designer.getActiveDocument();
      const nodes = [];
      if (active) {
        const pageNode = active.getScene().getActivePage();
        for (let n = pageNode ? pageNode.getFirstChild() : null; n; n = n.getNext()) {
          nodes.push(n.getNodeName());
        }
      }
      return {
        titles: designer.getDocuments().map((d) => d.getTitle()),
        active: active ? active.getTitle() : null,
        modified: active ? active.isModified() : null,
        nodes,
      };
    },
  };
})();
