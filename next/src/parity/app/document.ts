/**
 * Interim document hooks for the parity harness: app.newInfiniteDocument,
 * app.document, app.scene, app.serialize and app.deserialize.
 *
 * In the old app these come from GDesigner and its GDocument
 * (designer.browser.dev.js, the app-config-document cluster, ported
 * later). This file ports only the part of that path that builds and
 * configures the scene, so engine scenarios can run before the app
 * exists. The app-config-document cluster replaces it.
 *
 * What it ports:
 * - the app's one workspace, made when GDesigner is constructed (the old
 *   app made a GEditorWorkspace, which only adds the editor's style and
 *   tool managers; those belong to the editor phase);
 * - the engine options the app sets at boot (GSceneOptions.scaleLabel =
 *   false, GSceneOptions.defaultBorderPositionForLines = true);
 * - GDesigner.createScene and GDesigner.newInfiniteDocument: a scene in
 *   the workspace whose first page is white and has no size (w = h = 0,
 *   the infinite canvas). createScene also copied
 *   GEditorOptions.scaleBorderWidth and scaleCorners to the scene; both
 *   are undefined unless the editor sets them, and the old app never
 *   does, so nothing is copied;
 * - the one engine call that activating the new document makes:
 *   scene.getAnnotations() from the annotations sidebar, which creates
 *   the pages' annotations lists.
 *
 * What it leaves out: the editor (GEditor, app.editor(), editor phase),
 * the views and windows, the font providers and default font
 * (app-fonts-ui), document titles and storage. Scenarios that need them
 * stay unlisted. In particular the GEditor constructor, which the old
 * GDocument ran for every scene, sets scene.__graphic_editor__, adds the
 * AfterInsert, BeforeRemove, flag and geometry listeners and moves the
 * ":selected" nodes into the selection; and boot set the page shadow of
 * GEditorPaintConfiguration.prototype.pageDecoration (blur 4, offset y 2,
 * rgba(0,0,0,0.25)). An engine scenario whose result depends on those
 * listeners, or on page shadows in the multi-page view, waits for the
 * editor phase.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Node } from "../../engine/scene/node.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import type { SerializeOptions } from "../../engine/serialize/blob.ts";

// GDesigner.init: the scene options the app always runs with.
SceneOptions.scaleLabel = false;
SceneOptions.defaultBorderPositionForLines = true;

/** The part of GDocument the hooks use: it owns one scene. */
export class InterimDocument {
  constructor(private readonly scene: Scene) {}

  getScene(): Scene {
    return this.scene;
  }
}

const workspace = new Workspace();
let activeDocument: InterimDocument | null = null;

/** GDesigner.createScene. */
function createScene(noPage?: boolean): Scene {
  return new Scene(workspace, noPage);
}

/**
 * GDesigner.newInfiniteDocument: a white, unbounded first page. Returns
 * the document like the old method did (the old harness hook drops it).
 */
function newInfiniteDocument(): InterimDocument {
  const scene = createScene();
  (scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>).setProperties(
    ["bck", "w", "h"],
    [RGBColor.WHITE, 0, 0],
  );
  const document = new InterimDocument(scene);
  activeDocument = document;
  // GDesigner.addDocument opens a window for it, which activates it; the
  // annotations sidebar (GAnnotationsSidebar._documentEvent) answers the
  // activation with scene.getAnnotations(), which gives every page its
  // annotations list ("annlst"). Documents in the old app always have one.
  scene.getAnnotations();
  return document;
}

function activeScene(): Scene {
  if (!activeDocument) throw new Error("no document (call app.newInfiniteDocument first)");
  return activeDocument.getScene();
}

export const documentHooks = {
  newInfiniteDocument,
  document(): InterimDocument | null {
    return activeDocument;
  },
  scene(): Scene {
    return activeScene();
  },
  serialize(options?: SerializeOptions): string | null {
    return Node.serialize(activeScene(), options);
  },
  deserialize(json: string): Node | Node[] | null {
    return Node.deserialize(json);
  },
};
