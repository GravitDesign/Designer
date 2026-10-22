import type { Scenario } from "../../support/scenario.ts";
import type { ToolCase } from "./case.ts";
import { THREE } from "./cases-pointer.ts";
import {
  clickElement,
  down,
  keyDown,
  keyUp,
  move,
  press,
  probe,
  probeDom,
  tool,
  up,
  wait,
  type Step,
} from "./steps.ts";

/** Every tool shortcut key in the app's tool table. */
const KEYS = ["v", "d", "o", "l", "p", "b", "k", "r", "m", "e", "t", "s", "h", "z"];

const shapesButton = "#toolbar .shapes-toolbar-button";

export const toolmgrCases: ToolCase[] = [
  {
    id: "toolmgr/all-tool-shortcuts",
    covers: [
      "EDT-TOOLMGR-025",
      "EDT-TOOLMGR-006",
      "EDT-TOOL-001",
      "EDT-TOOL-027",
      "EDT-TOOL-033",
      "EDT-TOOL-036",
      "EDT-TOOL-038",
      "EDT-TOOL-052",
      "EDT-TOOL-063",
      "EDT-TOOL-069",
      "EDT-TOOL-070",
      "EDT-TOOL-071",
      "EDT-TOOL-076",
      "EDT-TOOL-080",
      "EDT-TOOL-081",
      "EDT-TOOL-096",
      "EDT-CURSOR-009",
    ],
    fixture: THREE,
    steps: [
      move(600, 500),
      ...KEYS.flatMap((k): Step[] => [
        press(k),
        wait(30),
        move(601, 501),
        move(600, 500),
        probe(k),
      ]),
    ],
  },
  {
    id: "toolmgr/quick-tap-keeps-tool",
    covers: ["EDT-TOOLMGR-007"],
    fixture: THREE,
    steps: [move(600, 500), keyDown("e"), wait(50), keyUp("e"), wait(600), probe("after-tap")],
  },
  {
    id: "toolmgr/no-switch-mid-drag",
    covers: ["EDT-TOOLMGR-005"],
    steps: [
      move(50, 50),
      press("r"),
      down(100, 100),
      move(150, 150),
      press("e"),
      probe("still-rectangle"),
      move(200, 200),
      up(),
      probe("after"),
    ],
  },
  {
    id: "toolmgr/toolbar-shape-dropdown",
    covers: ["EDT-TOOLMGR-029", "EDT-TOOLMGR-005"],
    fixture: THREE,
    steps: [
      probeDom("before", `${shapesButton} .action-button .icon`),
      clickElement(`${shapesButton} .dropdown-button`),
      wait(200),
      clickElement('.g-menu.g-menu-bottom .g-menu-item:has-text("Polygon")'),
      wait(100),
      probeDom("polygon", `${shapesButton} .action-button .icon`),
      ...[move(100, 300), down(100, 300), move(150, 320), move(200, 350), up()],
      wait(50),
      probeDom("after-draw", `${shapesButton} .action-button .icon`),
      clickElement(`${shapesButton} .action-button`),
      wait(100),
      probe("group-button-activates-last-tool"),
    ],
  },
  {
    id: "toolmgr/toolbar-click-active-resets",
    covers: ["EDT-TOOLMGR-030"],
    fixture: THREE,
    steps: [
      move(600, 500),
      press("r"),
      probe("rectangle"),
      clickElement(`${shapesButton} .action-button`),
      wait(100),
      probe("pointer"),
    ],
  },
  {
    id: "toolmgr/switch-tool-closes-inline-editor",
    covers: ["EDT-TOOLMGR-006"],
    fixture: { shapes: [{ type: "text", x: 100, y: 100, text: "Hello world" }], select: [0] },
    steps: [
      move(600, 500),
      press("Enter"),
      wait(50),
      probe("inline"),
      tool("GRectangleTool"),
      wait(100),
      probe("switched"),
    ],
  },
];

/** In-page scenarios: tool registry, tool table and cursor CSS. */
export const toolmgrInPage: Scenario[] = [
  {
    id: "editor-tools/toolmgr/registry",
    covers: [
      "EDT-TOOLMGR-001",
      "EDT-TOOLMGR-002",
      "EDT-TOOLMGR-013",
      "EDT-TOOL-094",
      "EDT-TOOL-062",
    ],
    kind: "json",
    // Index, name, cursor and class relations, so the connector (which
    // reuses the pen's name) and the two fill tools can be told apart.
    inPage: ({ app }) => app.editorTools.toolRegistry(),
  },
  {
    id: "editor-tools/toolmgr/tool-table",
    covers: ["EDT-TOOLMGR-024", "EDT-TOOL-086", "EDT-TOOL-085", "EDT-TOOL-075"],
    kind: "json",
    inPage: ({ app }) => app.editorTools.toolTable(),
  },
  {
    id: "editor-tools/cursors/css-rules",
    covers: ["EDT-CURSOR-001", "EDT-CURSOR-002", "EDT-CURSOR-008"],
    kind: "json",
    inPage: () => {
      // Every .g-cursor-* rule the app injected, with the page origin
      // removed from asset URLs.
      const rules: [string, string][] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let list: CSSRuleList;
        try {
          list = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(list)) {
          if (rule instanceof CSSStyleRule && rule.selectorText.startsWith(".g-cursor-")) {
            rules.push([rule.selectorText, rule.style.cursor.split(location.origin).join("")]);
          }
        }
      }
      return rules.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    },
  },
];
