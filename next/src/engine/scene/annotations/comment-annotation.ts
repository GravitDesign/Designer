// Old: chunk.vendor.js module 285 (GCommentAnnotation).
/**
 * A comment pin, node "anc": a path with the speech-bubble icon. Its hit
 * test only checks the paint box (no custom collision box, no children).
 * Without geometry (no anchor points yet) inserting it through the editor
 * throws, as in the old app; the editor calls initDefaultForLimitedRestore
 * and initSizeAndPosition to give it the icon first.
 */
import { RGBColor } from "../../color/rgb-color.ts";
import type { Point } from "../../math/point.ts";
import { Transform } from "../../math/transform.ts";
import type { PaintContext } from "../../paint/paint-context.ts";
import { FillPaintLayer } from "../../style/fill-paint-layer.ts";
import type { Element, ElementHit } from "../element.ts";
import type { ContainerNode } from "../node-container.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Path } from "../path.ts";
import { AnnotationMixin, handleShapeAnnotationChange, isAnnotationShown } from "./annotation.ts";

/** The outline of the bubble, in the old anchor point format. */
const BUBBLE_POINTS = [
  ["AABQQQAAAEA=", "#", "ASWMgdolqKdvdTUvVRyceEn0rAuEUTm4", "H", "KNZYQQAAAEA="],
  ["AABgQQAAQEA=", "#", "nd22mOgp9wxiE78dIJ4zmwTbyjsz6UxR", "h", "AABgQV6nHEA="],
  ["AABgQQAAUEE=", "#", "hHfpCgKektXyYnbgLReBnyHgyMdCsGE5", "H", "AABgQSjWWEE="],
  ["AABQQQAAYEE=", "#", "A8MR93B6765dwbhY72EpMNwf6Io5gJBI", "h", "KNZYQQAAYEE="],
  ["AABAQAAAYEE=", "#", "hiopKUR35ezTlQlMF2XXGm59T3GrCPI1", "H", "XqccQAAAYEE="],
  ["AAAAQAAAUEE=", "#", "NJlMiKCLsmxtfj36U08HEEAKzakuhou3", "h", "AAAAQCjWWEE="],
  ["AAAAQAAAQEA=", "#", "zMQ5I4UifU7wLrItA5sB24qNqmgQDOaf", "H", "AAAAQF6nHEA="],
  ["AABAQAAAAEA=", "#", "40qmUrBtM8PDIwJ7MXVyTvAwNMpMzd6t", "h", "XqccQAAAAEA="],
];

/** The lines inside the bubble (a child path, filled white). */
const LINES_POINTS = [
  ["AABAQQAAgEA=", "#", "0PjaYCOSKsZ9lCT9XOAgGmMJ8veAWfQo"],
  ["AACAQAAAgEA=", "#", "828pSrqb24wp2nmkrC7WW6wuOBaijRCX", "H", "XqdcQAAAgEA="],
  ["AABAQAAAoEA=", "#", "mtxjcchNF71X7vl8ipyWYVpdVpmLllb1", "h", "AABAQK9TjkA="],
  ["AABAQAAAoEA=", "#", "YYq8Hz0AMzof2UImOgNuY1Zr7vM46gey"],
  ["AABAQAAAIEE=", "#", "kBx58J5JvXmPgYDrUgSf3VFE0z0BcQh6", "H", "AABAQCjWKEE="],
  ["AACAQAAAMEE=", "#", "By4pcXWyRMkEHvlhz9Z5rqU5Be8XOMpF", "h", "XqdcQAAAMEE="],
  ["AACAQAAAMEE=", "#", "bf2r8e2nsAKfH7wxLed5xFtDlZIMhV7p"],
  ["AACgQAAAMEE=", "#", "IxkJ1dZbYiQcHYajF0yD4PXFKYDoahXW"],
  ["AACgQAAAUEE=", "#", "cVEjEe2LXioWCTVXNZDoEJh02KKpyRza"],
  ["EFj1QAAAMEE=", "#", "lClGLXYj5pesu92S34xzXcOzTgtCoPKn"],
  ["AABAQQAAMEE=", "#", "Slj3Uny3DDcXky9U49B05AwhSUwsqzzy", "H", "KNZIQQAAMEE="],
  ["AABQQQAAIEE=", "#", "vp0ND6im3Uw7VySEZQacXujU82DYJAS5", "h", "AABQQSjWKEE="],
  ["AABQQQAAIEE=", "#", "XHM0QcKkXpyGPMNBv4sTsdCtaILW36OK"],
  ["AABQQQAAoEA=", "#", "5bqYgYn18WofYH5UDYfIgvxcjOGsQZMs", "H", "AABQQa9TjkA="],
  ["AABAQQAAgEA=", "#", "DT8Kkp2I0v6oJ4qbzDL7fseUs251GXtg", "h", "KNZIQQAAgEA="],
];

