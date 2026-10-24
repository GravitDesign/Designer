import { ConnectorTool } from "../../editor/tools/connector-tool.ts";
import { EllipseTool } from "../../editor/tools/ellipse-tool.ts";
import { FillTool } from "../../editor/tools/fill-tool.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { ItemTool } from "../../editor/tools/item-tool.ts";
import { LayerTool } from "../../editor/tools/layer-tool.ts";
import { LineTool } from "../../editor/tools/line-tool.ts";
import { MagicTool } from "../../editor/tools/magic-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { PolygonTool } from "../../editor/tools/polygon-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { SimpleShapeTool } from "../../editor/tools/simple-shape-tool.ts";
import { SliceTool } from "../../editor/tools/slice-tool.ts";
import { StarTool } from "../../editor/tools/star-tool.ts";
import { TextTool } from "../../editor/tools/text-tool.ts";
import { Tool } from "../../editor/tools/tool.ts";
import { ToolManager } from "../../editor/tools/tool-manager.ts";
import { TriangleTool } from "../../editor/tools/triangle-tool.ts";
import { ZoomTool } from "../../editor/tools/zoom-tool.ts";

// The tools of this cluster under the names the old editor barrel (vendor
// module 53) gave them. GShapeTool was not in that barrel.
export const editorToolsBase = {
  GConnectorTool: ConnectorTool,
  GTriangleTool: TriangleTool,
  GTextTool: TextTool,
  GRectangleTool: RectangleTool,
  GLineTool: LineTool,
  GStarTool: StarTool,
  GZoomTool: ZoomTool,
  GHandTool: HandTool,
  GPointerTool: PointerTool,
  GFillTool: FillTool,
  GPolygonTool: PolygonTool,
  GLayerTool: LayerTool,
  GEllipseTool: EllipseTool,
  GSimpleShapeTool: SimpleShapeTool,
  GSliceTool: SliceTool,
  GMagicTool: MagicTool,
  GToolManager: ToolManager,
  GTool: Tool,
  GItemTool: ItemTool,
};
