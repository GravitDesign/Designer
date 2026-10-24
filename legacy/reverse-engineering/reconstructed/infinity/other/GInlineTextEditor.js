/**
 * GInlineTextEditor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInlineTextEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GInlineTextEditor.prototype._checkTimeStamp = function (e) {
          return (
            (e < 0 && Math.abs(this._lastTimeStamp - e) < 10) ||
            e === this._lastTimeStamp
          );
        }

GInlineTextEditor.prototype._compStart = function (e) {
          this._compositionOn &&
            this._view &&
            this._view.resetInputBoxContent(),
            (this._compositionOn = true),
            (this._lastCompositedTextLength = 0),
            (this._compositionSelectionDelta = 0);
        }

GInlineTextEditor.prototype._compEnd = function (e) {
          this._view && this._view.resetInputBoxContent(),
            (this._compositionOn = false);
        }

GInlineTextEditor.prototype._boxInput = function (e) {
          "input" === e.type && this._keyPress(e, !0);
        }

GInlineTextEditor.prototype._keyPress = function (e, t) {
          var i = t ? e.target.value : e.keyUTF,
            n = this._editor.getElement().getTLCore();
          if (n)
            if (this.hasFocus()) {
              if (!b.IS_NON_PRINTABLE_REG.test(i) && !this._keyDownHandled) {
                if (
                  (this._editor.requestInvalidation(),
                  this._editor.contentSetEnabled(0),
                  t && this._compositionOn)
                ) {
                  var r = n.getSelection().start,
                    o = n.getSelection().end;
                  if (
                    (r === o &&
                      ((r += this._compositionSelectionDelta),
                      (o += this._compositionSelectionDelta)),
                    r === o)
                  ) {
                    var a = n.getRange(r - this._lastCompositedTextLength, r);
                    a.plainText() != i && a.setText(i),
                      (this._focusChar =
                        r -
                        this._compositionSelectionDelta +
                        i.length -
                        this._lastCompositedTextLength),
                      n.select(this._focusChar, null);
                  } else
                    r !== o &&
                      (n.getRange(r, o).setText(i),
                      (this._focusChar = r + i.length),
                      n.select(this._focusChar, this._focusChar));
                  this._lastCompositedTextLength = i.length;
                } else n.insert(i), t && (e.target.value = "");
                return (
                  this._updateTextArea(e),
                  this._editor.contentSetEnabled(1),
                  (this._lastResult = true),
                  e.preventDefault(),
                  e.stopPropagation(),
                  !1
                );
              }
            } else console.log("inlineTextEditor: didn't have focus");
        }

GInlineTextEditor.prototype._keyUp = function (e) {
          (this._keyDownHandled = null),
            (this._shiftKeyDown = false),
            this._updateTextArea(e);
        }

GInlineTextEditor.prototype._keyDown = function (e) {
          var t = e.key,
            i = d.modifiers.shiftKey,
            n = d.modifiers.metaKey,
            r = e.timestamp;
          return this._checkTimeStamp(r)
            ? !this._lastResult && undefined
            : ((this._lastTimeStamp = r),
              (this._lastResult = false),
              this.hasFocus()
                ? (this._editor.requestInvalidation(),
                  this._handleKey(t, i, n)
                    ? ((this._lastResult = true),
                      (this._keyDownHandled = t),
                      e.preventDefault(),
                      e.stopPropagation(),
                      !1)
                    : this._canHandleInput(t, i, n)
                    ? ((this._lastResult = true), !1)
                    : undefined)
                : (console.log("inlineTextEditor: didn't have focus"),
                  void (this._lastResult = false)));
        }

GInlineTextEditor.prototype.handleDomKeyDown = function (e) {
          if (!e) return false;
          if ("keydown" !== e.type) return false;
          var t = e.timeStamp || -new Date().getTime(),
            i =
              u.translateCode(e.code) ||
              u.translateKey(e.which || e.keyCode, e.location);
          if (this._checkTimeStamp(t))
            return (
              this._keyDownHandled == i &&
                (e.preventDefault(), e.stopPropagation()),
              this._lastResult
            );
          (this._lastTimeStamp = t),
            (this._lastResult = false),
            this._editor.requestInvalidation();
          var n = e.shiftKey,
            r = e.ctrlKey && !e.altKey;
          e.keyIdentifier;
          return this._handleKey(i, n, r)
            ? (e.preventDefault(),
              e.stopPropagation(),
              (this._lastResult = true),
              (this._keyDownHandled = i),
              !0)
            : !!this._canHandleInput(i, n, r) && ((this._lastResult = true), !0);
        }

GInlineTextEditor.prototype._convertToObjectSpace = function (e) {
          var t = this._editor.getElement().getTransform(),
            i = this._view.getWorldTransform(
              this._view.getScene().getActivePage()
            );
          t && (i = i.preMultiplied(t));
          var n = this._editor.getElement().getTLCore();
          if (n && n.getTransformer()) {
            var r = (i.invertible() && i.inverted().mapPoint(e)) || new l(),
              o = n.getRenderBounds();
            return (
              (r = r.translated(o.getX(), o.getY())),
              n.getTransformer().inverseTransform(r)
            );
          }
          return i.invertible() ? i.inverted().mapPoint(e) : new l();
        }

GInlineTextEditor.prototype.selectWordAtPosition = function (e) {
          var t = this._editor.getElement().getTLCore();
          if (t) {
            var i = this._convertToObjectSpace(e),
              n = t.byCoordinate(
                i.getX(),
                i.getY() - this._editor._getVerticalOffset()
              );
            (n = n.parent()) &&
              t.select(
                n.ordinal,
                n.ordinal + (n.word ? n.word.text.length : n.length)
              );
          }
        }

GInlineTextEditor.prototype._mouseDblClick = function (e) {
          this._textUnderMouse && this.selectWordAtPosition(e.client);
        }

GInlineTextEditor.prototype._mouseDown = function (e) {
          if (e.button === s.BUTTON_LEFT && this._textUnderMouse) {
            if (this._shiftKeyDown) {
              var t = this._editor.getElement().getTLCore();
              if ((this._view.setCursor(a.Text), t)) {
                var i = t.selectedRange().start,
                  n = this._convertToObjectSpace(e.client),
                  r = t.byCoordinate(
                    n.getX(),
                    n.getY() - this._editor._getVerticalOffset()
                  );
                return (
                  r &&
                    ((this._focusChar = r.ordinal),
                    i > r.ordinal
                      ? t.select(r.ordinal, i)
                      : t.select(i, r.ordinal)),
                  void (this._selectDragStart = i)
                );
              }
            }
            if (3 === e.clickCount) {
              if (!(t = this._editor.getElement().getTLCore())) return;
              var o = t.selectedRange();
              return (
                (o = o.doc.paragraphRange(o.start, o.end)),
                t.select(o.start, o.end),
                void (this._selectDragStart = o.start)
              );
            }
            this._selectDragStart = this.setCursor(e.client);
          }
        }

GInlineTextEditor.prototype.setCursor = function (e) {
          if (this._activated) {
            var t = this._editor.getElement().getTLCore();
            if (t) {
              var i = this._convertToObjectSpace(e),
                n = t.byCoordinate(
                  i.getX(),
                  i.getY() - this._editor._getVerticalOffset()
                );
              return (
                t.select(n.ordinal, n.ordinal),
                (this._keyboardX = null),
                n.ordinal
              );
            }
            return null;
          }
        }

GInlineTextEditor.prototype._mouseRelease = function (e) {
          this._updateTextArea(),
            (this._selectDragStart = null),
            (this._keyboardX = null);
        }

GInlineTextEditor.prototype._mouseMove = function (e) {
          var t = this._editor.getElement().getPaintBBox();
          if (t && !t.isEmpty()) {
            t = this._view
              .getWorldTransform(this._view.getScene().getActivePage())
              .mapRect(t);
            var i = h.pickDistance;
            t.expanded(i, i, i, i).containsPoint(e.client)
              ? (this._textUnderMouse = true)
              : (this._textUnderMouse = false);
          }
          if (
            (this._textUnderMouse && this._view.setCursor(a.Text),
            null !== this._selectDragStart)
          ) {
            var n = this._editor.getElement().getTLCore();
            if (n) {
              var r = this._convertToObjectSpace(e.client),
                o = n.byCoordinate(
                  r.getX(),
                  r.getY() - this._editor._getVerticalOffset()
                );
              o &&
                ((this._focusChar = o.ordinal),
                this._selectDragStart > o.ordinal
                  ? n.select(o.ordinal, this._selectDragStart)
                  : n.select(this._selectDragStart, o.ordinal));
            }
          }
        }

GInlineTextEditor.prototype.isSelectionHit = function (e) {
          var t = this._editor.getElement().getTLCore();
          if (!t) return false;
          var i = t.getSelection();
          if (i.start === i.end) return false;
          var n = this._convertToObjectSpace(e),
            r = t.byCoordinate(
              n.getX(),
              n.getY() - this._editor._getVerticalOffset()
            );
          return !!(i && r.ordinal >= i.start && r.ordinal <= i.end);
        }

GInlineTextEditor.prototype.toString = function () {
          return "[Object GInlineTextEditor]";
        }

module.exports = GInlineTextEditor;
