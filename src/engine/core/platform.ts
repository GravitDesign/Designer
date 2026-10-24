// Old: chunk.vendor.js module 64 (GPlatform).
/**
 * The browser the app runs in: web browser detection, canvas and image
 * size limits per browser, animation frames and the global modifier key
 * state. Tools, guides and the views read `Platform.modifiers`; it is
 * updated from capturing keydown/keyup/mouse listeners on the document and
 * announced with ModifiersChangedEvent.
 *
 * The old module exported a single instance, and the app reads the
 * enums through it (`GPlatform.constructor.WebBrowser`); `Platform` is that
 * instance and `PlatformType` its class.
 */
import { EventTargetMixin } from "./event-target.ts";
import { Key } from "./key.ts";
import { ModifiersChangedEvent } from "./modifiers-changed-event.ts";
import { Modifiers } from "./modifiers.ts";
import { MouseEvent } from "./mouse-event.ts";
import { GObject, registerClass } from "./object.ts";
import { Hardware, OperatingSystem, System } from "./system.ts";

export const WebBrowser = {
  Unknown: 0,
  Edge: 1,
  Opera: 2,
  Chrome: 3,
  Firefox: 4,
  Safari: 5,
  MSIE: 6,
  Edge_OLD: 7,
} as const;
export type WebBrowser = (typeof WebBrowser)[keyof typeof WebBrowser];

/** The browser from the user agent, in the old order of checks. */
export function detectWebBrowser(userAgent?: string | null): WebBrowser {
  const ua =
    userAgent !== undefined
      ? userAgent
      : typeof navigator !== "undefined"
        ? navigator.userAgent
        : null;
  if (!ua) return WebBrowser.Unknown;
  if (ua.match(/Edge/i)) return WebBrowser.Edge_OLD;
  if (ua.match(/Edg/i)) return WebBrowser.Edge;
  if (ua.match(/OPR/i)) return WebBrowser.Opera;
  if (ua.match(/Firefox/i)) return WebBrowser.Firefox;
  if (ua.match(/Chrome/i) || ua.match(/CriOS/i)) return WebBrowser.Chrome;
  if (ua.match(/Safari/i)) return WebBrowser.Safari;
  if (ua.match(/Trident/i) || ua.match(/MSIE/)) return WebBrowser.MSIE;
  return WebBrowser.Unknown;
}

function computeMaxImgLinearDimension(browser: WebBrowser): number {
  let value = 4096;
  if (System.hardware === Hardware.Desktop) {
    if (System.operatingSystem === OperatingSystem.Unix) value = 65536;
    else if (
      browser === WebBrowser.Chrome ||
      browser === WebBrowser.Firefox ||
      browser === WebBrowser.Edge
    )
      value = 32768;
    else if (browser === WebBrowser.Edge_OLD) value = 16384;
    else if (browser === WebBrowser.MSIE || browser === WebBrowser.Opera) value = 8192;
    else if (browser === WebBrowser.Safari) value = 4194304;
  } else if (browser === WebBrowser.Chrome || browser === WebBrowser.Firefox) value = 32768;
  else if (browser === WebBrowser.Safari) value = 4194304;
  value -= 1;
  return value;
}

function computeMaxImgAreaDots(browser: WebBrowser): number {
  let value = 16777216;
  if (System.hardware === Hardware.Desktop) {
    if (System.operatingSystem === OperatingSystem.Unix) value = 4294967296;
    else if (
      browser === WebBrowser.Chrome ||
      browser === WebBrowser.Edge ||
      browser === WebBrowser.Safari
    )
      value = 268435456;
    else if (browser === WebBrowser.Firefox) value = 124992400;
    else if (browser === WebBrowser.MSIE || browser === WebBrowser.Opera) value = 67108864;
  } else if (browser === WebBrowser.Chrome) value = 117418896;
  value -= 1;
  return value;
}

function computeMaxPngDataSize(browser: WebBrowser, absoluteMaxImgAreaDots: number): number {
  let value = 4294967296;
  if (browser === WebBrowser.Chrome || browser === WebBrowser.Edge) {
    // Quirk kept: the old code compared the operating system with
    // Hardware.Unix, which doesn't exist, so the first test is always true.
    value =
      (System.operatingSystem as number) !== (Hardware as Record<string, number>)["Unix"] &&
      System.hardware === Hardware.Desktop
        ? 2147483648
        : Math.floor(429496729.6);
  } else if (browser === WebBrowser.Firefox) value = absoluteMaxImgAreaDots;
  else if (browser === WebBrowser.Edge_OLD || browser === WebBrowser.Opera) value = 10485760;
  else if (browser === WebBrowser.MSIE) value = 629145600;
  value -= 1;
  const limit = 3 * absoluteMaxImgAreaDots;
  return Math.min(limit, value);
}

