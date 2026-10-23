// Old: designer.browser.dev.js module 1617 (GPlayAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";
import type { Page } from "../../../engine/scene/page.ts";
import type { Scene } from "../../../engine/scene/scene.ts";
import { SceneWidget } from "../../../editor/view/scene-widget.ts";
import { Runtime } from "../../shell/container.ts";
import { lateExport } from "../../shell/late.ts";
import { runtime } from "../../shell/runtime.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gContainer } from "../host.ts";
import { viewDesigner, known } from "./view-host.ts";

/** GChangeActivePageAction (module 1341, actions/modify) as Play uses it. */
interface ChangeActivePage {
  getNextPage(scene: Scene): Page | null;
}

const CHANGE_ACTIVE_PAGE_ID = "view.change-active-page";
const PageStep = { Next: "next", Previous: "previous" } as const;
type PageStepType = (typeof PageStep)[keyof typeof PageStep];

/** GSystemDialog.custom (module 44) as Play uses it. */
interface CustomDialog {
  custom?(options: { title: string; openCallback(): void; closeCallback(): void }): unknown;
}

/**
 * The browser Fullscreen API where the old code used screenfull 3
 * (module 1618, dropped): the same calls without the vendor prefixes.
 */
const fullscreen = {
  get enabled(): boolean {
    return Boolean(document.fullscreenEnabled);
  },
  get isFullscreen(): boolean {
    return Boolean(document.fullscreenElement);
  },
  changeEvent: "fullscreenchange",
  /**
   * The promise is left unhandled on purpose: a refused request ends up in
   * the unhandledrejection listener, as screenfull's did.
   */
  request(element: HTMLElement): void {
    void element.requestFullscreen({});
  },
  exit(): void {
    void document.exitFullscreen();
  },
};

/**
 * View > Present (Ctrl+Alt+Enter): shows a copy of the document's active
 * page in a black overlay in browser fullscreen. Arrow keys, Page Up/Down
 * and Space go to the next or previous page; going past the last page
 * leaves fullscreen, which ends the presentation.
 *
 * The old Electron branch (fullscreen through the window, Esc to leave)
 * needed Electron's remote module; the rewrite's desktop build runs the
 * browser runtime, so only the browser branch is kept.
 */
export class PlayAction extends Action {
  static ID = "view.play";
  static TITLE = new LocaleKey("GPlayAction", "title");

  _scene: Scene | null = null;
  _isInPlayMode: boolean | null = null;
  _shouldExitFullScreen: boolean | null = null;
  _isErrorMessageDisplaying = false;
  _timeoutId: ReturnType<typeof setTimeout> | null = null;
  _isLoading = false;
  _widget: SceneWidget | null = null;
  _overlay: HTMLDivElement | null = null;
  private readonly _keyDownHandlerBind = (event: KeyboardEvent): void =>
    this._keyDownHandler(event);
  private readonly _fullScreenRequestDeniedHandlerBind = (event: PromiseRejectionEvent): void =>
    this._fullScreenRequestDeniedHandler(event);
  private readonly _browserFullScreenModeChangeHandlerBind = (): void =>
    this._browserFullScreenModeChangeHandler();

  override getId(): string {
    return PlayAction.ID;
  }

