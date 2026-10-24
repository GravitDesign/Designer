// Old: designer.browser.dev.js module 1589 (the quick help screen).
/**
 * Help > Quick Help in the touch layout: a full-screen layer
 * (`.g-quick-help-screen`, body gets `g-quick-help`) with three gesture
 * hints and a tooltip next to each toolbar, touch toolbar and assistant
 * bar button that is visible. A click anywhere closes it; a window resize
 * places the tooltips again. While it is open the right sidebars don't
 * switch their touch tools with the selection.
 *
 * Plain DOM: every tooltip is measured right after it is added and then
 * placed next to the element it explains, as the old code did.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import { css, outerHeight, outerWidth } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { offset } from "../widgets/dom-helpers.ts";

/** One explained button: where it is and how its tooltip sits. */
export interface QuickHelpTip {
  selector?: string;
  i18n: string;
  /** Which side of the element the tooltip goes (bottom centre by default). */
  side?: RectSide;
  offsetX?: number;
  offsetY?: number;
  /** A longer connector, so neighbouring tooltips don't overlap. */
  furtherAway?: boolean;
  /** No connector line. */
  disconnected?: boolean;
  className?: string;
}

const Side = Rect.Side;

export const QUICK_HELP_TIPS: readonly QuickHelpTip[] = [
  { selector: "#toolbar > .section > .menubar-toolbar-button", i18n: "text.menu", offsetX: 10 },
  {
    selector: "#toolbar > .section > .open-toolbar-button > .action-button",
    i18n: "text.open",
    furtherAway: true,
  },
  { selector: "#toolbar > .section > .save-toolbar-button > .action-button", i18n: "text.save" },
  {
    selector: "#toolbar > .section > .undo-toolbar-button > .action-button",
    i18n: "text.undo-redo",
    furtherAway: true,
  },
  {
    selector: "#toolbar > .section > .zoom-button > .action-button > .caption",
    i18n: "text.zoom",
    offsetY: 14,
  },
  {
    selector: "#toolbar > .section > .snap-button > .action-button",
    i18n: "text.snapping",
    furtherAway: true,
  },
  {
    selector: "#toolbar > .section > .select-toolbar-button > .action-button",
    i18n: "text.select",
  },
  {
    selector: "#toolbar > .section > .shapes-toolbar-button > .action-button",
    i18n: "text.shapes",
    furtherAway: true,
  },
  { selector: "#toolbar > .section > .path-toolbar-button > .action-button", i18n: "text.path" },
  {
    selector: "#toolbar > .section > .knife-toolbar-button > .action-button",
    i18n: "text.knife",
    furtherAway: true,
  },
  { selector: "#toolbar > .section > .text-toolbar-button > .action-button", i18n: "text.text" },
  {
    selector: "#toolbar > .section > .image-toolbar-button > .action-button",
    i18n: "text.image",
    furtherAway: true,
  },
  { selector: "#toolbar > .section > .window-button  > .action-button", i18n: "text.files" },
  {
    selector: "#toolbar > .section > .export-toolbar-button > .action-button",
    i18n: "text.export",
  },
  { selector: '.g-touch-toolbar-button[g-touch-tool="pages"]', i18n: "text.pages" },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="layers"]',
    i18n: "text.layers",
    furtherAway: true,
  },
  { selector: '.g-touch-toolbar-button[g-touch-tool="libraries"]', i18n: "text.libraries" },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="symbols"]',
    i18n: "text.symbols",
    furtherAway: true,
  },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="dimension.align"]',
    i18n: "text.align-distribute",
    className: "align-distribute",
  },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="dimension.dimension"]',
    i18n: "text.transform",
    furtherAway: true,
  },
  { selector: '.g-touch-toolbar-button[g-touch-tool="document"]', i18n: "text.document" },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="appearance"]',
    i18n: "text.appearance",
    furtherAway: true,
  },
  { selector: '.g-touch-toolbar-button[g-touch-tool="fill"]', i18n: "text.fills" },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="border"]',
    i18n: "text.borders",
    furtherAway: true,
  },
  { selector: '.g-touch-toolbar-button[g-touch-tool="effect"]', i18n: "text.effects" },
  {
    selector: '.g-touch-toolbar-button[g-touch-tool="annotation"]',
    i18n: "text.comments",
    furtherAway: true,
  },
  {
    selector: "#assistant-bar > .container",
    side: Side.LEFT_CENTER,
    i18n: "text.modifier-keys",
    disconnected: true,
    offsetX: -15,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar > .container",
    side: Side.RIGHT_CENTER,
    i18n: "text.nudge",
    disconnected: true,
    offsetX: 15,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-copy",
    side: Side.TOP_CENTER,
    i18n: "text.copy",
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-paste",
    side: Side.TOP_CENTER,
    i18n: "text.paste",
    furtherAway: true,
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-trash-2",
    side: Side.TOP_CENTER,
    i18n: "text.delete",
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-selection",
    side: Side.TOP_CENTER,
    i18n: "text.select-deselect",
    furtherAway: true,
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-arrange-order",
    side: Side.TOP_CENTER,
    i18n: "text.arrange",
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-fullscreen",
    side: Side.TOP_CENTER,
    i18n: "text.fullscreen",
    furtherAway: true,
    offsetY: -10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-group",
    i18n: "text.group",
    offsetY: 10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-ungroup",
    i18n: "text.ungroup",
    furtherAway: true,
    offsetY: 10,
    className: "assistant-bar",
  },
  {
    selector: "#assistant-bar .gravit-icon-touch-convert-to-path",
    i18n: "text.convert-to-path",
    offsetY: 10,
    className: "assistant-bar",
  },
];

