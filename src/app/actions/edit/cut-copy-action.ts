// Old: designer.browser.dev.js module 1331 (GCutCopyAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Item } from "../../../engine/scene/item.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Text } from "../../../engine/text/text.ts";
import type { Editor } from "../../../editor/editor.ts";
import { EditorOptions } from "../../../editor/editor-options.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { alertDialog, iterateEqualStyleLayers, PanelIds } from "../deps.ts";
import { isButtonElement, isEditable, isTextSelectable } from "../focus.ts";
import {
  activeDocument,
  applicationManager,
  gContainer,
  gDesigner,
  parentOf,
  props,
  type ActionDocument,
  type ActionStorageItem,
  type ActionWindow,
  type PropertiesNode,
} from "../host.ts";

/** `$("<div/>").text(text).html()`: the text with &, < and > escaped. */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** What the copy reads of a text: its layout core's ranges. */
interface TextCore {
  selectedRange(): { plainText(): string };
  getDocumentRange(): { plainText(): string };
}

/**
 * Edit > Cut and Edit > Copy.
 *
 * Both run from the browser's cut and copy events: the shortcut lets the
 * key through (executeFromShortcut returns false), the event handler
 * writes the clipboard data (a <gravit mimeType=...> wrapper as text/xml,
 * the text of a copied text as text/plain) and keeps the serialized nodes
 * in the app's internal clipboard too. From the menu (execute) there is no
 * event, so the wrapper goes through the container's clipboard write.
 *
 * While the mouse is over the fill, border or effect panel, the hovered
 * style layer is copied instead of the selection.
 *
 * Without ClipboardEvent the browser can't be given the data, so a hidden
 * textarea takes the focus before the key reaches it.
 */
export class CutCopyAction extends Action {
  static ID_COPY = "edit.copy";
  static ID_CUT = "edit.cut";

  private readonly _isCut: boolean;
  private _cutCopyArea: HTMLTextAreaElement | null = null;

  constructor(isCut: boolean) {
    super();
    this._isCut = isCut;
    document.addEventListener(
      this._isCut ? "cut" : "copy",
      this._documentCutOrCopyEvent.bind(this) as EventListener,
    );
    document.addEventListener(
      this._isCut ? "beforecut" : "beforecopy",
      this._documentBeforeCutOrCopyEvent.bind(this),
    );
    if (!Object.prototype.hasOwnProperty.call(window, "ClipboardEvent")) {
      const area = document.createElement("textArea") as HTMLTextAreaElement;
      area.style.position = "absolute";
      area.style.top = "-9999px";
      area.style.opacity = "0";
      area.tabIndex = -1;
      document.body.appendChild(area);
      this._cutCopyArea = area;
    }
  }

  override getId(): string {
    return this._isCut ? CutCopyAction.ID_CUT : CutCopyAction.ID_COPY;
  }

  override getTitle(): LocaleKey {
    return new LocaleKey("GCutCopyAction", "title." + (this._isCut ? "cut" : "copy"));
  }

  override getIcon(): string {
    return "gravit-icon-" + (this._isCut ? "cut" : "copy");
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "ccp";
  }

  override getShortcut(): Shortcut {
    return this._isCut ? [Key.Constant.META, "X"] : [Key.Constant.META, "C"];
  }

