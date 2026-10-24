/**
 * GCutCopyAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GCutCopyAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GCutCopyAction.prototype._copyStyleToClipboard = function (e, t) {
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
      }

GCutCopyAction.prototype._isRestricted = function () {
        return (
          gDesigner.getActiveDocument().isCommercialProductFile() ||
          !gDesigner.getApplicationManager().isCopyPasteEnabled()
        );
      }

GCutCopyAction.prototype._filterSupportedCopyNodes = function () {
        let e =
          arguments.length > 0 && undefined !== arguments[0] ? arguments[0] : [];
        return e.filter(function (e) {
          return e instanceof o.GItem || e instanceof o.GLayer;
        });
      }

GCutCopyAction.prototype._parseTextSelectionToEventClipboard = function (e, t) {
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
      }

GCutCopyAction.prototype._buildExceptionsForSelection = function () {
        let e =
            arguments.length > 0 && undefined !== arguments[0] ? arguments[0] : [],
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
      }

GCutCopyAction.prototype._extractStylesFromSelection = function (e) {
        const t = [];
        for (let n = 0; n < e.length; n++) {
          const o = e[n];
          o.hasProperty("sref") &&
            o.getReferencedStyle() &&
            t.push(o.getReferencedStyle());
        }
        return t;
      }

GCutCopyAction.prototype._deleteCutSelection = function () {
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
      }

GCutCopyAction.prototype._copySelectionToClipboard = function (e) {
        let t =
          arguments.length > 1 && undefined !== arguments[1] ? arguments[1] : null;
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
      }

GCutCopyAction.prototype._isMouseOverContextStyleCopy = function () {
        const e = gDesigner.getActiveDocument(),
          t = gDesigner.getMouseOverContext(),
          n = e.getActiveStylesList();
        return t.context && (n.Fill || n.Border || n.Effect);
      }

GCutCopyAction.prototype._notifyMouseOverContextOfSuccessfulCopy = function () {
        const e = gDesigner.getMouseOverContext();
        e.contextCallback && e.contextCallback(e.prevEvt);
      }

GCutCopyAction.prototype._showError = function () {
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
      }

GCutCopyAction.prototype.toString = function () {
        return "[Object GCutCopyAction]";
      }

module.exports = GCutCopyAction;
