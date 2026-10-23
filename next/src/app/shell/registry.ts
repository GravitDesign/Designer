/**
 * The old window.gravit table (built by bootstrap, module 1483): every
 * tool, action, sidebar, bottom panel and footer panel in registration
 * order. The order is what the menus, the toolbar and the shortcuts
 * dialog show.
 */
import type { ToolClass } from "../../editor/tools/tool-manager.ts";
import type { Action } from "../actions/action.ts";
import type { SidebarLike } from "./layout.ts";
import type { HostedView } from "./part.ts";

/** GRichTooltipConfig as the tool table holds it (only the given fields are set). */
export interface RichTooltipConfig {
  _title: string;
  _description: string;
  _video?: string;
  _isPro?: boolean;
  _middle: boolean;
  _shortcut?: string[];
  _learnMore: string;
}

/** One entry of gravit.tools. */
export interface ToolTableEntry {
  tool: ToolClass;
  toolString: string;
  title: string;
  group: string;
  category?: string;
  key?: string;
  shortcuts?: string[][];
  icon: string;
  pro?: boolean;
  feature?: string;
  richTooltipConfig: RichTooltipConfig;
}

export interface AppRegistry {
  plugins: unknown[];
  actions: Action[];
  sidebars: SidebarLike[];
  panels: HostedView[];
  footer: HostedView[];
  tools: ToolTableEntry[];
}
