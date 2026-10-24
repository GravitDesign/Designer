/**
 * Creates #mainframe as the first child of body (GDesigner.init prepended
 * it there, and the old stylesheets select `body > #mainframe` and
 * `body.g-quick-help > #mainframe > div > ...`), renders the shell (App)
 * into it synchronously and hands the part elements to the designer
 * (Designer.shellBuilder), which needs them in init() right away
 * (docs/rewrite/UI.md, section 2).
 */
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { App } from "../App.tsx";
import { Designer, type ShellElements } from "./designer.ts";

/** Connects the designer to the shell; call before designer.init(). */
export function installShell(): void {
  Designer.shellBuilder = () => {
    const mainframe = document.createElement("div");
    mainframe.setAttribute("id", "mainframe");
    document.body.prepend(mainframe);
    const root = createRoot(mainframe);
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
    const frame = elements.frame;
    if (!frame) throw new Error("the shell did not render");
    const shell: ShellElements = { mainframe, frame, parts: elements };
    return shell;
  };
}
