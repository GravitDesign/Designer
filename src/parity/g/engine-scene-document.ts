import { Layer } from "../../engine/scene/layer.ts";
import { Page } from "../../engine/scene/page.ts";
import { SceneUtil } from "../../engine/scene/scene-util.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { TransactionRecorder } from "../../engine/undo/transaction-recorder.ts";

// Only the names the old G barrel (vendor module 1) had. The selector
// engine (module 507) and the styles container (module 915) were not in it.
export const engineSceneDocument = {
  GScene: Scene,
  GPage: Page,
  GLayer: Layer,
  GWorkspace: Workspace,
  GTransactionRecorder: TransactionRecorder,
  GSceneUtil: SceneUtil,
};
