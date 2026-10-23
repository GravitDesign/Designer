import { BezigonTool } from "../../editor/tools/bezigon-tool.ts";
import { FreehandTool } from "../../editor/tools/freehand-tool.ts";
import { KnifeTool } from "../../editor/tools/knife-tool.ts";
import { PathTool } from "../../editor/tools/path-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";

export const editorToolsPath = {
  GPathTool: PathTool,
  GPenTool: PenTool,
  GBezigonTool: BezigonTool,
  GFreehandTool: FreehandTool,
  GKnifeTool: KnifeTool,
};
