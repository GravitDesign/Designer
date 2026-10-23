/**
 * The shell's DOM: #mainframe > .frame with the parts in the old order
 * (GDesigner.init, designer.browser.dev.js module 1491), and the overlay
 * host for dialogs and menus. The parts render no children and no style:
 * their controllers fill them and lay them out (docs/rewrite/UI.md,
 * section 5).
 */
import type { ReactNode, RefCallback } from "react";
import { Layout } from "./shell/layout-ids.ts";
import { OverlayHost } from "./state/overlay-store.tsx";

/** The parts under .frame, in the order GDesigner.init appended them. */
export const FRAME_PARTS = [
  Layout.Windows,
  Layout.Info,
  Layout.Header,
  Layout.Toolbar,
  Layout.Banner,
  Layout.Overlay,
  Layout.Panels,
  Layout.Footer,
  Layout.LeftSidebars,
  Layout.RightSidebars,
] as const;

export interface AppProps {
  /** Receives every element of the shell once it is in the document. */
  onElement?: (id: string, element: HTMLElement | null) => void;
}

export function App({ onElement }: AppProps): ReactNode {
  const ref =
    (id: string): RefCallback<HTMLElement> =>
    (element) => {
      if (onElement) onElement(id, element);
    };
  return (
    <>
      <div id="mainframe" ref={ref("mainframe")}>
        <div className="frame" ref={ref("frame")}>
          {FRAME_PARTS.map((part) => (
            <div key={part.id} id={part.id} ref={ref(part.id)} />
          ))}
        </div>
      </div>
      <OverlayHost />
    </>
  );
}