  override getTitle(): LocaleKey {
    return PlayAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, Key.Constant.ENTER];
  }

  override isEnabled(): boolean {
    return (
      !!viewDesigner().getActiveDocument() &&
      fullscreen.enabled &&
      !this._isErrorMessageDisplaying &&
      !this._isLoading
    );
  }

  override isVisible(): boolean {
    return !runtime.isExecutingOnMSTeamsSync();
  }

  override execute(): void {
    if (this._isInPlayMode) return this._exitPlayMode();
    this._scene = this._getScene();
    if (this._scene) {
      this._setIsLoading(true);
      this._widget = new SceneWidget(this._scene);
      this._widget.getViewConfiguration().paintMode = ScenePaintConfiguration.PaintMode.Output;
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "absolute",
        zIndex: "9999",
        left: "0px",
        right: "0px",
        top: "0px",
        bottom: "0px",
        background: "black",
      });
      this._overlay = overlay;
      overlay.appendChild(this._widget._htmlElement);
      document.body.appendChild(overlay);
      document.addEventListener("keydown", this._keyDownHandlerBind, true);
      window.addEventListener("unhandledrejection", this._fullScreenRequestDeniedHandlerBind);
      this._setShouldExitFullScreen(true);
      document.addEventListener(
        fullscreen.changeEvent,
        this._browserFullScreenModeChangeHandlerBind,
      );
      fullscreen.request(overlay);
    }
  }

  /** Activates the next or previous page of `scene`; past the last page leaves fullscreen. */
  changeActivePage(scene: Scene, type: PageStepType): void {
    const action = viewDesigner().getAction(
      "".concat(CHANGE_ACTIVE_PAGE_ID, ".").concat(type),
    ) as unknown as ChangeActivePage;
    const page = action.getNextPage(scene);
    if (page) scene.setActivePage(page);
    else if (type === PageStep.Next) fullscreen.exit();
  }

  _getScene(): Scene | null {
    viewDesigner().toggleLoading(true);
    try {
      return this._cloneActiveScene();
    } catch {
      return null;
    } finally {
      viewDesigner().toggleLoading(false);
    }
  }

  _cloneActiveScene(): Scene | null {
    const document = viewDesigner().getActiveDocument();
    const scene = document && document.getScene();
    return scene ? (scene.clone(undefined, scene.getWorkspace()) as Scene) : null;
  }

  _keyDownHandler(event: KeyboardEvent): void {
    let handled = true;
    const scene = this._scene as Scene;
    switch (Key.translateCode(event.code)) {
      case Key.Constant.DOWN:
      case Key.Constant.PAGE_DOWN:
      case Key.Constant.RIGHT:
      case Key.Constant.SPACE:
        this.changeActivePage(scene, PageStep.Next);
        break;
      case Key.Constant.UP:
      case Key.Constant.PAGE_UP:
      case Key.Constant.LEFT:
        this.changeActivePage(scene, PageStep.Previous);
        break;
      case Key.Constant.ESC:
        if (gContainer().getRuntime() === Runtime.Electron) this._exitPlayMode();
        break;
      default:
        handled = false;
    }
    if (handled) event.stopPropagation();
  }

  _fullScreenRequestDeniedHandler(event: PromiseRejectionEvent): void {
    const reason = event.reason as { message?: string } | null;
    if ("Fullscreen request denied" === (reason && reason.message)) {
      this._exitPlayMode();
      const dialog = lateExport<CustomDialog>("dialogs/system-dialog.ts", "SystemDialog");
      const title = Locale.getValue("GCommonNames", "text.something-wrong.try-again") as string;
      if (dialog && dialog.custom)
        dialog.custom({
          title,
          openCallback: () => this._setIsErrorMessageDisplaying(true),
          closeCallback: () => this._setIsErrorMessageDisplaying(false),
        });
      else console.error("[system dialog]", title);
    }
  }

  _enterPlayMode(): void {
    this._setIsInPlayMode(true);
    const overlay = this._overlay as HTMLDivElement;
    const widget = this._widget as SceneWidget;
    widget.resize(overlay.offsetWidth, overlay.offsetHeight);
    const box = known((this._scene as Scene).getActivePage()).getPaintBBox();
    widget.zoomAll(known(box), false);
    const appRuntime = gContainer().getRuntime();
    if (appRuntime === Runtime.Browser || appRuntime === Runtime.PWA) {
      // Safari has no Esc hint of its own.
      if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
        overlay.appendChild(this._createExitFullScreenHint());
    }
    this._setIsLoading(false);
  }

  /** The "Press Esc to exit full screen" hint, removed when its animation ends. */
  _createExitFullScreenHint(): HTMLDivElement {
    const hint = document.createElement("div");
    hint.className = "g-exit-full-screen";
    hint.addEventListener("webkitAnimationEnd", (event) => {
      const target = event.target as HTMLElement;
      const closest = target.closest(".g-exit-full-screen");
      if (closest) closest.remove();
    });
    const text = document.createElement("div");
    const key = document.createElement("span");
    key.className = "highlight";
    key.textContent = Locale.getValue("GPlayAction", "text.esc") as string;
    // The string table holds markup-free text with a %key placeholder (old .html() call).
    text.innerHTML = (Locale.getValue("GPlayAction", "text.exit-full-screen") as string).replace(
      "%key",
      () => key.outerHTML,
    );
    hint.appendChild(text);
    return hint;
  }

  _exitPlayMode(): void {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    if (this._shouldExitFullScreen) this._exitFullScreen();
    (this._overlay as HTMLDivElement).remove();
    (this._widget as SceneWidget).release();
    document.removeEventListener("keydown", this._keyDownHandlerBind, true);
    document.removeEventListener(
      fullscreen.changeEvent,
      this._browserFullScreenModeChangeHandlerBind,
    );
    window.removeEventListener("unhandledrejection", this._fullScreenRequestDeniedHandlerBind);
    this._setIsInPlayMode(false);
    this._setIsLoading(false);
  }

  _browserFullScreenModeChangeHandler(): void {
    if (fullscreen.isFullscreen) this._enterPlayMode();
    else this._exitPlayMode();
  }

  _exitFullScreen(): void {
    fullscreen.exit();
  }

  _setIsInPlayMode(value: boolean): void {
    this._isInPlayMode = value;
  }

  _setIsLoading(value: boolean): void {
    this._isLoading = value;
  }

  _setShouldExitFullScreen(value: boolean): void {
    this._shouldExitFullScreen = value;
  }

  _setIsErrorMessageDisplaying(value: boolean): void {
    this._isErrorMessageDisplaying = value;
  }

  override toString(): string {
    return "[Object GPlayAction]";
  }
}