function computeMaxImgDataUrlLength(maxPngDataSize: number): number {
  return Math.min(4294967295, Math.floor((maxPngDataSize / 3) * 4) + 22);
}

/** The subset of DOM keyboard and mouse events `_updateModifiers` reads. */
export interface ModifierSourceEvent {
  type: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  keyCode?: number;
  location?: number;
  button?: number;
}

export class PlatformType extends EventTargetMixin(GObject) {
  static {
    registerClass(this, "GPlatform");
  }

  static readonly WebBrowser = WebBrowser;

  static _allowedClassNames: string[] | null = null;

  /** Lets keydown in elements with this class update the modifiers. */
  static bypassKeyDownRestrictionByClassName(className: string): void {
    if (!PlatformType._allowedClassNames) PlatformType._allowedClassNames = [];
    PlatformType._allowedClassNames.push(className);
  }

  static webBrowser: WebBrowser = detectWebBrowser();
  static absoluteMaxImgLinearDimension = computeMaxImgLinearDimension(PlatformType.webBrowser);
  static absoluteMaxImgAreaDots = computeMaxImgAreaDots(PlatformType.webBrowser);
  static maxPngDataSize = computeMaxPngDataSize(
    PlatformType.webBrowser,
    PlatformType.absoluteMaxImgAreaDots,
  );
  static maxImgDataUrlLength = computeMaxImgDataUrlLength(PlatformType.maxPngDataSize);
  static isTouchDevice =
    (typeof window !== "undefined" && "ontouchstart" in window) ||
    (typeof navigator !== "undefined" &&
      // The old code read the misspelled MaxTouchPoints, which is always
      // undefined, so only msMaxTouchPoints could count.
      (((navigator as unknown as Record<string, number | undefined>)["MaxTouchPoints"] ?? 0) > 0 ||
        ((navigator as unknown as Record<string, number | undefined>)["msMaxTouchPoints"] ?? 0) >
          0));

  webBrowser: WebBrowser = WebBrowser.Unknown;
  absoluteMaxImgLinearDimension = 0;
  maxImgLinearDimension = 0;
  absoluteMaxImgAreaDots = 0;
  maxImgAreaDots = 0;
  maxPngDataSize = 0;
  maxImgDataUrlLength = 0;
  readonly modifiers = new Modifiers();

  private readonly _modifiersChangedEventCache = new ModifiersChangedEvent();
  private _lastKeyEventTime = 0;
  private _hadMetaBefore = false;
  private _blockCtrl = false;
  private _altKey = false;
  private _ctrlKey = false;
  private _shiftKey = false;

  constructor() {
    super();
    if (typeof document !== "undefined") {
      document.addEventListener(
        "keydown",
        (event) => {
          if (document.activeElement && isTextInput(document.activeElement)) return;
          this._updateModifiers(event);
        },
        true,
      );
      for (const type of ["keyup", "mousemove", "mousedown", "mouseup"] as const) {
        document.addEventListener(type, (event) => this._updateModifiers(event), true);
      }
    }
    this._updateProperties();
  }

  getWebBrowser(): WebBrowser {
    return detectWebBrowser();
  }

  scheduleFrame(callback: FrameRequestCallback): number | null {
    return typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame(callback)
      : null;
  }

