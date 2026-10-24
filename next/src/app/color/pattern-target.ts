// Old: designer.browser.dev.js module 1723 ($.fn.gPatternTarget).
/**
 * Makes an element a drag source and drop target for paints (the
 * previews of the color fields, the swatches of the effect forms). It
 * holds a pattern; dragging carries it as GPattern.MIME_TYPE, dropping
 * a pattern of an accepted type sets it.
 *
 * The old plugin triggered jQuery events with extra arguments; they are
 * bubbling DOM CustomEvents now whose `detail` is the argument list, so
 * listeners on an ancestor still see them (the color field listens on
 * its outer element):
 *
 *     const target = new PatternTarget(element);
 *     target.types([Color]);
 *     onPatternEvent(element, "patternchange", (event, pattern) => ...);
 *
 * - `patterndrag` [pattern]: a drag of the held pattern starts.
 * - `patternchange` [pattern]: a dropped pattern differs from the held one.
 * - `patterndrop` [pattern, dragEvent]: an accepted pattern was dropped.
 */
import { equals } from "../../engine/core/util.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { css } from "../shell/dom.ts";
import { dragImage } from "../shell/globals.ts";
import { PressMode } from "../shell/press-mode.ts";

/** The arguments of the paint events, by event name. */
export interface PatternEventArgs {
  patterndrag: [pattern: Pattern];
  patterndrop: [pattern: Pattern, event: DragEvent];
  /**
   * From a drop: [pattern]. From the color chooser: [pattern, opacity,
   * transient, fromChooser, activeStopIndex]; the pattern is undefined
   * when only the opacity changed. From the eye dropper: [color, alpha, false].
   */
  patternchange: [
    pattern?: Pattern | null,
    opacity?: number,
    transient?: boolean,
    fromChooser?: boolean,
    activeStopIndex?: number | null,
  ];
  /** The chooser is about to close; `prevent()` keeps it open. */
  chooserclose: [prevent: () => void, event: unknown];
  chooseropen: [];
  /** The eye dropper picked a pixel: [r, g, b, a] (0-255). */
  colorchange: [rgba: Uint8ClampedArray | number[]];
}

export type PatternEventType = keyof PatternEventArgs;

/** `$(el).trigger(type, args)`: a bubbling CustomEvent carrying the arguments. */
export function triggerPatternEvent<T extends PatternEventType>(
  element: Element,
  type: T,
  args: PatternEventArgs[T],
): void {
  element.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: args }));
}

/**
 * `$(el).on(type, (event, ...args) => ...)` for the paint events.
 * Returns a function that removes the listener.
 */
export function onPatternEvent<T extends PatternEventType>(
  element: Element,
  type: T,
  listener: (event: CustomEvent, ...args: PatternEventArgs[T]) => void,
): () => void {
  const handler = (event: globalThis.Event) => {
    const custom = event as CustomEvent<PatternEventArgs[T]>;
    const args = (Array.isArray(custom.detail) ? custom.detail : []) as PatternEventArgs[T];
    listener(custom, ...args);
  };
  element.addEventListener(type, handler);
  return () => element.removeEventListener(type, handler);
}

export interface PatternTargetOptions {
  allowDrag?: boolean;
  allowDrop?: boolean;
}

/** A pattern class drops are checked against (`instanceof`). */
export type PatternType = abstract new (...args: never[]) => object;

const targets = new WeakMap<Element, PatternTarget>();

/** What the old code stored on the DataTransfer besides the data. */
interface SourcedDataTransfer extends DataTransfer {
  sourceElement?: Element;
}

export class PatternTarget {
  /** The target set up on an element ($(el).data("gpatterntarget")). */
  static of(element: Element): PatternTarget | null {
    return targets.get(element) || null;
  }

  readonly element: HTMLElement;
  readonly options: Required<PatternTargetOptions>;
  pattern: Pattern | null = null;
  private _types: (PatternType | null | undefined)[] | null = null;

  constructor(element: HTMLElement, options: PatternTargetOptions = {}) {
    this.element = element;
    this.options = { allowDrag: true, allowDrop: true, ...options };
    targets.set(element, this);
    if (this.options.allowDrag) {
      element.setAttribute("draggable", "true");
      element.setAttribute("data-drag-mode", String(PressMode.PRESS_AND_HOLD));
      element.addEventListener("dragstart", (event) => {
        const pattern = this.pattern;
        const transfer = event.dataTransfer as SourcedDataTransfer | null;
        if (pattern && transfer) {
          event.stopPropagation();
          triggerPatternEvent(element, "patterndrag", [pattern]);
          const image = dragImage();
          css(image, "background", Pattern.asCSSBackground(pattern));
          css(image, "width", "20px");
          css(image, "height", "20px");
          transfer.setDragImage(image, 10, 10);
          transfer.effectAllowed = "move";
          transfer.setData(Pattern.MIME_TYPE, Pattern.serialize(pattern) as string);
          transfer.sourceElement = element;
        } else event.preventDefault();
      });
      element.addEventListener("dragend", (event) => {
        event.stopPropagation();
      });
    }
    if (this.options.allowDrop) {
      element.addEventListener("dragover", (event) => {
        event.stopPropagation();
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });
      element.addEventListener("drop", (event) => {
        event.stopPropagation();
        const blob = event.dataTransfer ? event.dataTransfer.getData(Pattern.MIME_TYPE) : "";
        const dropped = blob ? Pattern.deserialize(blob) : null;
        if (dropped) {
          let accepted = true;
          const types = this._types;
          if (types && types.length > 0) {
            accepted = false;
            for (let n = 0; n < types.length; ++n) {
              const type = types[n];
              if (type && dropped instanceof type) {
                accepted = true;
                break;
              }
            }
          }
          if (accepted) {
            if (!equals(dropped, this.pattern)) {
              this.value(dropped);
              triggerPatternEvent(element, "patternchange", [dropped]);
            }
            triggerPatternEvent(element, "patterndrop", [dropped, event]);
          }
        }
        // Old: `return false` from the jQuery handler.
        event.preventDefault();
        event.stopPropagation();
      });
    }
  }

  /** `gPatternTarget("value")`: the held pattern or null. */
  value(): Pattern | null;
  /** `gPatternTarget("value", p)`: holds `p` (a serialized pattern is deserialized). */
  value(pattern: Pattern | string | null | undefined): this;
  value(...args: (Pattern | string | null | undefined)[]): Pattern | null | this {
    if (args.length) {
      const value = args[0];
      this.pattern = "string" == typeof value ? Pattern.deserialize(value) : value || null;
      // The old plugin stored undefined as it was; both read back as null.
      return this;
    }
    return this.pattern || null;
  }

  /** `gPatternTarget("types")`: the accepted pattern classes. */
  types(): (PatternType | null | undefined)[] | null;
  /** `gPatternTarget("types", list)`: only drops of these classes are taken (none: all). */
  types(types: (PatternType | null | undefined)[] | null): this;
  types(
    ...args: ((PatternType | null | undefined)[] | null)[]
  ): (PatternType | null | undefined)[] | null | this {
    if (args.length) {
      this._types = args[0] ?? null;
      return this;
    }
    return this._types;
  }
}