/** The gesture hints at the top: image and text. */
const STATIC_TIPS = [
  { image: "assets/help/pinch-to-zoom.svg", i18n: "text.pinch-to-zoom" },
  { image: "assets/help/drag-with-2-fingers.svg", i18n: "text.drag-with-2-fingers" },
  { image: "assets/help/tap-and-holder.svg", i18n: "text.tap-and-hold" },
];

/**
 * Where a tooltip of `size` goes next to `target` (both page rectangles;
 * the size at 0, 0): centred on the given side, shifted by the offsets.
 */
export function calculatePosition(size: Rect, target: Rect, tip: QuickHelpTip): Point {
  const side = tip.side || Side.BOTTOM_CENTER;
  const anchor = target.getSide(side);
  switch (side) {
    case Side.TOP_CENTER: {
      const center = size.getSide(Side.CENTER).getX();
      return new Point(
        anchor.getX() - center + (tip.offsetX || 0),
        anchor.getY() - size.getHeight() + (tip.offsetY || 0),
      );
    }
    case Side.BOTTOM_CENTER: {
      const center = size.getSide(Side.CENTER).getX();
      return new Point(
        anchor.getX() - center + (tip.offsetX || 0),
        anchor.getY() + (tip.offsetY || 0),
      );
    }
    case Side.LEFT_CENTER: {
      const center = size.getSide(Side.CENTER).getY();
      return new Point(
        anchor.getX() - size.getWidth() + (tip.offsetX || 0),
        anchor.getY() - center + (tip.offsetY || 0),
      );
    }
    case Side.RIGHT_CENTER: {
      const center = size.getSide(Side.CENTER).getY();
      return new Point(
        anchor.getX() + (tip.offsetX || 0),
        anchor.getY() - center + (tip.offsetY || 0),
      );
    }
    default:
      throw "Unsupported side";
  }
}

/** jQuery's `:visible`: the element has a layout box. */
function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

export class QuickHelp {
  _panel: HTMLElement | undefined;
  private readonly _resizeBound = (): void => this._resize();

  open(): void {
    if (this._panel) this._panel.remove();
    const body = document.body;
    body.classList.add("g-quick-help");
    const panel = document.createElement("div");
    panel.classList.add("g-quick-help-screen");
    panel.classList.add(Locale.getLocaleTagISO6391());
    panel.classList.add("hidden");
    panel.addEventListener("click", () => this.close());
    body.appendChild(panel);
    this._panel = panel;
    designer().getRightSidebars().disableContextSensitive();
    this._update();
    panel.classList.remove("hidden");
    window.addEventListener("resize", this._resizeBound);
  }

  close(): void {
    document.body.classList.remove("g-quick-help");
    if (this._panel) this._panel.remove();
    delete this._panel;
    designer().getRightSidebars().enableContextSensitive();
    window.removeEventListener("resize", this._resizeBound);
  }

  isOpen(): boolean {
    return !!this._panel;
  }

  _resize(): void {
    if (this._panel) {
      this._panel.replaceChildren();
      this._update();
    }
  }

  _update(): void {
    this._createStaticTooltips();
    for (const tip of QUICK_HELP_TIPS) this._createDynamicTooltip(tip);
  }

  _createStaticTooltips(): void {
    const tips = document.createElement("div");
    tips.className = "static-tooltips";
    for (const { image, i18n } of STATIC_TIPS) {
      const box = document.createElement("div");
      box.className = "container";
      const img = document.createElement("img");
      img.setAttribute("src", image);
      box.appendChild(img);
      box.appendChild(this._createTooltip({ disconnected: true, i18n }));
      tips.appendChild(box);
    }
    (this._panel as HTMLElement).appendChild(tips);
  }

  _createDynamicTooltip(tip: QuickHelpTip): void {
    // Old: $(selector).offset() and .is(":visible") read the first match.
    const target = document.querySelector<HTMLElement>(tip.selector as string);
    if (!target || !isVisible(target)) return;
    const position = offset(target);
    const tooltip = this._createTooltip(tip);
    (this._panel as HTMLElement).appendChild(tooltip);
    const targetRect = new Rect(
      position.left,
      position.top,
      outerWidth(target),
      outerHeight(target),
    );
    const size = new Rect(0, 0, outerWidth(tooltip), outerHeight(tooltip));
    const placed = this._calculatePosition(size, targetRect, tip);
    // Old: .css({ top, left }) with numbers, which jQuery wrote as px.
    css(tooltip, "top", placed.getY() + "px");
    css(tooltip, "left", placed.getX() + "px");
  }

  _calculatePosition(size: Rect, target: Rect, tip: QuickHelpTip): Point {
    return calculatePosition(size, target, tip);
  }

  _createTooltip(tip: QuickHelpTip): HTMLElement {
    const content = document.createElement("div");
    content.className = "content";
    const text = document.createElement("span");
    text.textContent = Locale.get(new LocaleKey("GQuickHelpScreen", tip.i18n)) as string;
    content.appendChild(text);
    const tooltip = document.createElement("div");
    for (const name of ("tooltip" + (tip.className ? " " + tip.className : "")).split(" "))
      tooltip.classList.add(name);
    tooltip.classList.add("side-" + (tip.side || Side.BOTTOM_CENTER));
    tooltip.classList.toggle("further-away", !!tip.furtherAway);
    const box = document.createElement("div");
    box.className = "container";
    const connector = document.createElement("div");
    connector.className = "connector";
    css(connector, "display", tip.disconnected ? "none" : "");
    box.appendChild(connector);
    box.appendChild(content);
    tooltip.appendChild(box);
    return tooltip;
  }
}

/** The one quick help screen (the old module exported an instance). */
export const quickHelp = new QuickHelp();
