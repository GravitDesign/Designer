// Old: chunk.vendor.js module 1080 (GActionManager).
import { MouseEvent } from "../engine/core/mouse-event.ts";
import { ActionableMixin } from "../engine/scene/annotations/actionable.ts";
import type { Scene } from "../engine/scene/scene.ts";
import { EditorOptions } from "./editor-options.ts";

/** What the action manager uses of the editor view (GEditorWidget). */
export interface ActionManagerView {
  addEventListener(
    eventClass: unknown,
    listener: (event: MouseEvent) => void,
    target?: object,
  ): void;
  removeEventListener(eventClass: unknown, listener: unknown, target?: object): unknown;
  getScene(): Scene;
  getWorldTransform(scene: Scene): unknown;
  getViewConfiguration(): { multiPageView?: unknown };
  getEditor(): unknown;
}

interface ActionHit {
  element?: unknown;
  data?: { action?: { execute(element: unknown, editor: unknown, view: unknown): void } };
}

/** Runs the action of an actionable element (an annotation link) clicked in the view. */
export class ActionManager {
  _view: ActionManagerView | null = null;

  setView(view: ActionManagerView | null): void {
    if (this._view !== view) {
      if (this._view) this._view.removeEventListener(MouseEvent.Click, this._mouseClick, this);
      this._view = view;
      if (this._view) this._view.addEventListener(MouseEvent.Click, this._mouseClick, this);
    }
  }

  _mouseClick(event: MouseEvent): void {
    const view = this._view as ActionManagerView;
    const scene = view.getScene();
    const hits = (
      scene as unknown as {
        hitTest(...args: unknown[]): ActionHit[] | null;
      }
    ).hitTest(
      event.client,
      view.getWorldTransform(scene),
      (node: { hasMixin(mixin: unknown): boolean }) => node.hasMixin(ActionableMixin),
      false,
      -1,
      EditorOptions.pickDistance,
      false,
      null,
      false,
      false,
      view.getViewConfiguration().multiPageView,
      false,
    );
    const hit = hits && hits[0];
    if (hit && hit.element && hit.data && hit.data.action) {
      hit.data.action.execute(hit.element, view.getEditor(), view);
    }
  }
}
