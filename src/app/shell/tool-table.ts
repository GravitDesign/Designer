// Old: designer.browser.dev.js module 1483 (gravit.tools).
/**
 * The app's tools in toolbar and shortcut order, with their keys, groups,
 * icons and rich tooltips. The first one is activated at start. The
 * bezigon tool is a pro feature, which this build always has (its tooltip
 * says isPro false).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { BezigonTool } from "../../editor/tools/bezigon-tool.ts";
import { EllipseTool } from "../../editor/tools/ellipse-tool.ts";
import { FreehandTool } from "../../editor/tools/freehand-tool.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { KnifeTool } from "../../editor/tools/knife-tool.ts";
import { LassoTool } from "../../editor/tools/lasso-tool.ts";
import { LayerTool } from "../../editor/tools/layer-tool.ts";
import { LineTool } from "../../editor/tools/line-tool.ts";
import { MagicTool } from "../../editor/tools/magic-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { PolygonTool } from "../../editor/tools/polygon-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { SliceTool } from "../../editor/tools/slice-tool.ts";
import { StarTool } from "../../editor/tools/star-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import { TextTool } from "../../editor/tools/text-tool.ts";
import type { ToolClass } from "../../editor/tools/tool-manager.ts";
import { TriangleTool } from "../../editor/tools/triangle-tool.ts";
import { ZoomTool } from "../../editor/tools/zoom-tool.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import type { ToolTableEntry } from "./registry.ts";

interface TooltipOptions {
  video?: string;
  isPro?: boolean;
  shortcut?: string[];
}

const localized = (owner: string, key: string): string =>
  Locale.get(new LocaleKey(owner, key)) as string;

/**
 * gApi.getRichTooltipVideoURL: the API address (the page origin in a local
 * build) and the name of the video.
 */
const videoUrl = (name: string): string =>
  (typeof location === "object" ? location.origin : "") + "/rich-tooltip-video/" + name;

/**
 * GRichTooltipConfig.from, as the old table built it. The tooltip plugin
 * takes only real configs ("Not a Tooltip Config" otherwise). Fields not
 * given stay undefined, so JSON shows only the given ones.
 */
function richTooltip(owner: string, options: TooltipOptions): RichTooltipConfig {
  return RichTooltipConfig.from({
    title: localized(owner, "tooltip-title"),
    description: localized(owner, "tooltip-description"),
    video: options.video !== undefined ? videoUrl(options.video) : undefined,
    isPro: options.isPro,
    middle: false,
    shortcut: options.shortcut,
    learnMore: "",
  });
}

function entry(
  tool: ToolClass,
  toolString: string,
  fields: Omit<ToolTableEntry, "tool" | "toolString" | "title" | "richTooltipConfig">,
  tooltip: TooltipOptions,
): ToolTableEntry {
  return {
    tool,
    toolString,
    title: localized(toolString, "name"),
    ...fields,
    richTooltipConfig: richTooltip(toolString, tooltip),
  };
}

/** The table, built when the registry is built (after the language is set). */
export function buildToolTable(): ToolTableEntry[] {
  return [
    entry(
      PointerTool,
      "GPointerTool",
      { group: "select", key: "V", icon: "gravit-icon-cursor-filled" },
      { shortcut: ["V"], video: "Pointer_Tool.mp4" },
    ),
    entry(
      SubSelectTool,
      "GSubSelectTool",
      { group: "select", key: "D", icon: "gravit-icon-cursor" },
      { shortcut: ["D"], video: "Subselect_Tool.mp4" },
    ),
    entry(
      LassoTool,
      "GLassoTool",
      { group: "select", category: "special", key: "O", icon: "gravit-icon-rope" },
      { shortcut: ["O"], video: "Lasso_Tool.mp4" },
    ),
    entry(
      LayerTool,
      "GLayerTool",
      { group: "select", category: "special", icon: "gravit-icon-sheets" },
      {},
    ),
    entry(
      SliceTool,
      "GSliceTool",
      { group: "select", category: "other", key: "S", icon: "gravit-icon-slice" },
      { shortcut: ["S"] },
    ),
    entry(
      PenTool,
      "GPenTool",
      { group: "path", key: "P", icon: "gravit-icon-pen" },
      { shortcut: ["P"], video: "Pen_Too.mp4" },
    ),
    entry(
      BezigonTool,
      "GBezigonTool",
      { group: "path", key: "B", icon: "gravit-icon-pen-filled", pro: true, feature: "bezigon" },
      { shortcut: ["B"], isPro: false, video: "Bezigon_Tool.mp4" },
    ),
    entry(
      KnifeTool,
      "GKnifeTool",
      { group: "knife", category: "modify", key: "K", icon: "gravit-icon-scalpel" },
      { shortcut: ["K"], video: "Knife_Tool.mp4" },
    ),
    entry(
      FreehandTool,
      "GFreehandTool",
      { group: "path", category: "hand", icon: "gravit-icon-free-hand-draw" },
      { video: "Freehand_Tool.mp4" },
    ),
    entry(
      MagicTool,
      "GMagicTool",
      { group: "knife", category: "modify", icon: "gravit-icon-freehand-shape" },
      { video: "Freehand_Shaping_Tool.mp4" },
    ),
    entry(
      LineTool,
      "GLineTool",
      { group: "shape", key: "L", icon: "gravit-icon-line" },
      { shortcut: ["L"], video: "Line_Tool.mp4" },
    ),
    entry(
      RectangleTool,
      "GRectangleTool",
      { group: "shape", key: "R", shortcuts: [["M"]], icon: "gravit-icon-rectangle" },
      { shortcut: ["R"], video: "Rectangle_Tool.mp4" },
    ),
    entry(
      EllipseTool,
      "GEllipseTool",
      { group: "shape", key: "E", icon: "gravit-icon-ellipse" },
      { shortcut: ["E"], video: "Ellipse_Tool.mp4" },
    ),
    entry(
      PolygonTool,
      "GPolygonTool",
      { group: "shape", category: "polygon", icon: "gravit-icon-polygon" },
      {},
    ),
    entry(
      TriangleTool,
      "GTriangleTool",
      { group: "shape", category: "polygon", icon: "gravit-icon-triangle" },
      {},
    ),
    entry(
      StarTool,
      "GStarTool",
      { group: "shape", category: "polygon", icon: "gravit-icon-star" },
      {},
    ),
    entry(
      TextTool,
      "GTextTool",
      { group: "insert", key: "T", icon: "gravit-icon-textbox" },
      { video: "Text_Tool.mp4", shortcut: ["T"] },
    ),
    entry(
      HandTool,
      "GHandTool",
      { group: "view", key: "H", icon: "gravit-icon-move" },
      { shortcut: ["H"] },
    ),
    entry(
      ZoomTool,
      "GZoomTool",
      { group: "view", key: "Z", icon: "gravit-icon-zoom-in" },
      { shortcut: ["Z"] },
    ),
  ];
}
