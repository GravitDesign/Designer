// Old: designer.browser.dev.js module 863.
/** The parts of the shell: each is the element with this id under #mainframe > .frame. */
export interface LayoutPart {
  readonly id: string;
}

export const Layout = {
  Info: { id: "info" },
  Header: { id: "header" },
  Toolbar: { id: "toolbar" },
  Panels: { id: "panels" },
  Footer: { id: "footer" },
  LeftSidebars: { id: "left-sidebars" },
  RightSidebars: { id: "right-sidebars" },
  Windows: { id: "windows" },
  AssistantBar: { id: "assistant-bar" },
  Banner: { id: "banner" },
  Overlay: { id: "overlay" },
} as const satisfies Record<string, LayoutPart>;
