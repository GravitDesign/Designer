// Old: designer.browser.dev.js module 1588 (the fullscreen banner).
/**
 * The banner that says how to leave View > Fullscreen. It fades in when
 * shown, fades out after five seconds (or when hidden) and is removed from
 * body once faded out.
 *
 * Plain DOM like the old one: a single `div.g-fullscreen-banner` shared by
 * every banner object (it sat on the prototype), with the opacity written
 * inline by the fade, as jQuery's animate did. The fades run one after the
 * other, like jQuery's effects queue.
 */
import { css } from "../shell/dom.ts";

const FADE_DURATION = 500;
const HIDE_AFTER = 5000;

let sharedElement: HTMLElement | null = null;

function bannerElement(): HTMLElement {
  if (!sharedElement) {
    sharedElement = document.createElement("div");
    sharedElement.className = "g-fullscreen-banner";
  }
  return sharedElement;
}

/** jQuery's default easing. */
function swing(p: number): number {
  return 0.5 - Math.cos(p * Math.PI) / 2;
}

interface Fade {
  to: number;
  complete?: () => void;
}

/** The fades still to run on the shared element (jQuery's "fx" queue). */
const queue: Fade[] = [];
let running = false;

function runNext(element: HTMLElement): void {
  const fade = queue.shift();
  if (!fade) {
    running = false;
    return;
  }
  running = true;
  const from = parseFloat(getComputedStyle(element).opacity) || 0;
  // jQuery timed its effects with Date.now as well.
  const start = Date.now();
  const step = (): void => {
    const now = Date.now();
    const p = Math.min(1, (now - start) / FADE_DURATION);
    css(element, "opacity", String(p < 1 ? from + (fade.to - from) * swing(p) : fade.to));
    if (p < 1) requestAnimationFrame(step);
    else {
      if (fade.complete) fade.complete();
      runNext(element);
    }
  };
  requestAnimationFrame(step);
}

function animateOpacity(element: HTMLElement, to: number, complete?: () => void): void {
  queue.push({ to, complete });
  if (!running) runNext(element);
}

export class FullscreenBanner {
  private _timer: ReturnType<typeof setTimeout> | 0 = 0;
  readonly _element: HTMLElement = bannerElement();

  /** The banner's markup (a string table entry with a <b> for the shortcut). */
  setBannerText(html: string): this {
    // Old: this._element.html(text); the text comes from the string table.
    this._element.innerHTML = html;
    return this;
  }

  show(): this {
    document.body.appendChild(this._element);
    animateOpacity(this._element, 1);
    this._timer = setTimeout(() => {
      this.hide();
    }, HIDE_AFTER);
    return this;
  }

  hide(): this {
    animateOpacity(this._element, 0, () => {
      this._element.remove();
    });
    clearTimeout(this._timer);
    return this;
  }
}
