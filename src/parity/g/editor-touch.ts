import { GestureHelper } from "../../editor/touch/gesture-helper.ts";
import { LongPressEvent } from "../../editor/touch/long-press-event.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";

// The touch layer's classes with old names. The gestures and touch
// targets were unnamed app modules; GGestureHelper is the name its log
// messages used.
export const editorTouch = {
  GGestureHelper: GestureHelper,
  GLongPressEvent: LongPressEvent,
  GTouchTool: TouchTool,
};
