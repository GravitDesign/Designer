// Old: chunk.vendor.js module 778 (GEditorWorkspace).
import { registerClass } from "../engine/core/object.ts";
import { Workspace } from "../engine/scene/workspace.ts";
import { StyleEdManager } from "./style-ed-manager.ts";
import type { ToolManager } from "./tools/tool-manager.ts";

/**
 * The old workspace constructed its GToolManager itself. Here
 * editor/tools/tool-manager.ts registers its constructor with
 * registerToolManagerFactory when it loads: importing the tools from this
 * file would load every tool with the workspace, and the tools import the
 * editor, which needs the workspace first. Importing editor/index.ts
 * loads the tool manager. A workspace made before that (or in a unit test
 * that never loads the tools) has no tool manager.
 */
let toolManagerFactory: (() => ToolManager) | null = null;

/** The missing-factory warning was printed. */
let missingFactoryWarned = false;

/**
 * Hook for editor/tools/tool-manager.ts: how an editor workspace makes its
 * GToolManager. Null removes the factory. Returns the factory it replaces,
 * so a test can put it back.
 */
export function registerToolManagerFactory(
  factory: (() => ToolManager) | null,
): (() => ToolManager) | null {
  const previous = toolManagerFactory;
  toolManagerFactory = factory;
  return previous;
}

/**
 * Warns once, in a development build, that a workspace got no tool
 * manager: the app then can't activate tools and its views paint no tool.
 * Unit tests (mode "test") make such workspaces on purpose and stay quiet.
 */
function warnMissingToolManager(): void {
  if (missingFactoryWarned || !import.meta.env.DEV || import.meta.env.MODE === "test") return;
  missingFactoryWarned = true;
  console.warn(
    "GEditorWorkspace: no tool manager factory is registered, so this workspace has no " +
      "tool manager. Import editor/index.ts before creating the workspace.",
  );
}

/** Lets the missing-factory warning print again (for tests). */
export function resetMissingToolManagerWarning(): void {
  missingFactoryWarned = false;
}

/** The app's workspace: the engine's plus the editor's style editor and tool managers. */
export class EditorWorkspace extends Workspace {
  static {
    registerClass(this, "GEditorWorkspace");
  }

  declare _styleEdManager: StyleEdManager;
  declare _toolManager: ToolManager | null;

  constructor() {
    super();
    this._styleEdManager = new StyleEdManager();
    if (toolManagerFactory) this._toolManager = toolManagerFactory();
    else {
      warnMissingToolManager();
      this._toolManager = null;
    }
  }

  getStyleEdManager(): StyleEdManager {
    return this._styleEdManager;
  }

  /** The workspace's tool manager; null only when the tools were never loaded. */
  getToolManager(): ToolManager | null {
    return this._toolManager;
  }
}