  cancelFrame(handle: number): void {
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(handle);
    }
  }

  /** Marks a modifier key as held, for touch toolbars that emulate keys. */
  holdKey(key: unknown): void {
    switch (key) {
      case Key.Constant.ALT_LEFT:
      case Key.Constant.ALT_RIGHT:
        this._altKey = true;
        break;
      case Key.Constant.CONTROL:
        this._ctrlKey = true;
        break;
      case Key.Constant.SHIFT:
        this._shiftKey = true;
    }
  }

  releaseKey(key: unknown): void {
    switch (key) {
      case Key.Constant.ALT_LEFT:
      case Key.Constant.ALT_RIGHT:
        this._altKey = false;
        break;
      case Key.Constant.CONTROL:
        this._ctrlKey = false;
        break;
      case Key.Constant.SHIFT:
        this._shiftKey = false;
    }
  }

  isHoldingKey(key: unknown): boolean {
    switch (key) {
      case Key.Constant.ALT_LEFT:
      case Key.Constant.ALT_RIGHT:
        return this._altKey;
      case Key.Constant.CONTROL:
        return this._ctrlKey;
      case Key.Constant.SHIFT:
        return this._shiftKey;
      default:
        return false;
    }
  }

  /** Sets the browser (tests, embedding) and recomputes the limits. */
  setWebBrowser(browser: WebBrowser): void {
    PlatformType.webBrowser = browser;
    PlatformType.absoluteMaxImgLinearDimension = computeMaxImgLinearDimension(browser);
    PlatformType.absoluteMaxImgAreaDots = computeMaxImgAreaDots(browser);
    PlatformType.maxPngDataSize = computeMaxPngDataSize(
      browser,
      PlatformType.absoluteMaxImgAreaDots,
    );
    PlatformType.maxImgDataUrlLength = computeMaxImgDataUrlLength(PlatformType.maxPngDataSize);
    this._updateProperties();
  }

  private _updateProperties(): void {
    this.webBrowser = PlatformType.webBrowser;
    this.absoluteMaxImgLinearDimension = PlatformType.absoluteMaxImgLinearDimension;
    this.maxImgLinearDimension = PlatformType.absoluteMaxImgLinearDimension >>> 1;
    this.absoluteMaxImgAreaDots = PlatformType.absoluteMaxImgAreaDots;
    this.maxImgAreaDots = PlatformType.absoluteMaxImgAreaDots >>> 2;
    this.maxPngDataSize = PlatformType.maxPngDataSize;
    this.maxImgDataUrlLength = PlatformType.maxImgDataUrlLength;
  }

  /**
   * Updates `modifiers` from a DOM key or mouse event and triggers
   * ModifiersChangedEvent when something changed. Public so tests and the
   * touch UI can feed events.
   */
  _updateModifiers(event: ModifierSourceEvent): void {
    let optionChanged = false;
    let shiftChanged = false;
    let metaChanged = false;
    let ctrlChanged = false;
    let spaceChanged = false;
    let escapeChanged = false;
    let tabChanged = false;
    let plusChanged = false;
    let minusChanged = false;
    let zChanged = false;
    let middleChanged = false;
    const modifiers = this.modifiers;
    let meta =
      System.operatingSystem !== OperatingSystem.OSX_IOS || System.hardware !== Hardware.Desktop
        ? event.ctrlKey || this._ctrlKey
        : event.metaKey;

    if (System.operatingSystem === OperatingSystem.Windows) {
      // AltGr on Windows arrives as Ctrl+Alt; a right Alt keydown within
      // 50 ms of a Ctrl keydown blocks Ctrl until Alt is released.
      if ("keydown" === event.type && event.ctrlKey) {
        if (event.altKey && 2 === event.location) {
          if (new Date().getTime() - this._lastKeyEventTime < 50 && !this._hadMetaBefore) {
            this._blockCtrl = true;
          }
          this._hadMetaBefore = false;
          this._lastKeyEventTime = 0;
        } else {
          this._lastKeyEventTime = new Date().getTime();
          this._hadMetaBefore = !!modifiers.metaKey;
        }
      } else if (this._blockCtrl && !event.altKey) {
        this._blockCtrl = false;
      }
    }
    if (this._blockCtrl) {
      meta = false;
      // Quirk kept: the old code cleared the ctrl "changed" flag here,
      // before it was computed below, so this had no effect.
      ctrlChanged = false;
    }
    if (meta !== modifiers.metaKey) {
      metaChanged = true;
      modifiers.metaKey = meta as boolean;
    }
    if ((event.ctrlKey || this._ctrlKey) !== modifiers.ctrlKey) {
      ctrlChanged = true;
      modifiers.ctrlKey = (event.ctrlKey || this._ctrlKey) as boolean;
    }
    if ((event.altKey || this._altKey) !== modifiers.optionKey) {
      optionChanged = true;
      modifiers.optionKey = (event.altKey || this._altKey) as boolean;
    }
    if ((event.shiftKey || this._shiftKey) !== modifiers.shiftKey) {
      shiftChanged = true;
      modifiers.shiftKey = (event.shiftKey || this._shiftKey) as boolean;
    }
    const space =
      ("keydown" === event.type && 32 === event.keyCode) ||
      (("keyup" !== event.type || 32 !== event.keyCode) && modifiers.spaceKey);
    if (space !== modifiers.spaceKey) {
      spaceChanged = true;
      modifiers.spaceKey = space;
    }
    const tab =
      ("keydown" === event.type && 9 === event.keyCode) ||
      (("keyup" !== event.type || 9 !== event.keyCode) && modifiers.tabKey);
    if (tab !== modifiers.tabKey) {
      tabChanged = true;
      modifiers.tabKey = tab;
    }
    if (27 === event.keyCode) {
      if ("keydown" === event.type) {
        escapeChanged = true;
        modifiers.escapeKey = true;
      } else if ("keyup" === event.type) {
        escapeChanged = true;
        modifiers.escapeKey = false;
      }
    }
    if (!(System.operatingSystem === OperatingSystem.OSX_IOS && event.metaKey)) {
      if (90 === event.keyCode) {
        if ("keydown" === event.type) {
          zChanged = true;
          modifiers.zKey = true;
        } else if ("keyup" === event.type) {
          // Quirk kept: a z release doesn't count as a change.
          zChanged = false;
          modifiers.zKey = false;
        }
      }
      if (107 === event.keyCode || 187 === event.keyCode) {
        if ("keydown" === event.type) {
          plusChanged = true;
          modifiers.plusKey = true;
        } else if ("keyup" === event.type) {
          plusChanged = true;
          modifiers.plusKey = false;
        }
      }
      if (109 === event.keyCode || 189 === event.keyCode) {
        if ("keydown" === event.type) {
          minusChanged = true;
          modifiers.minusKey = true;
        } else if ("keyup" === event.type) {
          minusChanged = true;
          modifiers.minusKey = false;
        }
      }
    }
    if (
      "mouseup" === event.type &&
      event.button === MouseEvent.BUTTON_MIDDLE &&
      modifiers.middleButton
    ) {
      middleChanged = true;
      modifiers.middleButton = false;
    } else if (
      "mousedown" === event.type &&
      event.button === MouseEvent.BUTTON_MIDDLE &&
      !modifiers.middleButton
    ) {
      middleChanged = true;
      modifiers.middleButton = true;
    }
    if (
      (metaChanged ||
        ctrlChanged ||
        optionChanged ||
        shiftChanged ||
        spaceChanged ||
        escapeChanged ||
        tabChanged ||
        plusChanged ||
        minusChanged ||
        zChanged ||
        middleChanged) &&
      this.hasEventListeners(ModifiersChangedEvent)
    ) {
      const cache = this._modifiersChangedEventCache;
      cache.changed.metaKey = metaChanged;
      cache.changed.ctrlKey = ctrlChanged;
      cache.changed.optionKey = optionChanged;
      cache.changed.shiftKey = shiftChanged;
      cache.changed.spaceKey = spaceChanged;
      cache.changed.escapeKey = escapeChanged;
      cache.changed.tabKey = tabChanged;
      cache.changed.plusKey = plusChanged;
      cache.changed.minusKey = minusChanged;
      cache.changed.zKey = zChanged;
      cache.changed.middleButton = middleChanged;
      cache.isImmediatePropagationStopped = false;
      this.trigger(cache);
    }
  }
}

/** Keydown in text fields doesn't change the modifiers (old rule). */
function isTextInput(element: Element): boolean {
  const name = element.nodeName.toLowerCase();
  const allowed = PlatformType._allowedClassNames;
  if (allowed && element.className && allowed.some((c) => element.classList.contains(c))) {
    return false;
  }
  return (
    "input" === name ||
    ("textarea" === name && "gravit-ime-textarea-608209" !== element.className) ||
    "button" === name ||
    "select" === name
  );
}

if (typeof window !== "undefined" && !window.requestAnimationFrame) {
  // The old module installed a setTimeout fallback for browsers without
  // requestAnimationFrame; every supported browser has it, so this is only
  // the last-resort timer version.
  let lastTime = 0;
  window.requestAnimationFrame = (callback) => {
    const now = new Date().getTime();
    const wait = Math.max(0, 16 - (now - lastTime));
    const handle = window.setTimeout(() => callback(now + wait), wait);
    lastTime = now + wait;
    return handle;
  };
  window.cancelAnimationFrame = (handle) => clearTimeout(handle);
}

/** The old GPlatform singleton. */
export const Platform = new PlatformType();
