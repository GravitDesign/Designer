/**
 * What the shell components render of the designer and its windows: the
 * documents, the windows and which are active. Written only by Designer
 * and Windows (docs/rewrite/UI.md, section 4); `version` changes whenever
 * something a tab or title shows may have changed.
 */
import { create } from "zustand";

/** The parts of a document the shell renders (the real one is GDocument). */
export interface ShellDocument {
  getTitle(): string;
}

/** The parts of a window the shell renders. */
export interface ShellWindow {
  getTitle(): string;
  getDocument(): ShellDocument;
}

export interface ShellState {
  initialized: boolean;
  documents: readonly ShellDocument[];
  activeDocument: ShellDocument | null;
  windows: readonly ShellWindow[];
  activeWindow: ShellWindow | null;
  /** Bumped on title, status or modified changes of any document. */
  version: number;
}

export const useShellStore = create<ShellState>()(() => ({
  initialized: false,
  documents: [],
  activeDocument: null,
  windows: [],
  activeWindow: null,
  version: 0,
}));

/** Marks a change that tabs and titles may show. */
export function bumpShellVersion(): void {
  useShellStore.setState((state) => ({ version: state.version + 1 }));
}

/** Back to the state before boot (unit tests). */
export function resetShellStore(): void {
  useShellStore.setState({
    initialized: false,
    documents: [],
    activeDocument: null,
    windows: [],
    activeWindow: null,
    version: 0,
  });
}