/** Scales the 0..16 icon to 0..42.7 and centers it on the origin's corner. */
const ICON_TRANSFORM = [
  2.6666666666666665, 0, 0, 2.6666666666666665, -5.333333333333333, -5.333333333333333,
] as const;

export class CommentAnnotation extends AnnotationMixin(Path) {
  static {
    registerNodeClass(this, "anc", "GCommentAnnotation");
  }

  declare _insidePath: Path | null;

  constructor() {
    super();
    this.initializeAnnotation();
  }

  override hitTest(
    location: Point,
    transform?: Transform | null,
    acceptor?: ((element: Element) => unknown) | null,
    stacked?: boolean,
    level?: number | null,
    tolerance?: number | null,
    force?: unknown,
    filter?: ((element: Element) => unknown) | null,
    options?: unknown,
  ): ElementHit[] | null {
    const width = tolerance || 0;
    if (filter && false === filter(this)) return null;
    let area = this.getPaintBBox();
    if (!area || area.isEmpty()) return null;
    if (transform) area = transform.mapRect(area);
    if (!area.expanded(width, width, width, width).containsPoint(location)) return null;
    let hits: ElementHit[] | null = null;
    // No children are tested, so the own hit is always the first one
    // (the old stacked branch could never append).
    if ((acceptor && 1 == (acceptor(this) as number)) || !acceptor) {
      const own = this._detailHitTest(location, transform, width, force, options);
      if (own) hits = [own];
    }
    return hits;
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "annlst" === Node.getName(parent);
  }

  override isEmptyTextAllowed(): boolean {
    return false;
  }

  override isPaintable(context?: PaintContext | null): boolean {
    return isAnnotationShown(this, context) && super.isPaintable(context);
  }

  override _handleChange(change: number, args?: unknown): void {
    handleShapeAnnotationChange(this, change, args, false);
    super._handleChange(change, args);
  }

  /** Gives a pin restored without geometry the bubble icon. */
  override initDefaultForLimitedRestore(): void {
    this.setProperty("closed", true);
    const lines = new Path();
    lines.setProperties(["closed", "trf"], [true, this.getProperty("trf")]);
    const fill = new FillPaintLayer(new RGBColor([255, 255, 255]));
    (lines.getPaintLayers() as NonNullable<ReturnType<Path["getPaintLayers"]>>).appendChild(fill);
    this.appendChild(lines);
    this.getAnchorPoints().deserialize(BUBBLE_POINTS);
    lines.getAnchorPoints().deserialize(LINES_POINTS);
  }

  /**
   * Scales the icon to its on-canvas size when the pin has no transform
   * yet. With an invertible transform the old code called
   * `GTransform.invert`, which doesn't exist, so it threw; kept (a
   * singular transform is left alone).
   */
  override initSizeAndPosition(): void {
    const icon = new Transform(...ICON_TRANSFORM);
    const current = this.getProperty("trf") as Transform | null;
    if (current && current.invertible()) {
      throw new TypeError("t.invert is not a function");
    } else if (!current) this.transform(icon);
  }

  override toString(): string {
    return "[GCommentAnnotation]";
  }
}

CommentAnnotation.prototype._insidePath = null;
