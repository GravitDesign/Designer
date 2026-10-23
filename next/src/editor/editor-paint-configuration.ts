// Old: chunk.vendor.js module 777 (GEditorPaintConfiguration).
import { registerClass } from "../engine/core/object.ts";
import { ScenePaintConfiguration } from "../engine/paint/scene-paint-configuration.ts";

/** How the editor view decorates pages: chessboard, margins and the page shadow. */
export interface PageDecoration {
  chessboard: boolean;
  margin: boolean;
  shadow: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBackground: string;
  background: string;
}

/**
 * The editor view's paint configuration: the scene's plus the page
 * decoration and which guides and labels show. The defaults live on the
 * prototype (the app changes the page shadow there at boot).
 */
export class EditorPaintConfiguration extends ScenePaintConfiguration {
  static {
    registerClass(this, "GEditorPaintConfiguration");
  }

  declare pageDecoration: PageDecoration;
  declare gridVisible: boolean;
  declare pageLabelsVisible: boolean;
  declare symbolLabelsVisible: boolean;
  declare guideLinesVisible: boolean;

  override toString(): string {
    return "[Object GEditorPaintConfiguration]";
  }
}

Object.assign(EditorPaintConfiguration.prototype, {
  pageDecoration: {
    chessboard: true,
    margin: true,
    shadow: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBackground: "rgba(0,0,0,0.5)",
    background: "white",
  },
  gridVisible: true,
  pageLabelsVisible: false,
  symbolLabelsVisible: true,
  guideLinesVisible: true,
});
