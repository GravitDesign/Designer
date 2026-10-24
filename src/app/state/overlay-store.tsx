/**
 * Dialogs, menus and popups that imperative code opens (docs/rewrite/UI.md,
 * section 6). The old code appended their elements to body; here each
 * open overlay is a portal into document.body, rendered by <OverlayHost/>
 * in open order, so the elements end up in the same place.
 */
import { Fragment, useLayoutEffect, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { create } from "zustand";

export interface OverlayOptions {
  /** A name for tests and debugging; several overlays may share it. */
  key: string;
  render: () => ReactNode;
  /** Called once after the overlay was closed. */
  onClosed?: () => void;
}

export interface OverlayHandle {
  readonly id: number;
  readonly key: string;
  isOpen(): boolean;
  /** Renders the overlay again (its controller state changed). */
  update(): void;
  close(): void;
}

interface OverlayEntry {
  id: number;
  key: string;
  render: () => ReactNode;
  /** Changes on update(), so the host renders the entry again. */
  revision: number;
}

interface OverlayState {
  overlays: readonly OverlayEntry[];
}

export const useOverlayStore = create<OverlayState>()(() => ({ overlays: [] }));

let nextId = 1;
/** True while React renders; flushSync is not allowed then. */
let rendering = 0;

/** Applies a store change, synchronously when React allows it. */
function commit(change: () => void): void {
  if (rendering > 0 || !hostMounted) {
    change();
    return;
  }
  flushSync(change);
}

let hostMounted = false;

export function openOverlay(options: OverlayOptions): OverlayHandle {
  const id = nextId++;
  let open = true;
  commit(() => {
    useOverlayStore.setState((state) => ({
      overlays: [...state.overlays, { id, key: options.key, render: options.render, revision: 0 }],
    }));
  });
  return {
    id,
    key: options.key,
    isOpen: () => open,
    update() {
      if (!open) return;
      commit(() => {
        useOverlayStore.setState((state) => ({
          overlays: state.overlays.map((entry) =>
            entry.id === id ? { ...entry, revision: entry.revision + 1 } : entry,
          ),
        }));
      });
    },
    close() {
      if (!open) return;
      open = false;
      commit(() => {
        useOverlayStore.setState((state) => ({
          overlays: state.overlays.filter((entry) => entry.id !== id),
        }));
      });
      if (options.onClosed) options.onClosed();
    },
  };
}

/** The keys of the open overlays, oldest first (tests, parity hooks). */
export function openOverlayKeys(): string[] {
  return useOverlayStore.getState().overlays.map((entry) => entry.key);
}

/** Closes everything without callbacks (app reset). */
export function clearOverlays(): void {
  commit(() => useOverlayStore.setState({ overlays: [] }));
}

function OverlayContent({ entry }: { entry: OverlayEntry }): ReactNode {
  rendering++;
  try {
    return entry.render();
  } finally {
    rendering--;
  }
}

/** Renders the open overlays into document.body; App renders it once. */
export function OverlayHost(): ReactNode {
  const overlays = useOverlayStore((state) => state.overlays);
  useLayoutEffect(() => {
    hostMounted = true;
    return () => {
      hostMounted = false;
    };
  }, []);
  return (
    <>
      {overlays.map((entry) => (
        <Fragment key={entry.id}>
          {createPortal(<OverlayContent entry={entry} />, document.body)}
        </Fragment>
      ))}
    </>
  );
}
