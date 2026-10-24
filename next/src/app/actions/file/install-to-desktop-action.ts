// Old: designer.browser.dev.js module 1172 (GInstallToDesktopAction) and module 1173 (the PWA support check).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PlatformType, WebBrowser } from "../../../engine/core/platform.ts";
import { Runtime } from "../../shell/container.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { gContainer, gDesigner } from "../host.ts";

/** The browser's install prompt event (beforeinstallprompt). */
export interface PwaInstallEvent {
  prompt?(): Promise<{ outcome: string }>;
}

/** What the designer keeps of the install prompt (GDesigner, module 1491). */
interface PwaDesigner {
  getPwaEvent?(): PwaInstallEvent | null;
  hasPwaEvent?(): boolean;
  closeInstallPwaDialog?(): void;
}

function pwaDesigner(): PwaDesigner {
  return gDesigner() as unknown as PwaDesigner;
}

/**
 * Whether this browser can install the app: the browser runtime, Chrome
 * or Edge, and the install prompt event exists. Module 1173 (the old
 * PWA support check) merged into this function.
 */
export function isPwaSupported(): boolean {
  return (
    gContainer().getRuntime() === Runtime.Browser &&
    (PlatformType.webBrowser === WebBrowser.Chrome ||
      PlatformType.webBrowser === WebBrowser.Edge) &&
    undefined !==
      (window as unknown as { BeforeInstallPromptEvent?: unknown }).BeforeInstallPromptEvent
  );
}

/** File > Install to Desktop: the browser's install prompt for the PWA. */
export class InstallToDesktopAction extends Action {
  static ID = "file.install-to-desktop";
  static TITLE = new LocaleKey("GInstallToDesktopAction", "title");
  static closedInstallPWADialogDatePropName = "pwa.closed-install-pwa-dialog-date";
  static installPWA3timesAWeekPropName = "pwa.show-install-dialog-3-times-a-week";

  /** Shows the prompt; once accepted, forgets the throttle keys and closes the dialog. */
  static install(): void {
    const designer = pwaDesigner();
    const event = designer.getPwaEvent ? designer.getPwaEvent() : null;
    if (event && event.prompt)
      void event.prompt().then(({ outcome }) => {
        if ("dismissed" === outcome) return;
        if ("accepted" === outcome) {
          gContainer().removeProperty(InstallToDesktopAction.installPWA3timesAWeekPropName);
          gContainer().removeProperty(InstallToDesktopAction.closedInstallPWADialogDatePropName);
          if (designer.closeInstallPwaDialog) designer.closeInstallPwaDialog();
        }
      });
  }

  override getId(): string {
    return InstallToDesktopAction.ID;
  }

  override getTitle(): LocaleKey {
    return InstallToDesktopAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "install";
  }

  override isAvailable(): boolean {
    return isPwaSupported() && !window.matchMedia("(display-mode: standalone)").matches;
  }

  override isVisible(): boolean {
    return !window.matchMedia("(display-mode: standalone)").matches;
  }

  override isEnabled(): boolean {
    const designer = pwaDesigner();
    return designer.hasPwaEvent ? designer.hasPwaEvent() : false;
  }

  override execute(): void {
    InstallToDesktopAction.install();
  }

  override toString(): string {
    return "[Object GInstallToDesktopAction]";
  }
}
