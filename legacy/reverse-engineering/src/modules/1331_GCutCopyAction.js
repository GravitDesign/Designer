/**
 * Webpack Module #1331
 * Type: class
 * Name: GCutCopyAction
 */

function (e, t, n) {
    "use strict";
    n(20), n(3), n(34), n(4), n(41);
    var o = n(1),
      i = n(53),
      a = n(15),
      r = n(10),
      s = n(40);
    const l = n(18),
      c = n(31),
      d = n(607),
      u = n(44);
    function p(e) {
      (this._isCut = e),
        document.addEventListener(
          this._isCut ? "cut" : "copy",
          this._documentCutOrCopyEvent.bind(this)
        ),
        document.addEventListener(
          this._isCut ? "beforecut" : "beforecopy",
          this._documentBeforeCutOrCopyEvent.bind(this)
        ),
        window.hasOwnProperty("ClipboardEvent") ||
          (this._cutCopyArea = $("<textArea></textArea>")
            .css({ position: "absolute", top: "-9999px", opacity: 0 })
            .prop("tabindex", -1)
            .appendTo($("body")));
    }
    o.GObject.inherit(p, c),
      (p.ID_COPY = "edit.copy"),
      (p.ID_CUT = "edit.cut"),
      (p.prototype._cutCopyArea = null),
      (p.prototype.getId = function () {
        return this._isCut ? p.ID_CUT : p.ID_COPY;
      }),
      (p.prototype.getTitle = function () {
        return new o.GLocaleKey(
          "GCutCopyAction",
          "title." + (this._isCut ? "cut" : "copy")
        );
      }),
      (p.prototype.getIcon = function () {
        return "gravit-icon-" + (this._isCut ? "cut" : "copy");
      }),
      (p.prototype.getCategory = function () {
        return l.CATEGORY_EDIT;
      }),
      (p.prototype.getGroup = function () {
        return "ccp";
      }),
      (p.prototype.getShortcut = function () {
        return this._isCut
          ? [a.GKey.Constant.META, "X"]
          : [a.GKey.Constant.META, "C"];
      }),
      (p.prototype.isEnabled = function () {
        return (
          gDesigner.getActiveDocument() &&
          !!gDesigner.getActiveDocument().getEditor().getSelection()
        );
      }),
      (p.prototype.executeFromShortcut = function () {
        return (
          this._isEditableElementFocused() ||
            (this._cutCopyArea && this._cutCopyArea.focus()),
          !1
        );
      }),
      (p.prototype.execute = function () {
        this._documentCutOrCopyEvent(null);
      }),
      (p.prototype._documentCutOrCopyEvent = function (e) {
        if (this._isBrowserHandleCopy(e)) return;
        e && e.preventDefault();
        const t = gDesigner.getActiveDocument(),
          n = t && t.getEditor();
        if (this._isMouseOverContextStyleCopy()) {
          const t = this._getActiveStyleMouseOverContextBased();
          this._copyStyleToClipboard(t, e),
            this._notifyMouseOverContextOfSuccessfulCopy();
        } else {
          let t = n && n.getSelection();
          this._copySelectionToClipboard(t, e);
        }
        this._isCut && n && this._deleteCutSelection(),
          this._cutCopyArea && this._focusOnActiveArea();
      }),
      (p.prototype._documentBeforeCutOrCopyEvent = function (e) {
        (document.activeElement &&
          $(document.activeElement).is(":editable") &&
          !gDesigner.isGravitIME(document.activeElement)) ||
          e.preventDefault();
      }),
      (p.prototype._focusOnActiveArea = function () {
        setTimeout(function () {
          const e = gDesigner.getWindows();
          e && e.getActiveWindow() && e.getActiveWindow().getView().focus();
        }, 1);
      }),
      (p.prototype._filterOutSelectionWithSameParent = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
        e = o.GNode.order(e.slice());
        let t = [];
        const n = function (e) {
          let n = !1;
          return (
            t.forEach((t) => {
              e.findParent((e) => {
                n = e === t;
              });
            }),
            n
          );
        };
        for (let o = 0; o < e.length; ++o) n(e[o]) || t.push(e[o]);
        return t;
      }),
      (p.prototype._isEditableElementFocused = function () {
        return !(
          !document.activeElement ||
          !$(document.activeElement).is(":editable") ||
          gDesigner.isGravitIME(document.activeElement)
        );
      }),
      (p.prototype._isBrowserHandleCopy = function (e) {
        return (
          (this._isEditableElementFocused() ||
            (e && $(e.target).is(":textSelectable"))) &&
          !$(document.activeElement).is("button") &&
          (!this._cutCopyArea ||
            document.activeElement !== this._cutCopyArea[0])
        );
      }),
      (p.prototype._getActiveStyleMouseOverContextBased = function () {
        const e = gDesigner.getActiveDocument(),
          t = gDesigner.getMouseOverContext(),
          n = e.getActiveStylesList();
        let o = null;
        return (
          t.context === d.FillPropertiesPanel
            ? (o = n.Fill)
            : t.context === d.BorderPropertiesPanel
            ? (o = n.Border)
            : t.context === d.EffectPropertiesPanel && (o = n.Effect),
          o
        );
      }),
      (p.prototype._serializeData = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        return o.GNode.serialize(e, {
          exceptions: t,
          copy: !0,
          copyIgnoreProperties: i.GEditorOptions.propertiesExcludedFromCopying,
        });
      }),
      (p.prototype._copyStyleToClipboard = function (e, t) {
        const n = this._serializeData([e]),
          i =
            '<gravit mimeType="' +
            o.GNode.MIME_TYPE +
            '">' +
            $("<div/>").text(n).html() +
            "</gravit>";
        t
          ? t.clipboardData.setData("text/xml", i)
          : gDesigner.setClipboardContent(o.GNode.MIME_TYPE, n);
      }),
      (p.prototype._isRestricted = function () {
        return (
          gDesigner.getActiveDocument().isCommercialProductFile() ||
          !gDesigner.getApplicationManager().isCopyPasteEnabled()
        );
      }),
      (p.prototype._filterSupportedCopyNodes = function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
        return e.filter(function (e) {
          return e instanceof o.GItem || e instanceof o.GLayer;
        });
      }),
      (p.prototype._parseTextSelectionToEventClipboard = function (e, t) {
        for (let n = 0; n < e.length; n++)
          if (e[n] instanceof o.GText) {
            let o,
              a = e[n];
            const r = a.getTLCore();
            if (r) {
              const t = i.GElementEditor.getEditor(a);
              o =
                t && 1 === e.length && t.isInlineEdit()
                  ? r.selectedRange().plainText()
                  : r.getDocumentRange().plainText();
            } else o = a.getContent();
            t.clipboardData.setData("text/plain", o);
            break;
          }
      }),
      (p.prototype._buildExceptionsForSelection = function () {
        let e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [],
          t = [];
        for (let n = 0; n < e.length; n++)
          t = t.concat(
            gDesigner
              .getActiveDocument()
              .getEditor()
              .getLinkedElementsInSelection(e[n], e)
          );
        return (
          r.HAS_ANNOTATIONS &&
            (t = t.concat(
              gDesigner
                .getActiveDocument()
                .getEditor()
                .getAnnotationsExceptions(e)
            )),
          t
        );
      }),
      (p.prototype._extractStylesFromSelection = function (e) {
        const t = [];
        for (let n = 0; n < e.length; n++) {
          const o = e[n];
          o.hasProperty("sref") &&
            o.getReferencedStyle() &&
            t.push(o.getReferencedStyle());
        }
        return t;
      }),
      (p.prototype._deleteCutSelection = function () {
        let e = o.GLocale.get(new o.GLocaleKey("text.cut-selection"));
        const t = gDesigner.getActiveDocument(),
          n = t && t.getEditor(),
          i = gDesigner.getMouseOverContext(),
          a = t.getActiveStylesList();
        n.beginTransaction();
        try {
          if (i.context && (a.Fill || a.Border || a.Effect)) {
            let t = null,
              r = null;
            const l = n.getSelection();
            i.context === d.FillPropertiesPanel
              ? ((t = a.Fill), (r = "fill"))
              : i.context === d.BorderPropertiesPanel
              ? ((t = a.Border), (r = "border"))
              : i.context === d.EffectPropertiesPanel &&
                ((t = a.Effect), (r = "effect")),
              (0, s.iterateEqualStyleLayers)(r, t, l, function (e) {
                e.getParent().removeChild(e);
              }),
              (e = o.GLocale.get(this.getTitle()));
          } else n.deleteSelection(!0);
        } finally {
          n.commitTransaction(e);
        }
      }),
      (p.prototype._copySelectionToClipboard = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
        const n = gDesigner.getActiveDocument();
        if (
          ((e = this._filterOutSelectionWithSameParent(e)),
          (e = this._filterSupportedCopyNodes(e)) && e.length)
        ) {
          const i = this._buildExceptionsForSelection(e),
            a = this._extractStylesFromSelection(e);
          e.push.apply(e, a),
            this._isRestricted() && (e = n.restrictElements(e));
          let r = this._serializeData(e, i);
          gDesigner.setClipboardContent(o.GNode.MIME_TYPE, r);
          const s = 1 === e.length && e[0];
          if (
            !(s && s.hasMixin(o.GNode.Properties) && s.getProperty("collab"))
          ) {
            const i =
              '<gravit mimeType="' +
              o.GNode.MIME_TYPE +
              '" restricted="' +
              (!!this._isRestricted() && n.getStorageItem().getId()) +
              '">' +
              $("<div/>").text(r).html() +
              "</gravit>";
            t
              ? (t.clipboardData.setData("text/xml", i),
                this._parseTextSelectionToEventClipboard(e, t))
              : gContainer.copyToClipboard(i).catch(() => {
                  this._showError();
                });
          }
        }
      }),
      (p.prototype._isMouseOverContextStyleCopy = function () {
        const e = gDesigner.getActiveDocument(),
          t = gDesigner.getMouseOverContext(),
          n = e.getActiveStylesList();
        return t.context && (n.Fill || n.Border || n.Effect);
      }),
      (p.prototype._notifyMouseOverContextOfSuccessfulCopy = function () {
        const e = gDesigner.getMouseOverContext();
        e.contextCallback && e.contextCallback(e.prevEvt);
      }),
      (p.prototype._showError = function () {
        const e = this._isCut
          ? o.GLocale.get(new o.GLocaleKey("GCutCopyAction", "title.cut"))
          : o.GLocale.get(new o.GLocaleKey("GCutCopyAction", "title.copy"));
        u.alert(
          o.GLocale.get(
            new o.GLocaleKey("GCutCopyAction", "text.security-issues")
          )
            .replace("%cutcopy", e)
            .replace("%shortcut", a.GKey.shortcutToString(this.getShortcut()))
        );
      }),
      (p.prototype.toString = function () {
        return "[Object GCutCopyAction]";
      }),
      (e.exports = p);
  }