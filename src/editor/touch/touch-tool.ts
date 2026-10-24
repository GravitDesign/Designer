// Old: designer.browser.dev.js module 340 (GTouchTool).
/**
 * A tool of the touch layout's tool bar: which sidebar, panel and tool bar
 * it opens and its icon. The touch UI defines the instances; this module
 * defines the appearance tool, the one every touch layout has.
 */
/**
 * A tool's panel or label: a selector inside the sidebar's container, an
 * element, or several of them (the old code took all of these).
 */
export type TouchToolTarget = string | Element | (string | Element)[];

export interface TouchToolConfig {
  def?: boolean;
  id?: string | null;
  sidebar?: string | null;
  icon?: string | null;
  panel?: TouchToolTarget | null;
  panelWidth?: string | number;
  toolbar?: TouchToolTarget | null;
  activate?: () => void;
  deactivate?: () => void;
}

export class TouchTool {
  static APPEARANCE_TOUCH_TOOL: TouchTool;

  declare def: boolean;
  declare id: string | null;
  declare sidebar: string | null;
  declare icon: string | null;
  declare panel: TouchToolTarget | null;
  declare panelWidth?: string | number;
  declare toolbar: TouchToolTarget | null;

  constructor(config: TouchToolConfig) {
    Object.assign(this, config);
  }

  activate(): void {}

  deactivate(): void {}

  toString(): string {
    return "[Object GTouchTool]";
  }

  static {
    // The defaults lived on the old prototype, under the instance's own fields.
    Object.assign(TouchTool.prototype, {
      def: false,
      id: null,
      sidebar: null,
      icon: null,
      panel: null,
      toolbar: null,
    });
    TouchTool.APPEARANCE_TOUCH_TOOL = new TouchTool({
      id: "appearance",
      icon: "gravit-icon-touch-appearance-panel",
      panel: ".appearance-property-panel",
      panelWidth: "380px",
      toolbar: ".appearance-toolbar",
    });
  }
}
