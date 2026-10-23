import { describe, expect, it } from "vitest";
import { TouchTool } from "./touch-tool.ts";

describe("TouchTool", () => {
  it("takes its fields from the config, with the old defaults on the prototype", () => {
    const tool = new TouchTool({ id: "layers", icon: "gravit-icon-layers" });
    expect(tool.id).toBe("layers");
    expect(tool.def).toBe(false);
    expect(tool.panel).toBeNull();
    expect(Object.keys(tool)).toEqual(["id", "icon"]);
    expect(String(tool)).toBe("[Object GTouchTool]");
  });

  it("defines the appearance tool", () => {
    expect(TouchTool.APPEARANCE_TOUCH_TOOL).toMatchObject({
      id: "appearance",
      panel: ".appearance-property-panel",
      panelWidth: "380px",
      toolbar: ".appearance-toolbar",
    });
  });
});
