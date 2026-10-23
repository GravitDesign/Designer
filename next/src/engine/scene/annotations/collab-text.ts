// Old: chunk.vendor.js module 531 (GCollabText).
/**
 * A collaborative text, node "collabtext": an image of a text block that
 * collaborators could switch into an editable text (text mode) through
 * the "A" button above its top right corner. It carries the text
 * properties too, but stores and restores like a plain GImage (it has no
 * change handler of its own), so files keep only the image part.
 *
 * Text mode swaps the instance's prototype to CollabTextAnnotationBase (a
 * GText) and keeps the collab text's own paint box, hit test and action
 * methods bound to the instance; the image and text transforms are kept
 * in `imgTrf` and `textTrf` while the other one is active. The cloud
 * editing that used it is gone; the class stays for files that contain
 * it.
 */
import { Locale } from "../../core/locale/locale.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import type { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import type { FontAvailableEvent } from "../../text/fonts/font-manager.ts";
import { Text } from "../../text/text.ts";
import type { ElementHit } from "../element.ts";
import { Image } from "../image.ts";
import { Reference } from "../node-identity.ts";
import { registerNodeClass } from "../node.ts";
import { Rectangle } from "../rectangle.ts";
import { ActionableMixin } from "./actionable.ts";
import { Annotable } from "./annotable.ts";
import { CollabTextAction } from "./collab-text-action.ts";
import { CollabTextAnnotationBase } from "./collab-text-annotation-base.ts";

const GeometryProperties = {
  imgTrf: null,
  textTrf: null,
};

const MetaProperties = {
  collab: true,
  Guid: null,
};

/** A collab text as GText sees it (the text members it borrows in text mode). */
type AsText = Text;

export class CollabText extends Annotable(ActionableMixin(Reference(Image))) {
  static {
    registerNodeClass(this, "collabtext", "GCollabText");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;

  declare $trf: Transform | null;
  declare $imgTrf: Transform | null;
  declare $textTrf: Transform | null;
  declare _runs: unknown[];
  declare _runsDirty: boolean;
  declare _vertexContainer: VertexContainer;
  declare _textMode: boolean;

  constructor() {
    super();
    this._setDefaultProperties(Text.GeometryProperties);
    this._setDefaultProperties(Text.MetaProperties);
    this._setDefaultProperties(GeometryProperties);
    this._setDefaultProperties(MetaProperties);
    this._runs = [];
    this._runsDirty = false;
    this._vertexContainer = new VertexContainer();
    this._textMode = false;
    // An own field, so it survives the prototype swap of text mode.
    this.getNodeNameTranslated = function (this: CollabText): string {
      return Locale.getValue("GCollabText", "name", this.getNodeName()) as string;
    };
    this.addAction(new CollabTextAction());
  }

  /** Turns an image-mode collab text into an editable text. */
  static setModeText(node: CollabText): void {
    if (node._textMode) return;
    Object.setPrototypeOf(node, CollabTextAnnotationBase.prototype);
    const own = CollabText.prototype;
    node._calculatePaintBBox = own._calculatePaintBBox.bind(node);
    node._detailHitTest = own._detailHitTest.bind(node);
    node.getActionsBBox = own.getActionsBBox.bind(node);
    node.hitActionTest = own.hitActionTest.bind(node);
    node.getActions = own.getActions.bind(node);
    node.addAction = own.addAction.bind(node);
    node._fontAvailableEvent = own._fontAvailableEvent.bind(node);
    node._textMode = true;
    node.$imgTrf = node.$trf;
    node.$trf = node.$textTrf;
    const text = node as unknown as AsText;
    text.$afs = true;
    text.adaptFontSizeToFitBBox();
  }

  /** Back to the image (the bound methods stay on the instance). */
  static setModeImage(node: CollabText): void {
    if (!node._textMode) return;
    Object.setPrototypeOf(node, CollabText.prototype);
    node._textMode = false;
    node.$textTrf = node.$trf;
    node.$trf = node.$imgTrf;
  }

  static isTextMode(node: CollabText): boolean {
    return !!node._textMode;
  }

  /** The text's plain content, from the layout core once it runs. */
  getPlainText(): unknown {
    const text = this as unknown as AsText;
    let plain: unknown;
    if (text._tlCore && text._tlCore.isInitialized()) {
      plain = text._tlCore.getDocumentRange().plainText();
      if (!plain) plain = text._startText;
    } else plain = text._tempText;
    return plain;
  }

  /** The image's (or in text mode the text's) paint box, raised by the button row. */
  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    let box = this._textMode
      ? Text.prototype._calculatePaintBBox.call(this as unknown as AsText, arg, includeInvisible)
      : Image.prototype._calculatePaintBBox.call(this, arg, includeInvisible);
    if (box) {
      const actions = this.getActionsBBox();
      if (actions) box = box.expanded(0, actions.getHeight(), 0, 0);
    }
    return box;
  }

  /** The text's or the plain rectangle's hit test (not the image's pixel test), then the buttons. */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
    force?: unknown,
  ): ElementHit | null {
    return (
      (this._textMode
        ? Text.prototype._detailHitTest.call(
            this as unknown as AsText,
            location,
            transform,
            tolerance,
            force,
          )
        : Rectangle.prototype._detailHitTest.call(this, location, transform, tolerance, true)) ||
      (this.hitActionTest(location, transform as Transform) as ElementHit | null)
    );
  }

  _fontAvailableEvent(event: FontAvailableEvent): void {
    if (this._textMode) Text.prototype._fontAvailableEvent.call(this as unknown as AsText, event);
  }

  override toString(): string {
    return "[GCollabText]";
  }
}
