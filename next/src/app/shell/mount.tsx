/**
 * Renders the shell (App) into the React root synchronously and hands
 * the part elements to the designer (Designer.shellBuilder), which needs
 * them in init() right away (docs/rewrite/UI.md, section 2).
 */
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { App } from "../App.tsx";
import { Designer, type ShellElements } from "./designer.ts";

/** Connects the designer to the root; call before designer.init(). */
export function installShell(root: Root): void {
  Designer.shellBuilder = () => {
    const elements: Record<string, HTMLElement> = {};
    flushSync(() => {
      root.render(
        <App
          onElement={(id, element) => {
            if (element) elements[id] = element;
          }}
        />,
      );
    });
    const mainframe = elements.mainframe;
    const frame = elements.frame;
    if (!mainframe || !frame) throw new Error("the shell did not render");
    const shell: ShellElements = { mainframe, frame, parts: elements };
    return shell;
  };
}
