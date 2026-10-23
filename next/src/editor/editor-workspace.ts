// Old: chunk.vendor.js module 778 (GEditorWorkspace).
import { registerClass } from "../engine/core/object.ts";
import { Workspace } from "../engine/scene/workspace.ts";
import { StyleEdManager } from "./style-ed-manager.ts";

/**
 * The tool manager (GToolManager, editor/tools/tool-manager.ts) comes with
 * the editor-tools-base cluster (level 9). The old workspace constructed
 * one itself; here that cluster registers its constructor with
 * registerToolManagerFactory, and workspaces made before then have none.
 */
let toolManagerFactory: (() => unknown) | null = null;

/** Hook for editor-tools-base: how an editor workspace makes its GToolManager. */
export function registerToolManagerFactory(factory: () => unknown): void {
  toolManagerFactory = factory;
}

/** The app's workspace: the engine's plus the editor's style editor and tool managers. */
export class EditorWorkspace extends Workspace {
  static {
    registerClass(this, "GEditorWorkspace");
  }

  declare _styleEdManager: StyleEdManager;
  declare _toolManager: unknown;

  constructor() {
    super();
    this._styleEdManager = new StyleEdManager();
    this._toolManager = toolManagerFactory ? toolManagerFactory() : null;
  }

  getStyleEdManager(): StyleEdManager {
    return this._styleEdManager;
  }

  getToolManager(): unknown {
    return this._toolManager;
  }
}
