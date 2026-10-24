/**
 * Webpack Module #1712
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(8),
      n(20),
      n(107),
      n(71),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(97),
      n(1175),
      n(33),
      n(26);
    var i = n(53),
      a = n(1),
      r = n(882),
      s = n(10),
      l = o(n(1354));
    const c = n(44),
      d = n(358),
      u = n(1355),
      p = n(1713),
      g = n(1357),
      h = n(1356),
      f = n(1279),
      m = n(177),
      y = ["text"];
    function v() {}
    function _(e) {
      var t = $(this).data("gannotationpanel");
      if (t.options.clickCallback) {
        var n = x.call(this, e.id);
        t.options.clickCallback(n);
      }
    }
    function b(e) {
      x.call(this, e.id) && e.expanded;
    }
    function w(e, t) {
      var n = $(this).data("gannotationpanel");
      if (n.options.renderer) return n.options.renderer(e.id, e.virtualNode, t);
    }
    function C(e) {
      var t = $(this);
      e.id === u.COLLAPSE_ID
        ? $(e).addClass(t.data("gannotationpanel").options.collapseStyle)
        : e.id === u.EXPAND_ID &&
          $(e).addClass(t.data("gannotationpanel").options.expandStyle);
    }
    function x(e) {
      var t = $(this).data("gannotationpanel").annotTreeNodeMap[e];
      return t ? t.annot : null;
    }
    function S(e) {
      return $(this).data("gannotationpanel").annotTreeNodeMap[e];
    }
    function E(e) {
      var t = $(this).data("gannotationpanel").annotTreeNodeMapByNodes.get(e);
      return t ? t.treeId : null;
    }
    function A(e) {
      var t = $(this).data("gannotationpanel").annotTreeNodeMapByNodes.get(e);
      return t ? t.treeNode : null;
    }
    function T(e) {
      var t = $(this).data("gannotationpanel").annotTreeNodeMap,
        n = $(this).data("gannotationpanel").annotTreeNodeMapByNodes;
      e.accept(
        function (e) {
          var o = n.get(e);
          o && (n.delete(e), (t[o.treeId] = null));
        }.bind(this)
      );
    }
    function G(e) {
      var t = $(this).data("gannotationpanel"),
        n = [];
      if (t.annotTreeNodeMap)
        for (var o in (e instanceof a.GComment &&
          n.push(E.call(this, e.getParent())),
        t.annotTreeNodeMap))
          t.annotTreeNodeMap[o] &&
            t.annotTreeNodeMap[o].annot &&
            (t.annotTreeNodeMap[o].annot === e ||
              (t.annotTreeNodeMap[o].annot instanceof a.GComment &&
                t.annotTreeNodeMap[o].annot.getParent() === e)) &&
            n.push(o);
      return n;
    }
    function P() {
      return (
        !!gDesigner.getApplicationManager().isCommentingEditingEnabled() ||
        (c.alert(
          a.GLocale.get(
            new a.GLocaleKey(
              "GAnnotationPanel",
              "text.document-approved-no-annotations-update"
            )
          )
        ),
        !1)
      );
    }
    function D() {
      const e = $(this).data("gannotationpanel");
      if (e && e.syncCallback)
        try {
          e.syncCallback();
        } finally {
          e.syncCallback = null;
        }
    }
    function L(e, t, n) {
      const o = gDesigner.getApplicationManager().isCommentingEditingEnabled();
      var r = $(this).data("gannotationpanel"),
        s = S.call(this, e),
        l = s ? s.annot : null,
        u = null;
      if (l) {
        var p = !1,
          f = $(n);
        if (
          (f.attr("draggable", !1),
          l.hasMixin(a.GAnnotation)
            ? f.addClass("parent")
            : f.addClass("child"),
          !r.showResolved &&
            ((l.hasMixin(a.GAnnotation) && l.getProperty("rsv")) ||
              (l instanceof a.GComment && l.getParent().getProperty("rsv"))))
        )
          return void f.css("display", "none");
        if (
          (f.hover(
            () =>
              G.call(this, l).forEach((e) =>
                $("#".concat(e)).addClass("on-hover")
              ),
            () =>
              G.call(this, l).forEach((e) =>
                $("#".concat(e)).removeClass("on-hover")
              )
          ),
          !(l.hasMixin(a.GAnnotation) ? l : l.getParent()).hasFlag(
            a.GNode.Flag.Selected
          ) &&
            ((l.hasMixin(a.GAnnotation) && !B(l).length) || U(l)) &&
            (p = !0),
          !r.blockHighlight)
        ) {
          var m = l.hasFlag(a.GNode.Flag.Highlighted);
          !m &&
            l.hasMixin(a.GNode.Container) &&
            (m = l.acceptChildren(
              function (e) {
                return e.hasFlag(a.GNode.Flag.Highlighted);
              },
              !1,
              !0
            )),
            $(f).toggleClass("g-highlighted-row", m);
        }
        var y = k.call(this, l),
          v = S.call(this, y);
        void 0 === v.expanded && (v.expanded = !0);
        var _ = gDesigner.getActiveDocument();
        _ &&
          l.getId() === _.getFocusAnnotationId() &&
          !_.isAnnotationFocused() &&
          (_.getScene().updateActivePageForElem(v.annot),
          _.getScene().updateActiveLayerForElem(v.annot),
          _.setAnnotationFocused(),
          (v.expanded = !0),
          v.annot.setFlag(a.GNode.Flag.Selected));
        var b = O.call(this, l);
        l.hasMixin(a.GAnnotation) && (u = I.call(this, l, r.showResolved));
        var w = new h({
          isCommentingEditingEnable: o,
          container: f,
          annotation: l,
          relatedNodesCount: b,
          sidebarActive: r.sidebarActive,
          isLastRow: p,
          hasResolveAccess: r.vtree.hasResolveAccess(),
          hasReopenAccess: r.vtree.hasReopenAccess(),
          mentionData: r.vtree.getMentionData(),
          onMouseEnter: () => {
            l.hasMixin(a.GAnnotation) &&
              !l.hasFlag(a.GAnnotation.Flag.Hidden) &&
              l.setFlag(a.GNode.Flag.Highlighted);
          },
          onMouseLeave: () => {
            l.hasMixin(a.GAnnotation) &&
              !l.hasFlag(a.GAnnotation.Flag.Hidden) &&
              l.removeFlag(a.GNode.Flag.Highlighted);
          },
          onChange: (e) => {
            P() &&
              (l.getProperty("text") === e
                ? D.call(this)
                : i.GEditor.tryRunTransaction(
                    l,
                    function () {
                      l.setProperty("text", e);
                    },
                    a.GLocale.get(
                      new a.GLocaleKey("GAnnotationPanel", "text.edit-comment")
                    )
                  ));
          },
          onToggleState: () => {
            P() &&
              (i.GEditor.tryRunTransaction(
                l,
                function () {
                  r.showResolved ||
                    l.getProperty("rsv") ||
                    !l.hasFlag(a.GNode.Flag.Selected) ||
                    l.removeFlag(a.GNode.Flag.Selected),
                    l.setProperty("rsv", !l.getProperty("rsv"));
                },
                l.getProperty("rsv")
                  ? a.GLocale.get(
                      new a.GLocaleKey("GAnnotationPanel", "text.reopen")
                    )
                  : a.GLocale.get(
                      new a.GLocaleKey("GAnnotationPanel", "text.resolve")
                    )
              ),
              ne.call(this),
              te.call(this));
          },
          onResolve: () => {
            P() &&
              (i.GEditor.tryRunTransaction(
                l,
                function () {
                  !r.showResolved &&
                    l.hasFlag(a.GNode.Flag.Selected) &&
                    l.removeFlag(a.GNode.Flag.Selected),
                    l.setProperty("rsv", !0);
                },
                a.GLocale.get(
                  new a.GLocaleKey("GAnnotationPanel", "text.resolve")
                )
              ),
              ne.call(this),
              te.call(this));
          },
          onReopen: () => {
            P() &&
              (i.GEditor.tryRunTransaction(
                l,
                function () {
                  l.setProperty("rsv", !1);
                },
                a.GLocale.get(
                  new a.GLocaleKey("GAnnotationPanel", "text.reopen")
                )
              ),
              ne.call(this),
              te.call(this));
          },
          onDelete: () => {
            P() &&
              c.confirm(
                a.GLocale.get(
                  new a.GLocaleKey("GAnnotationPanel", "text.confirm-remove")
                ),
                (e) => {
                  e &&
                    d.removeAnnotations(
                      [l],
                      l.getParent(),
                      a.GLocale.get(
                        new a.GLocaleKey(
                          "GAnnotationPanel",
                          "text.remove-".concat(
                            l.hasMixin(a.GAnnotation) ? "annotation" : "comment"
                          )
                        )
                      )
                    );
                },
                null,
                null,
                null,
                !0,
                !0
              );
          },
          onCancel: () => {
            D.call(this);
          },
          onExpandClick: (t) => {
            t.stopPropagation(), (v.expanded = !v.expanded);
            var n = S.call(this, e);
            try {
              n.component.setCollapseState(v.expanded);
            } catch (e) {
              "function" == typeof gdb_showScene &&
                console.error("REPAIR THIS! component is NULL!");
            }
            var o = n.annot;
            G.call(this, o).forEach((e, t) => {
              if (t > 0) {
                var n = S.call(this, e);
                try {
                  n.component.setVisiblity(v.expanded);
                } catch (e) {
                  "function" == typeof gdb_showScene &&
                    console.error("REPAIR THIS! component is NULL!");
                }
              }
            });
          },
          onCopyPermalinkClick: async (e) => {
            const t = gDesigner.getActiveDocument();
            if (t) {
              const n = await gDesigner.getShareManager().getPermalink(t, e);
              n && gContainer.copyToClipboard(n);
            }
          },
          onAssignTo: (e) => {
            l.hasMixin(a.GAnnotation)
              ? l.setProperty("asgn", e)
              : l.getParent() &&
                l.getParent().hasMixin(a.GAnnotation) &&
                l.getParent().setProperty("asgn", e);
          },
          mainAnnotObject: v,
        });
        (s.element = f), (s.component = w), r.vtree.addChild(w);
      } else if (s && s.replyAnnot) {
        let e = $(n);
        if (
          (e.addClass("last-row"),
          !o ||
            !s.replyAnnot.hasFlag(a.GNode.Flag.Selected) ||
            s.replyAnnot.getProperty("rsv") ||
            (!r.showResolved && s.replyAnnot.getProperty("rsv")))
        )
          return void e.hide();
        const t = !s.replyAnnot.isFillingCompleted(),
          l = (e) => {
            if (P() && (e.length || (t && s.replyAnnot.isEmptyTextAllowed()))) {
              let c = gDesigner.getSyncUser();
              if (d.canUpdate(c)) {
                const d = s.replyAnnot.getScene(),
                  u = d && i.GEditor.getEditor(d);
                let p, g;
                (p = t
                  ? a.GLocale.get(
                      new a.GLocaleKey(
                        "GAnnotationPanel",
                        "text.set-annotation-text"
                      )
                    )
                  : a.GLocale.get(
                      new a.GLocaleKey("GAnnotationPanel", "text.add-comment")
                    )),
                  u && u.beginTransaction();
                try {
                  if (t) {
                    s.replyAnnot.setProperty("text", e),
                      s.replyAnnot.setProperty("email", c.getAccountName()),
                      V.call(this, s.replyAnnot);
                    var n = a.GUtil.uuid(),
                      o = A.call(this, s.replyAnnot),
                      l = {
                        element: null,
                        annot: null,
                        treeNode: M.call(this, n, o, !0, !0),
                        replyAnnot: s.replyAnnot,
                        treeId: n,
                      };
                    (r.annotTreeNodeMap[n] = l),
                      r.replyNodes.set(s.replyAnnot, l);
                  } else {
                    V.call(this, s.replyAnnot);
                    const t = s.replyAnnot.addComment(
                      e,
                      c.getUID(),
                      i.GEditorOptions.userConfig.userName,
                      c.avatar,
                      c.getAccountName()
                    );
                    g = i.GAnnotationEditor.createAddAnnotationTransactionData(
                      [t],
                      s.replyAnnot
                    );
                  }
                  ne.call(this), te.call(this);
                } catch (e) {
                  console.log(e);
                } finally {
                  u && u.commitTransaction(p, g);
                }
              }
              H(this, s.replyAnnot);
            }
          },
          c = () => {
            H(this, s.replyAnnot), D.call(this);
          },
          u = (e) => {
            s.replyAnnot.setProperty("asgn", e);
          };
        var C = new g({
            container: e,
            annotation: s.replyAnnot,
            onSubmit: l,
            onCancel: c,
            onAssignTo: u,
            mentionData: r.vtree.getMentionData(),
          }),
          x = r.annotTreeNodeMapByNodes.get(s.replyAnnot);
        (s.reply = C), r.vtree.addChild(C), x && (x.reply = C);
      }
      return u;
    }
    function I(e, t) {
      let n = e.getProperty("asgn");
      if (!(n || []).length) return;
      var o = e.getProperty("rsv");
      let s = $("<div/>")
          .addClass("already-assigned-user-row")
          .appendTo($(this)),
        l = $("<span/>").addClass("assigned-content-group").appendTo(s);
      return (
        (0, r.getCollabInfo)(n[0]).then(async (n) => {
          let r = new m(n).getFullUserName();
          $("<span/>")
            .addClass("assign-to-text")
            .html(
              a.GLocale.get(
                new a.GLocaleKey("GAnnotationPanel", "text.assigned-to")
              ) +
                (n && n.name
                  ? r
                  : a.GLocale.get(
                      new a.GLocaleKey("GCommonNames", "text.unknown-user")
                    ))
            )
            .appendTo(l);
          const s = !o;
          ((await s) ? d.canResolveAnnotation(e) : d.canReopenAnnotation(e)) &&
            $("<span/>")
              .addClass("assigned-action-group")
              .append(
                $("<span/>")
                  .addClass(
                    "icon " +
                      (s ? "gravit-icon-resolve" : "gravit-icon-resolved")
                  )
                  .addClass("assigned-icon-resolve")
                  .addClass("assigned-resolve-action")
                  .attr(
                    "data-title",
                    s
                      ? a.GLocale.get(
                          new a.GLocaleKey(
                            "GAnnotationPanel",
                            "text.assign-resolve"
                          )
                        )
                      : a.GLocale.get(
                          new a.GLocaleKey("GAnnotationPanel", "text.reopen")
                        )
                  )
                  .on("click", () => {
                    P() &&
                      (s
                        ? i.GEditor.tryRunTransaction(
                            e,
                            function () {
                              !t &&
                                e.hasFlag(a.GNode.Flag.Selected) &&
                                e.removeFlag(a.GNode.Flag.Selected),
                                e.setProperty("rsv", !0);
                            },
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GAnnotationPanel",
                                "text.resolve"
                              )
                            )
                          )
                        : i.GEditor.tryRunTransaction(
                            e,
                            function () {
                              e.setProperty("rsv", !1);
                            },
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GAnnotationPanel",
                                "text.reopen"
                              )
                            )
                          ),
                      ne.call(this),
                      te.call(this));
                  })
              )
              .appendTo(l);
        }),
        s
      );
    }
    function k(e) {
      return G.call($(this), e)[0];
    }
    function O(e) {
      return G.call($(this), e).length;
    }
    function F(e, t, n) {
      var o = new u.GSimpleTreeNodeNamed(e);
      return (
        n && (o.virtualNode = !0),
        $(this).data("gannotationpanel").vtree.insertNodeAfter(t, o),
        o
      );
    }
    function R(e, t, n) {
      var o = new u.GSimpleTreeNodeNamed(e);
      return (
        n && (o.virtualNode = !0),
        $(this).data("gannotationpanel").vtree.insertNodeBefore(t, o),
        o
      );
    }
    function M(e, t, n, o) {
      var i = new u.GSimpleTreeNodeNamed(e);
      return (
        n && (i.virtualNode = !0),
        $(this).data("gannotationpanel").vtree.appendNode(t, i, o),
        i
      );
    }
    function N(e) {
      $(this).data("gannotationpanel").vtree.removeNode(e);
    }
    function B(e) {
      return e
        .getChildren()
        .filter((e) => e instanceof a.GComment && !e.getProperty("rmd"));
    }
    function U(e) {
      if (!(e instanceof a.GComment)) return !1;
      for (var t = !0, n = e.getNext(); n; ) {
        if (n instanceof a.GComment && !n.getProperty("rmd")) {
          t = !1;
          break;
        }
        n = n.getNext();
      }
      return t;
    }
    function j(e) {
      var t = gDesigner.getSyncUser();
      t && e.getProperty("uid") && d.isOwner(t, e)
        ? (e.$plkt = null)
        : (e.$plkt =
            a.GBlock.ProgramLck.NoSizeChanges |
            a.GBlock.ProgramLck.NoMove |
            a.GBlock.ProgramLck.NoDelete);
    }
    function K(e, t, n) {
      var o = a.GUtil.uuid(),
        i = $(this).data("gannotationpanel"),
        r = i.vtree;
      if (
        t ||
        !e.getParent() ||
        e.getParent() instanceof a.GAnnotationsList ||
        E.call(this, e.getParent())
      ) {
        var s;
        if ((r.beginUpdate(), e.hasMixin(a.GAnnotation))) {
          V.call(this, e);
          var l = (function (e) {
              for (var t = null, n = e; !t && n.getPrevious(); )
                n.getPrevious().getProperty("rmd")
                  ? (n = n.getPrevious())
                  : (t = n.getPrevious());
              return t;
            })(e),
            c = l ? A.call(this, l) : null;
          s = c ? R.call(this, o, c, !1) : M.call(this, o, null, !1);
        } else {
          var d = e.getParent();
          V.call(this, d);
          var u = A.call(this, d);
          s = M.call(this, o, u, !1, !0);
        }
        var p = { element: null, annot: e, treeNode: s, treeId: o };
        if (
          ((i.annotTreeNodeMap[o] = p),
          i.annotTreeNodeMapByNodes.set(e, p),
          e.hasMixin(a.GAnnotation))
        ) {
          for (var g = e.getFirstChild(); null !== g; g = g.getNext())
            g instanceof a.GComment &&
              !g.getProperty("rmd") &&
              K.call(this, g, t);
          if (!B(e).length) {
            var h = a.GUtil.uuid(),
              f = {
                element: null,
                annot: null,
                treeNode: e.isFillingCompleted()
                  ? M.call(this, h, s, !0, !0)
                  : F.call(this, h, s, !0),
                replyAnnot: e,
                treeId: h,
              };
            (i.annotTreeNodeMap[h] = f), i.replyNodes.set(e, f);
          }
          j(e);
        } else if (e instanceof a.GComment && U(e)) {
          let t,
            n = a.GUtil.uuid();
          t = F.call(this, n, s, !0);
          var m = e.getParent();
          let o = {
            element: null,
            annot: null,
            treeNode: t,
            replyAnnot: m,
            treeId: n,
          };
          (i.annotTreeNodeMap[n] = o), i.replyNodes.set(m, o);
        }
        r.endUpdate(n);
      }
    }
    function V(e) {
      var t = $(this).data("gannotationpanel").replyNodes,
        n = t.get(e);
      return (
        n &&
          (N.call(this, n.treeNode),
          t.delete(e),
          ($(this).data("gannotationpanel").annotTreeNodeMap[n.treeNode.id] =
            null)),
        n
      );
    }
    function H(e, t) {
      if (t)
        !t.getParent() ||
          t.getProperty("rmd") ||
          t.isFillingCompleted() ||
          d.removeAnnotations(
            [t],
            t.getParent(),
            a.GLocale.get(
              new a.GLocaleKey(
                "GAnnotationPanel",
                "text.remove-empty-annotation"
              )
            )
          );
      else {
        var n = gDesigner.getActiveDocument();
        if (n) {
          var o = n.getEditor().getSelection();
          o &&
            o.map((t) => {
              t.hasMixin(a.GAnnotation) && H(e, t);
            });
        }
      }
    }
    function W(e, t) {
      var n = e.data("gannotationpanel").annotTreeNodeMapByNodes.get(t);
      n &&
        n.component &&
        (n.component.cancelEditMode(), n.reply && n.reply.hide());
    }
    function z(e) {
      var t = A.call(this, e);
      t &&
        (N.call(this, t),
        T.call(this, e),
        V.call(this, e),
        oe.requestInvalidation.call(this));
    }
    function q(e, t) {
      return !e.blockHandlers || !(!e.ignoreBlock || e.ignoreBlock !== t);
    }
    function Y() {
      return !(
        !$(this)
          .find(".annotations-buttonrow")
          .toArray()
          .some((e) => "none" !== $(e).css("display")) &&
        !$(this).find(".g-edit-mode").length
      );
    }
    function X(e, t) {
      let n = $(this).data("gannotationpanel"),
        o = !1;
      const i = {};
      if (!n) return;
      if (n.blockAnnotationsUpdate) return;
      if (null !== n.scheduledUpdate)
        return void (n.updateInProgress && (n.scheduleNextUpdate = !0));
      if (
        e &&
        e.node &&
        e.node.recordedTransaction &&
        ((o = !0),
        e.properties && e.values && e.properties.length === e.values.length)
      )
        for (var r = 0, s = e.values.length; r < s; r++)
          i[e.properties[r]] = e.values[r];
      if (e && e.node) {
        if (e.custom) return;
        if (
          e.node.hasMixin(a.GAnnotation) &&
          e.node.isPropertiesIgnorable(e.properties)
        )
          return;
      }
      let l = gDesigner.getActiveDocument();
      l &&
        l.getAnnotationsId() &&
        (n.scheduledUpdate = setTimeout(() => {
          let e = $(this).data("gannotationpanel");
          if (!e) return;
          if (Y.call(this) || e.vtree.isPendingInvalidation())
            return (e.scheduledUpdate = null), void X.call(this);
          console.log("updating annotations"), (e.updateInProgress = !0);
          let n = e.page.getAnnotations();
          d.updateAndReturnCloudAnnotationsForDocument(
            l,
            a.GNode.store(n, { recordedTransaction: o, recordedProperties: i })
          )
            .then((e) => {
              let n = e.annotationsCollection,
                r = !1,
                s = $(this).data("gannotationpanel");
              if (!s) return r;
              if (!s.updateInProgress) return r;
              if (
                (Y.call(this) && (s.scheduleNextUpdate = !0),
                (s.updateInProgress = !1),
                !s.scheduleNextUpdate)
              ) {
                let e = d.findAnnotationsListForPage(s.page, n);
                if (e) {
                  let n = a.GNode.restore(e),
                    l = n.getChildren();
                  n.clearChildren(), s.vtree.beginUpdate();
                  let c = d.mergeAnnotations(
                    s.page.getAnnotations(),
                    s.page.getAnnotations().getChildren(),
                    n,
                    l,
                    o ? i : void 0
                  );
                  (r = r || c),
                    s.vtree.endUpdate(t),
                    ne.call(this),
                    te.call(this);
                }
                e ||
                  (s.vtree.beginUpdate(),
                  s.page.getAnnotations().clearChildren(),
                  s.vtree.endUpdate(t),
                  ne.call(this)),
                  s.options.updateAnnotationCache(n);
              }
              if (
                ((s.scheduledUpdate = null),
                s.scheduleNextUpdate &&
                  ((s.scheduleNextUpdate = !1), X.call(this)),
                r)
              ) {
                let t = s.page.getScene();
                t &&
                  t.getLastTimeAnnotationsFromCloudModified() <
                    e.lastUpdateTime &&
                  t.setLastTimeAnnotationsFromCloudModified(e.lastUpdateTime),
                  gDesigner.notifyDocumentModified(l);
              }
              return r;
            })
            .catch((t) => {
              console.warn("error during annotations list update: " + t),
                (e.scheduledUpdate = null),
                (e.updateInProgress = !1),
                e.scheduleNextUpdate &&
                  ((e.scheduleNextUpdate = !1), X.call(this));
            });
        }, 500));
    }
    function Q(e) {
      var t = $(this).data("gannotationpanel");
      if (q(t, e.node)) {
        const n = e.node.findParent((e) => e instanceof a.GAnnotationsList),
          o = () => {
            const t = new l.default();
            if (e.node instanceof a.GComment) {
              const n = e.node.getProperty("text");
              (n && s.NOTIFICATION_USER_MENTION_REGEX.test(n)) ||
                (t.collaboratorsCache = !1);
            }
            return t;
          };
        let i = !1;
        const r = () => {
            if (!e.node.getProperty("rmd")) {
              const t = n ? l.default.NO_CACHE_INVALIDATION : o();
              K.call(this, e.node, null, t);
            }
          },
          c = () => {
            n && X.call(this, null, o());
          };
        (e.node.hasMixin(a.GAnnotation) ||
          e.node instanceof a.GComment ||
          e.node instanceof a.GAnnotationsList) &&
          (e.node.getProperty("rmd") ? (i = !0) : r()),
          i
            ? "number" != typeof t.delayedUpdate &&
              (t.delayedUpdate = setTimeout(() => {
                r(), c(), (t.delayedUpdate = null);
              }))
            : c();
      }
    }
    function J(e) {
      q($(this).data("gannotationpanel"), e.node) &&
        (z.call(this, e.node),
        e.node.findParent((e) => e instanceof a.GAnnotationsList) &&
          X.call(this));
    }
    function Z(e) {
      if (!e.temporary && !$(this).data("gannotationpanel").blockHandlers) {
        e.properties.some((e) => y.indexOf(e) >= 0) &&
          oe.requestInvalidation.call(this);
        let t = gDesigner.getSyncUser();
        d.canUpdate(t) &&
          e.node.hasMixin(a.GAnnotation) &&
          e.properties.includes("rsv") &&
          setTimeout(() => {
            let n = e.values[e.properties.indexOf("rsv")];
            (void 0 !== n && !1 !== n) !== e.node.getProperty("rsv") &&
              (V.call(this, e.node),
              e.node.addComment(
                "",
                t.getUID(),
                i.GEditorOptions.userConfig.userName,
                t.avatar,
                t.getAccountName(),
                e.node.getProperty("rsv")
                  ? a.GComment.Type.Close
                  : a.GComment.Type.Open
              ));
          }),
          (e.node instanceof a.GAnnotationsList ||
            e.node.findParent((e) => e instanceof a.GAnnotationsList)) &&
            (e.node.hasMixin(a.GAnnotation) &&
              e.properties.indexOf("uid") >= 0 &&
              j(e.node),
            X.call(this, e)),
          e.properties.includes("rmd") && e.node.getProperty("rmd")
            ? (e.node.hasMixin(a.GAnnotation) && W(this, e.node),
              ne.call(this),
              te.call(this))
            : e.properties.includes("text") &&
              e.node.isFillingCompleted() &&
              e.node.hasMixin(a.GAnnotation) &&
              W(this, e.node);
      }
    }
    function ee(e) {
      var t,
        n = $(this).data("gannotationpanel");
      if (q(n, e.node)) {
        var o = !1;
        if (e.node instanceof a.GComment || e.node.hasMixin(a.GAnnotation))
          if (
            e.flag === a.GAnnotation.Flag.Hidden ||
            e.flag === a.GNode.Flag.Selected ||
            e.flag === a.GNode.Flag.Active
          ) {
            var r = e.node.getPage(),
              s = e.node.getScene(),
              d = s && s.getActivePage();
            if (
              ((d && r && d !== r) || (o = !0),
              e.node.hasMixin(a.GAnnotation) &&
                e.flag === a.GNode.Flag.Selected &&
                !1 === e.set &&
                !e.node.isFillingCompleted() &&
                !(t = e.node).getProperty("rmd") &&
                t.getParent())
            )
              if (e.node.isEmptyTextAllowed()) {
                let t = n.annotTreeNodeMapByNodes.get(e.node);
                t &&
                  t.reply &&
                  t.reply.isVisible() &&
                  setTimeout(() => t.reply.forceSubmit());
              } else
                c.confirm(
                  a.GLocale.get(
                    new a.GLocaleKey(
                      "GAnnotationPanel",
                      "text.confirm-discard-annotation"
                    )
                  ),
                  (t) => {
                    if (t)
                      setTimeout(() => {
                        H(this, e.node);
                      });
                    else {
                      gDesigner
                        .getActiveDocument()
                        .getEditor()
                        .updateSelection(!1, [e.node]),
                        gDesigner
                          .getToolManager()
                          .activateTool(i.GPointerTool, null, !0);
                      var o = n.annotTreeNodeMapByNodes.get(e.node);
                      o &&
                        o.reply &&
                        setTimeout(() => {
                          o.reply.requestFocus();
                        });
                    }
                  }
                );
          } else if (!n.blockHighlight && e.flag === a.GNode.Flag.Highlighted) {
            var u = e.node,
              p = function (e) {
                var t = A.call(this, e);
                return t && t.isVisible();
              }.bind(this);
            if (p(u) || u.findParent(p)) {
              var g = n.annotTreeNodeMapByNodes.get(u).component;
              g
                ? g.toggleHighlight(e.set)
                : console.warn("element parent was null");
            }
          }
        o && oe.requestInvalidation.call(this, l.default.NO_CACHE_INVALIDATION);
      }
    }
    function te() {
      var e = $(this).data("gannotationpanel");
      if ((e.vtree.beginUpdate(), e.page))
        for (
          var t = e.page.getAnnotations().getFirstChild();
          null !== t;
          t = t.getNext()
        )
          t.getProperty("rmd") || K.call(this, t, !0);
      e.vtree.endUpdate();
    }
    function ne(e) {
      var t = $(this).data("gannotationpanel");
      t.vtree.clean(),
        (t.annotTreeNodeMap = {}),
        (t.replyNodes = new Map()),
        (t.annotTreeNodeMapByNodes = new Map()),
        void 0 !== e && (t.page = e),
        "number" == typeof t.delayedUpdate &&
          (clearTimeout(t.delayedUpdate), (t.delayedUpdate = null));
    }
    a.GObject.inheritAndMix(v, a.GObject);
    var oe = {
      init: function (e) {
        return (
          (e = $.extend(
            {
              nodeStyle: "annotation-row",
              expandStyle: "annotation-arrow gravit-icon-right",
              collapseStyle: "annotation-arrow gravit-icon-down",
              freeHeight: 7,
              insertIntoStyle: "g-drop",
              upSeparatorSpan1Style: "g-up-separator-span1",
              upSeparatorSpan2Style: "g-up-separator-span2",
              downSeparatorSpan1Style: "g-down-separator-span1",
              downSeparatorSpan2Style: "g-down-separator-span2",
              renderer: L.bind(this),
              expandRenderer: C.bind(this),
              separatorRenderer: null,
              moveCallback: null,
              clickCallback: null,
              startDraggingCallback: null,
              updateCommentCount: null,
            },
            e
          )),
          this.each(function () {
            $(this)
              .addClass("g-annotation-panel")
              .data("gannotationpanel", {
                vtree: new p(
                  this,
                  w.bind(this),
                  e.nodeStyle,
                  e.expandStyle === e.collapseStyle ? e.expandStyle : null,
                  _.bind(this),
                  b.bind(this),
                  e.upSeparatorSpan1Style,
                  e.upSeparatorSpan2Style,
                  e.downSeparatorSpan1Style,
                  e.downSeparatorSpan2Style
                ),
                options: e,
                annotTreeNodeMap: {},
                annotTreeNodeMapByNodes: new Map(),
                replyNodes: new Map(),
                page: null,
                scheduledUpdate: null,
                scheduleNextUpdate: !1,
                blockAnnotationsUpdate: !1,
                updateInProgress: !1,
                showResolved:
                  "boolean" == typeof e.showResolved && e.showResolved,
                currentFocus: null,
                sidebarActive: e.sidebarActive,
                syncCallback: null,
                delayedUpdate: null,
              });
          })
        );
      },
      requestInvalidation: function (e) {
        $(this).data("gannotationpanel").vtree.requestInvalidation(0, e);
      },
      refresh: function () {
        $(this).data("gannotationpanel").vtree.refresh();
      },
      relayout: function (e) {
        var t = $(this).data("gannotationpanel"),
          n = t.vtree,
          o = t.currentFocus;
        o && n.expandAndFocus(o),
          e
            ? (ne.call(this), te.call(this))
            : oe.requestInvalidation.call(
                this,
                l.default.NO_CACHE_INVALIDATION
              );
      },
      cleanEmptyAnnotations: function () {
        H(this);
      },
      isEditingOrAddingContent: function () {
        return $(this)
          .data("gannotationpanel")
          .vtree.isEditingOrAddingContent();
      },
      showResolved: function (e) {
        var t = $(this).data("gannotationpanel");
        t.showResolved !== e &&
          ((t.showResolved = e), ne.call(this), te.call(this));
      },
      page: function (e) {
        var t = $(this),
          n = t.data("gannotationpanel") || {};
        return arguments.length
          ? (e !== n.page &&
              (n.page &&
                n.page.hasMixin(a.GEventTarget) &&
                (n.page.removeEventListener(
                  a.GNode.AfterInsertEvent,
                  n.afterNodeInsertHandler,
                  this
                ),
                n.page.removeEventListener(
                  a.GNode.BeforeRemoveEvent,
                  n.beforeNodeRemoveHandler,
                  this
                ),
                n.page.removeEventListener(
                  a.GNode.AfterPropertiesChangeEvent,
                  n.afterPropertiesChangeHandler,
                  this
                ),
                n.page.removeEventListener(
                  a.GNode.AfterFlagChangeEvent,
                  n.afterFlagChangeHandler,
                  this
                ),
                null !== n.scheduledUpdate &&
                  (clearTimeout(n.scheduledUpdate), (n.scheduledUpdate = null)),
                (n.updateInProgress = !1)),
              ne.call(this, e),
              (n.page = e),
              n.page &&
                (n.page.hasMixin(a.GEventTarget) &&
                  ((n.beforeNodeRemoveHandler = J.bind(this)),
                  (n.afterPropertiesChangeHandler = Z.bind(this)),
                  (n.afterFlagChangeHandler = ee.bind(this)),
                  (n.afterNodeInsertHandler = Q.bind(this)),
                  n.page.addEventListener(
                    a.GNode.AfterInsertEvent,
                    n.afterNodeInsertHandler,
                    this
                  ),
                  n.page.addEventListener(
                    a.GNode.BeforeRemoveEvent,
                    n.beforeNodeRemoveHandler,
                    this
                  ),
                  n.page.addEventListener(
                    a.GNode.AfterPropertiesChangeEvent,
                    n.afterPropertiesChangeHandler,
                    this
                  ),
                  n.page.addEventListener(
                    a.GNode.AfterFlagChangeEvent,
                    n.afterFlagChangeHandler,
                    this
                  )),
                te.call(this))),
            this)
          : n.page;
      },
      setDelayedSyncCallback: function (e) {
        $(this).data("gannotationpanel").syncCallback = e;
      },
      annotations: function (e) {
        let t = !1;
        if (Y.call(this)) return f.DELAYED;
        let n = $(this).data("gannotationpanel"),
          o = a.GNode.restore(e),
          i = o.getChildren();
        return (
          o.clearChildren(),
          (n.blockAnnotationsUpdate = !0),
          n.vtree.beginUpdate(),
          (t = d.mergeAnnotations(
            n.page.getAnnotations(),
            n.page.getAnnotations().getChildren(),
            o,
            i
          )),
          n.vtree.endUpdate(),
          (n.blockAnnotationsUpdate = !1),
          ne.call(this),
          te.call(this),
          t ? f.UPDATED : f.SKIPPED
        );
      },
      blockHandlers: function (e) {
        $(this).data("gannotationpanel").blockHandlers = !!e;
      },
      ignoreBlock: function (e) {
        $(this).data("gannotationpanel").ignoreBlock = e;
      },
      setBlockHighlight: function (e) {
        $(this).data("gannotationpanel").blockHighlight = !!e;
      },
      getTreeNode: function (e) {
        var t = null;
        return $(this).data("gannotationpanel") && (t = A.call(this, e)), t;
      },
      scrollIntoView: function () {
        const e = $(this).find(".annotation-row.g-selected").attr("id");
        if (e) {
          const t = S.call(this, e);
          t &&
            (t.reply
              ? t.reply.scrollIntoView()
              : t.component && t.component.scrollIntoView());
        }
      },
      getItem: function (e) {
        return x.call(this, e.id);
      },
    };
    (e.exports = v),
      ($.fn.gAnnotationPanel = function (e) {
        return oe[e]
          ? oe[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : oe.init.apply(this, arguments);
      });
  }