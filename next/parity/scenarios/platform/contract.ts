/**
 * Hooks the platform scenarios need from both apps, at
 * window.__parity.app.platform. The old app's version is old-hooks.js in
 * this folder; the new app must implement the same functions with the
 * same results.
 *
 * The platform scenarios also use the corpus hooks
 * (window.__parity.app.corpus: waitForDocument, settle; see
 * parity/scenarios/corpus/contract.ts) to wait until an opened file has
 * finished loading and drawing.
 */

/** The open documents, as PlatformHooks.documents() reports them. */
export interface DocState {
  /** Document titles in tab order. */
  titles: string[];
  /** Title of the active document (null when none is open). */
  active: string | null;
  /** Whether the active document has unsaved changes. */
  modified: boolean | null;
  /** Node names (GNode.getNodeName) of the top-level children of its active page. */
  nodes: string[];
}

export interface PlatformHooks {
  /**
   * The open documents: titles in tab order, the active one, its modified
   * flag and what its active page holds. Read-only: scenarios open, save
   * and close documents through the UI.
   */
  documents(): DocState;
}
