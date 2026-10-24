/**
 * Webpack Module #1535
 * Type: class
 * Name: GAnnotations
 */

function (e, t, n) {
    "use strict";
    n(58), n(3), n(71), n(4), n(41), n(13), n(32), n(97), n(33);
    var o = n(53),
      i = n(1),
      a = n(15),
      r = n(449),
      s = n(566),
      l = n(123);
    const c = n(358),
      d = n(86),
      { SHOW_SIDEBAR_BADGE: u } = n(10);
    function p() {
      this._elements = [];
    }
    i.GObject.inherit(p, l),
      (p.prototype._panel = null),
      (p.prototype._toolbar = null),
      (p.prototype._document = null),
      (p.prototype._elements = null),
      (p.prototype.init = function (e, t, n, o, a, r) {
        (this._panel = e),
          (this._toolbar = t),
          this._addListPanel(e, n, o, a, r),
          t.append(
            $("<label>")
              .addClass("annotation-panel-label")
              .text(
                i.GLocale.get(new i.GLocaleKey("GAnnotations", "text.page"))
              )
          );
      }),
      (p.prototype._addListPanel = function (e, t, n, o, s) {
        var l = $("<div></div>").addClass("annotations-container").appendTo(e);
        this._annotationPanel ||
          ((this._annotationPanel = $("<div></div>")
            .addClass("annotations")
            .on(
              "mouseenter",
              function () {
                var e = this._document.getScene();
                e &&
                  e.acceptChildren(function (e) {
                    return (
                      e.hasFlag(i.GNode.Flag.Highlighted) &&
                        e.removeFlag(i.GNode.Flag.Highlighted),
                      !0
                    );
                  }),
                  this._annotationPanel.gAnnotationPanel(
                    "setBlockHighlight",
                    !0
                  );
              }.bind(this)
            )
            .on(
              "mouseleave",
              function () {
                this._annotationPanel.gAnnotationPanel("setBlockHighlight", !1);
              }.bind(this)
            )
            .on(
              "click",
              function () {
                this._document.getEditor().clearSelection();
                var e = this._document.getScene();
                e && e.setActiveLayer(null),
                  a.GPlatform.modifiers.optionKey &&
                    gDesigner.executeAction(r.ID, void 0, "outlinesidebar");
              }.bind(this)
            )
            .on("dragover", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on("dragenter", function (e) {
              e.preventDefault(), e.stopPropagation();
            })
            .on(
              "drop",
              function (e) {
                e.preventDefault(), e.stopPropagation();
              }.bind(this)
            )
            .appendTo(l)),
          this._annotationPanel.gAnnotationPanel({
            clickCallback: this._clickTreeNodeCallback.bind(this),
            updateCommentCount: this._updateCommentCount.bind(this),
            showResolved: n,
            updateSidebar: o,
            updateAnnotationCache: s,
            sidebarActive: t,
          }),
          (window.refreshannot = () =>
            this._annotationPanel.gAnnotationPanel("refresh")),
          (window.relayoutannot = () =>
            this._annotationPanel.gAnnotationPanel("relayout")));
      }),
      (p.prototype.relayout = function (e) {
        this._annotationPanel &&
          this._annotationPanel.gAnnotationPanel("relayout", e);
      }),
      (p.prototype.isAddingAnnotation = function () {
        return this._annotationPanel.gAnnotationPanel(
          "isEditingOrAddingContent"
        );
      }),
      (p.prototype.toggleShowResolved = function (e) {
        this._annotationPanel.gAnnotationPanel("showResolved", e);
      }),
      (p.prototype.setPage = function (e) {
        this._annotationPanel.gAnnotationPanel("page", e),
          e && this._setAnnotationLabel(e.getProperty("name"));
      }),
      (p.prototype._setAnnotationLabel = function (e) {
        this._toolbar.find(".annotation-panel-label").text(e);
      }),
      (p.prototype._updateCommentCount = function (e, t) {
        var n = this._toolbar.find(".g-badge");
        u && e > 0
          ? (0 === n.length &&
              ((n = $("<span/>").addClass("g-badge comment-count")),
              this._toolbar.append(n)),
            t > 0 ? n.addClass("unread") : n.removeClass("unread"),
            n.text(e))
          : n.remove();
      }),
      (p.prototype.getPage = function () {
        return this._annotationPanel.gAnnotationPanel("page");
      }),
      (p.prototype.setAnnotations = function (e) {
        return this._annotationPanel.gAnnotationPanel("annotations", e);
      }),
      (p.prototype.setDelayedSyncCallback = function (e) {
        this._annotationPanel.gAnnotationPanel("setDelayedSyncCallback", e);
      }),
      (p.prototype._clickTreeNodeCallback = function (e) {
        if (
          (e instanceof i.GComment && (e = e.getParent()),
          e && !e.hasFlag(i.GNode.Flag.Selected))
        ) {
          this._document.getScene().updateActivePageForElem(e),
            this._document.getScene().updateActiveLayerForElem(e);
          var t = this._document.getEditor(),
            n = !1;
          if (
            (jQuery(
              gDesigner
                .getWindows()
                .getActiveWindow()
                .getView()
                .getHtmlElement()
            )
              .find("> div[tabindex=0]")
              .focus(),
            a.GPlatform.modifiers.metaKey ||
              (!e.hasFlag(i.GNode.Flag.Selected) &&
                !e.hasFlag(i.GElement.Flag.FullLocked) &&
                !a.GPlatform.modifiers.shiftKey))
          ) {
            let o = [e];
            if (e.hasMixin(i.GAnnotation.Linkable)) {
              let t = e.getAnnotableReferences();
              t &&
                ((t = t.filter((e) => !e.hasFlag(i.GNode.Flag.Selected))),
                t.length &&
                  ((o = o.concat(t)),
                  this._document.getScene().updateActivePageForElem(t[0])));
            }
            t.updateSelection(a.GPlatform.modifiers.metaKey, o), (n = !0);
          }
          if (n && a.GPlatform.modifiers.optionKey)
            t.hasSelection()
              ? gDesigner.executeAction(s.ID, void 0, "outlinesidebar")
              : gDesigner.executeAction(r.ID, void 0, "outlinesidebar");
          else if (n) {
            let t;
            if (e.hasMixin(i.GAnnotation.Linkable)) {
              const n = e.getAnnotableReferences();
              n &&
                n.length &&
                n.forEach((e) => {
                  if (e instanceof i.GElement) {
                    const n = e.getPaintBBox();
                    n && !n.isEmpty() && (t = t ? t.united(n) : n);
                  }
                });
            } else e instanceof i.GElement && (t = e.getPaintBBox());
            const n = this._document && this._document.getActiveWindow();
            n && n.scrollIntoView(t);
          }
        }
      }),
      (p.prototype._selectionChangedEvent = function () {
        const e = this._document && this._document.getEditor(),
          t = e && e.getSelection();
        if (t && t.length) {
          t.filter((e) => e.hasMixin(i.GAnnotable)).forEach((e) => {
            const t = e.getLinkedAnnotations();
            t &&
              t.forEach((e) => {
                e.hasFlag(i.GNode.Flag.Selected) ||
                  e.setFlag(i.GNode.Flag.Selected);
              });
          });
        }
      }),
      (p.prototype._isSyncTransactionEvent = function (e) {
        return !(
          !(e.data && e.data.nodes && e.data.parent) ||
          (e.data.type !==
            o.GAnnotationEditor.TransactionType.RemoveAnnotation &&
            e.data.type !== o.GAnnotationEditor.TransactionType.AddAnnotation)
        );
      }),
      (p.prototype._handleModifiedEvent = function (e) {
        if (this._isSyncTransactionEvent(e)) {
          const n = e.data.evtType === o.GEditor.ModifiedEvent.Type.Undo,
            i = e.data.evtType === o.GEditor.ModifiedEvent.Type.Redo,
            a =
              e.data.type ===
              o.GAnnotationEditor.TransactionType.RemoveAnnotation,
            r =
              e.data.type === o.GAnnotationEditor.TransactionType.AddAnnotation,
            s = !!this._document.getAnnotationsId(),
            l = (n && a) || (n && r) || (i && r),
            d = i && a;
          let u;
          if (s && l)
            (u = c.filterAnnotationElements(e.data.nodes)),
              u.length &&
                u.forEach((t) => {
                  c.removeSidFromAnnotations(t),
                    t.getParent() || e.data.parent.insertChild(t);
                });
          else if (s && d) {
            var t = e.data.parent.getChildren();
            (u = c
              .filterAnnotationElements(e.data.nodes)
              .filter((e) => t.some((t) => t.getId() === e.getId()))),
              u.length && c.removeAnnotations(u, e.data.parent, void 0, !1);
          }
        }
      }),
      (p.prototype.update = function (e, t, n) {
        if (
          (n && this._annotationPanel.gAnnotationPanel("cleanEmptyAnnotations"),
          this._document &&
            (this._document
              .getScene()
              .removeEventListener(
                i.GElement.GeometryChangeEvent,
                this._geometryChange,
                this
              ),
            this._document
              .getScene()
              .removeEventListener(
                i.GNode.AfterPropertiesChangeEvent,
                this._afterPropertiesChange,
                this
              ),
            this._document
              .getEditor()
              .removeEventListener(
                o.GEditor.EdGeometryChangeEvent,
                this._edGeometryChange,
                this
              ),
            this._document
              .getEditor()
              .removeEventListener(
                o.GEditor.ModifiedEvent,
                this._handleModifiedEvent,
                this
              ),
            this._document
              .getEditor()
              .removeEventListener(
                o.GEditor.SelectionChangedEvent,
                this._selectionChangedEvent,
                this
              ),
            (this._document = null)),
          (this._elements = []),
          e)
        ) {
          for (var a = 0; a < t.length; ++a) this._elements.push(t[a]);
          if (this._elements.length === t.length) {
            if (((this._document = e), this._elements.length))
              return (
                this._document
                  .getScene()
                  .addEventListener(
                    i.GNode.AfterPropertiesChangeEvent,
                    this._afterPropertiesChange,
                    this
                  ),
                this._document
                  .getScene()
                  .addEventListener(
                    i.GElement.GeometryChangeEvent,
                    this._geometryChange,
                    this
                  ),
                this._document
                  .getEditor()
                  .addEventListener(
                    o.GEditor.EdGeometryChangeEvent,
                    this._edGeometryChange,
                    this
                  ),
                this._document
                  .getEditor()
                  .addEventListener(
                    o.GEditor.SelectionChangedEvent,
                    this._selectionChangedEvent,
                    this
                  ),
                this._document
                  .getEditor()
                  .addEventListener(
                    o.GEditor.ModifiedEvent,
                    this._handleModifiedEvent,
                    this
                  ),
                this._updateDimensions(),
                this._updateToolbar(),
                (this._document.getStatus() !== d.Ready &&
                  this._document.getStatus() !== d.Loaded) ||
                  !this._document.getActiveWindow() ||
                  this._document
                    .getActiveWindow()
                    .getView()
                    .invalidate(null, !0),
                !0
              );
            this._document
              .getEditor()
              .addEventListener(
                o.GEditor.ModifiedEvent,
                this._handleModifiedEvent,
                this
              );
          }
        } else this.setPage(null);
        return !1;
      }),
      (p.prototype._afterPropertiesChange = function (e) {
        e.node === this.getPage() &&
          e.properties.includes("name") &&
          this._setAnnotationLabel(e.node.getProperty("name"));
      }),
      (p.prototype._geometryChange = function (e) {
        (e.type !== i.GElement.GeometryChangeEvent.Type.After &&
          e.type !== i.GElement.GeometryChangeEvent.Type.Child) ||
          (this._elements.indexOf(e.element) >= 0 && this._updateDimensions());
      }),
      (p.prototype._edGeometryChange = function () {
        this._updateDimensions(!1, !0);
      }),
      (p.prototype._updateDimensions = function () {}),
      (p.prototype._updateToolbar = function () {
        this._toolbar.find("[data-action]").each(
          function (e, t) {
            var n = $(t);
            n.prop(
              "disabled",
              !gDesigner.canExecuteAction(n.attr("data-action"))
            );
          }.bind(this)
        );
      }),
      (p.prototype.toString = function () {
        return "[Object GAnnotations]";
      }),
      (e.exports = p);
  }