  override isEnabled(): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    return !!designerDocument && !!designerDocument.getEditor().getSelection();
  }

  /** Returns false so the key goes on to the browser, which fires cut or copy. */
  override executeFromShortcut(): boolean {
    if (!this._isEditableElementFocused() && this._cutCopyArea) this._cutCopyArea.focus();
    return false;
  }

  override execute(): void {
    this._documentCutOrCopyEvent(null);
  }

  private _documentCutOrCopyEvent(event: ClipboardEvent | null): void {
    if (this._isBrowserHandleCopy(event)) return;
    if (event) event.preventDefault();
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    if (this._isMouseOverContextStyleCopy()) {
      const layer = this._getActiveStyleMouseOverContextBased();
      this._copyStyleToClipboard(layer as Node, event);
      this._notifyMouseOverContextOfSuccessfulCopy();
    } else {
      const selection = editor && editor.getSelection();
      this._copySelectionToClipboard(selection as Node[] | null, event);
    }
    if (this._isCut && editor) this._deleteCutSelection();
    if (this._cutCopyArea) this._focusOnActiveArea();
  }

  /** Keeps the browser's Cut and Copy menu entries enabled outside text fields. */
  private _documentBeforeCutOrCopyEvent(event: Event): void {
    if (!(
      document.activeElement &&
      isEditable(document.activeElement) &&
      !gDesigner().isGravitIME(document.activeElement)
    )) {
      event.preventDefault();
    }
  }

  private _focusOnActiveArea(): void {
    setTimeout(function () {
      const windows = gDesigner().getWindows();
      if (windows && windows.getActiveWindow())
        (windows.getActiveWindow() as ActionWindow).getView().focus();
    }, 1);
  }

  /**
   * Meant to drop every node that has an ancestor among the nodes kept
   * before it. The predicate never returns true, so findParent walks all
   * ancestors and only the last one (the topmost) decides, and only for
   * the last kept node: in practice nothing is dropped. Kept, see "Copy
   * keeps children of copied groups" in QUESTIONS.md.
   */
  private _filterOutSelectionWithSameParent(selection: Node[] = []): Node[] {
    const nodes = Node.order(selection.slice()) as Node[];
    const kept: Node[] = [];
    const hasKeptAncestor = function (node: Node): boolean {
      let found = false;
      kept.forEach((candidate) => {
        node.findParent((parent) => {
          found = parent === candidate;
          return undefined;
        });
      });
      return found;
    };
    for (let i = 0; i < nodes.length; ++i) {
      if (!hasKeptAncestor(nodes[i] as Node)) kept.push(nodes[i] as Node);
    }
    return kept;
  }

  private _isEditableElementFocused(): boolean {
    return !(
      !document.activeElement ||
      !isEditable(document.activeElement) ||
      gDesigner().isGravitIME(document.activeElement)
    );
  }

  /** Whether the browser's own copy should run: a text field or selectable text has it. */
  private _isBrowserHandleCopy(event: ClipboardEvent | null): boolean {
    return (
      (this._isEditableElementFocused() || (!!event && isTextSelectable(event.target))) &&
      !isButtonElement(document.activeElement) &&
      (!this._cutCopyArea || document.activeElement !== this._cutCopyArea)
    );
  }

  private _getActiveStyleMouseOverContextBased(): unknown {
    const designer = gDesigner();
    const designerDocument = activeDocument();
    const context = designer.getMouseOverContext();
    const styles = designerDocument.getActiveStylesList();
    let layer: unknown = null;
    if (context.context === PanelIds.FillPropertiesPanel) layer = styles.Fill;
    else if (context.context === PanelIds.BorderPropertiesPanel) layer = styles.Border;
    else if (context.context === PanelIds.EffectPropertiesPanel) layer = styles.Effect;
    return layer;
  }

  private _serializeData(nodes: Node[], exceptions: Node[] | null = null): string {
    return Node.serialize(nodes, {
      exceptions,
      copy: true,
      copyIgnoreProperties: EditorOptions.propertiesExcludedFromCopying,
    } as Parameters<typeof Node.serialize>[1]) as string;
  }

  private _copyStyleToClipboard(layer: Node, event: ClipboardEvent | null): void {
    const serialized = this._serializeData([layer]);
    const wrapped =
      '<gravit mimeType="' + Node.MIME_TYPE + '">' + escapeHtml(serialized) + "</gravit>";
    if (event) (event.clipboardData as DataTransfer).setData("text/xml", wrapped);
    else gDesigner().setClipboardContent(Node.MIME_TYPE, serialized);
  }

  private _isRestricted(): boolean {
    return activeDocument().isCommercialProductFile() || !applicationManager().isCopyPasteEnabled();
  }

  private _filterSupportedCopyNodes(nodes: Node[] = []): Node[] {
    return nodes.filter(function (node) {
      return node instanceof Item || node instanceof Layer;
    });
  }

  /** The text of the first copied text (its selected text while edited inline) as text/plain. */
  private _parseTextSelectionToEventClipboard(nodes: Node[], event: ClipboardEvent): void {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] instanceof Text) {
        let plain: string;
        const text = nodes[i] as Text;
        const core = text.getTLCore() as TextCore | null;
        if (core) {
          const editor = ElementEditor.getEditor(text) as unknown as {
            isInlineEdit(): boolean;
          } | null;
          plain =
            editor && 1 === nodes.length && editor.isInlineEdit()
              ? core.selectedRange().plainText()
              : core.getDocumentRange().plainText();
        } else plain = text.getContent() as string;
        (event.clipboardData as DataTransfer).setData("text/plain", plain);
        break;
      }
    }
  }

  /** Nodes the copy leaves out: linked elements outside the selection and annotations. */
  private _buildExceptionsForSelection(nodes: Node[] = []): Node[] {
    const editor = activeDocument().getEditor();
    let exceptions: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      exceptions = exceptions.concat(
        editor.getLinkedElementsInSelection(nodes[i] as never, nodes as never) as unknown as Node[],
      );
    }
    // HAS_ANNOTATIONS was true in the old build (module 10).
    exceptions = exceptions.concat(
      editor.getAnnotationsExceptions(nodes as never) as unknown as Node[],
    );
    return exceptions;
  }

  /** The shared styles the copied nodes reference, copied along with them. */
  private _extractStylesFromSelection(nodes: Node[]): Node[] {
    const styles: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as PropertiesNode & { getReferencedStyle?(): Node | null };
      if (node.hasProperty("sref") && node.getReferencedStyle && node.getReferencedStyle()) {
        styles.push(node.getReferencedStyle() as Node);
      }
    }
    return styles;
  }

  private _deleteCutSelection(): void {
    // The old code built this key with the key name as class and no key.
    let title = Locale.get(new LocaleKey("text.cut-selection", undefined as unknown as string));
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const context = designer.getMouseOverContext();
    const styles = (designerDocument as ActionDocument).getActiveStylesList();
    (editor as Editor).beginTransaction();
    try {
      if (context.context && (styles.Fill || styles.Border || styles.Effect)) {
        let layer: unknown = null;
        let kind: "fill" | "border" | "effect" | null = null;
        const selection = (editor as Editor).getSelection() as Node[];
        if (context.context === PanelIds.FillPropertiesPanel) {
          layer = styles.Fill;
          kind = "fill";
        } else if (context.context === PanelIds.BorderPropertiesPanel) {
          layer = styles.Border;
          kind = "border";
        } else if (context.context === PanelIds.EffectPropertiesPanel) {
          layer = styles.Effect;
          kind = "effect";
        }
        iterateEqualStyleLayers(kind, layer, selection, function (equal: Node) {
          parentOf(equal).removeChild(equal);
        });
        title = Locale.get(this.getTitle());
      } else (editor as Editor).deleteSelection(true);
    } finally {
      (editor as Editor).commitTransaction(title as string);
    }
  }

  private _copySelectionToClipboard(
    selection: Node[] | null,
    event: ClipboardEvent | null = null,
  ): void {
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    let nodes = this._filterOutSelectionWithSameParent(selection || undefined);
    nodes = this._filterSupportedCopyNodes(nodes);
    if (nodes && nodes.length) {
      const exceptions = this._buildExceptionsForSelection(nodes);
      const styles = this._extractStylesFromSelection(nodes);
      nodes.push(...styles);
      if (this._isRestricted())
        nodes = (designerDocument as ActionDocument).restrictElements(nodes);
      const serialized = this._serializeData(nodes, exceptions);
      designer.setClipboardContent(Node.MIME_TYPE, serialized);
      const single = 1 === nodes.length && nodes[0];
      // A collaborative comment's text stays out of the system clipboard.
      if (!(single && single.hasMixin(Node.Properties) && props(single).getProperty("collab"))) {
        const wrapped =
          '<gravit mimeType="' +
          Node.MIME_TYPE +
          '" restricted="' +
          String(
            !!this._isRestricted() &&
              ((designerDocument as ActionDocument).getStorageItem() as ActionStorageItem).getId(),
          ) +
          '">' +
          escapeHtml(serialized) +
          "</gravit>";
        if (event) {
          (event.clipboardData as DataTransfer).setData("text/xml", wrapped);
          this._parseTextSelectionToEventClipboard(nodes, event);
        } else {
          gContainer()
            .copyToClipboard(wrapped)
            .catch(() => {
              this._showError();
            });
        }
      }
    }
  }

  private _isMouseOverContextStyleCopy(): boolean {
    const designer = gDesigner();
    const designerDocument = activeDocument();
    const context = designer.getMouseOverContext();
    const styles = designerDocument.getActiveStylesList();
    return !!(context.context && (styles.Fill || styles.Border || styles.Effect));
  }

  private _notifyMouseOverContextOfSuccessfulCopy(): void {
    const context = gDesigner().getMouseOverContext();
    if (context.contextCallback) context.contextCallback(context.prevEvt);
  }

  private _showError(): void {
    const name = this._isCut
      ? Locale.get(new LocaleKey("GCutCopyAction", "title.cut"))
      : Locale.get(new LocaleKey("GCutCopyAction", "title.copy"));
    alertDialog(
      (Locale.get(new LocaleKey("GCutCopyAction", "text.security-issues")) as string)
        .replace("%cutcopy", name as string)
        .replace("%shortcut", Key.shortcutToString(this.getShortcut())),
    );
  }

  override toString(): string {
    return "[Object GCutCopyAction]";
  }
}
