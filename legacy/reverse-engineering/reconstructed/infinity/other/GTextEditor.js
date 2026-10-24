/**
     * An editor for a text
     * @param {IFText} text the text this editor works on
     * @class GTextEditor
     * @extends IFShapeEditor
     * @constructor
     */

function GTextEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GTextEditor.prototype.triggerHotkeyEvent = function (e) {
          var t = n.getEditor(this.getElement().getScene());
          t &&
            t.hasEventListeners(n.HotkeyEvent) &&
            t.trigger(new n.HotkeyEvent(e));
        }

GTextEditor.prototype._caretUpdate = function () {
          var e, t;
          this.isInlineEdit() &&
            (this._inlineEditor.hasFocus()
              ? (t = new Date().getTime()) > this._nextCaretToggle &&
                ((e = this._element.getTLCore()),
                (this._nextCaretToggle = t + 500),
                e && e.toggleCaret() && this.getElement().repaint(!0))
              : (e = this._element.getTLCore()) &&
                e.isCaretVisible() &&
                e.toggleCaret());
        }

/** @override */
GTextEditor.prototype.adjustInlineEditForView = function (view, position) {
          var i = this.getElement().getTLCore();
          i && !this.getElement().getProperty("_we")
            ? i.selectAll()
            : t && this._inlineEditor.setCursor(t);
        }

/** @override */
    IFTextEditor.prototype.initialSetup = function () {
        // Add a default style with a default fill
        var style = new IFInlineStyle();
        style.appendChild(new IFFillPaint());
        this.getElement().getStyleSet().appendChild(style);
    };

    /** @override */
GTextEditor.prototype.canInlineEdit = function () {
          if (
            m.inlineEditText &&
            this._inlineEditEnabled &&
            this.getElement().getTLCore() &&
            this._element.getWorkspace().getFontManager().getDefaultFont() &&
            !this._element.isFakeText() &&
            this._element.$_ed
          )
            return true;
          return false;
        }

/** @override */
    IFTextEditor.prototype.initialSetup = function () {
        // Add a default style with a default fill
        var style = new IFInlineStyle();
        style.appendChild(new IFFillPaint());
        this.getElement().getStyleSet().appendChild(style);
    };

    /** @override */
    IFTextEditor.prototype.canInlineEdit = function () {
        return true;
    };

    /** @override */
GTextEditor.prototype.isInlineEdit = function () {
          return (
            null !== this._inlineEditor && this._inlineEditor.isActivated()
          );
        }

/** @override */
    IFTextEditor.prototype.canInlineEdit = function () {
        return true;
    };

    /** @override */
    IFTextEditor.prototype.isInlineEdit = function () {
        return this._inlineEditor !== null;
    };

    /** @override */
GTextEditor.prototype.beginInlineEdit = function (view, container) {
          var t = this.getElement().getTLCore();
          t &&
            this._element.getWorkspace().getFontManager().getDefaultFont() &&
            !this._element.isFakeText() &&
            (this.removeFlag(y.Flag.ResizeAll),
            this._inlineEditor ||
              ((this._inlineEditor = new p(this)),
              t.selectionChanged(
                function (e) {
                  if (!this.getParentEditor()) return r.UNSUBSCRIBE;
                  this._triggerSelectionChanged(), this.getElement().repaint();
                }.bind(this),
                !0
              )),
            (this._nextCaretToggle = new Date().getTime()),
            this._inlineEditor.activate(e),
            this.getElement().repaint(!0));
        }

GTextEditor.prototype.isSelectionHit = function (e) {
          return !!this.isInlineEdit() && this._inlineEditor.isSelectionHit(e);
        }

GTextEditor.prototype.isDeletePartsAllowed = function () {
          return this.isInlineEdit();
        }

GTextEditor.prototype.deletePartsSelected = function () {
          this.isInlineEdit() && this._inlineEditor.deleteSelected();
        }

/** @override */
GTextEditor.prototype.finishInlineEdit = function () {
          this._inlineEditor._view;
          this._inlineEditor.deactivate(),
            this.getElement().repaint(!1),
            this.getElement().getProperty("plkt") &
              c.ProgramLck.NoSizeChanges || this.setFlag(y.Flag.ResizeAll);
          var e = this.getElement().getTLCore();
          if (
            e &&
            (this.getElement().setProperty(
              "_we",
              this.getElement().getProperty("_we") || e.getWasEdited(),
              !1,
              !1,
              !1
            ),
            e.getLength() <= 1)
          ) {
            var t = n.getEditor(this.getElement().getScene());
            t && t.deleteSelection(!0);
          }
          return "Modify Text Content";
        }

GTextEditor.prototype.canHandleKeyEvents = function () {
          return true;
        }

GTextEditor.prototype.setInlineEditEnabled = function (e) {
          this._inlineEditEnabled = e;
        }

/** @private */
    IFTextEditor.prototype._triggerSelectionChanged = function () {
        var editor = IFEditor.getEditor(this.getElement().getScene());
        if (editor.hasEventListeners(IFEditor.InlineEditorEvent)) {
            editor.trigger(new IFEditor.InlineEditorEvent(this, IFEditor.InlineEditorEvent.Type.SelectionChanged));
        }
    };

    /** @override */
GTextEditor.prototype.toString = function () {
          return "[Object GTextEditor]";
        }

module.exports = GTextEditor;
