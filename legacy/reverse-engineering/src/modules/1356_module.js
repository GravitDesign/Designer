/**
 * Webpack Module #1356
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(30),
      n(8),
      n(20),
      n(71),
      n(151),
      n(34),
      n(91),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(33),
      n(26);
    var i = n(10),
      a = n(882),
      r = n(1353),
      s = n(263),
      l = n(67),
      c = o(n(358)),
      d = o(n(1324)),
      u = o(n(883));
    const {
        GSystem: p,
        GLocale: g,
        GLocaleKey: h,
        GUtil: f,
        GComment: m,
        GAnnotation: y,
        GObject: v,
        GNode: _,
      } = n(1),
      {
        NEW_COMMENT_READ_TIMEOUT: b,
        ANNOTATION_PERMANENT_LINK: w,
        IS_COREL: C,
      } = ((0, r.createAdditionalMentions)(), n(10)),
      x = n(1191),
      S = n(1166),
      E = n(434),
      { getAnnotationType: A } = n(40);
    function T(e) {
      let {
        container: t,
        annotation: n,
        relatedNodesCount: o,
        sidebarActive: i,
        isLastRow: a,
        mentionData: r,
        onMouseEnter: s,
        onMouseLeave: l,
        onChange: c,
        onToggleState: d,
        onResolve: u,
        onReopen: p,
        onDelete: g,
        onCancel: h,
        onExpandClick: f,
        onCopyPermalinkClick: m,
        onAssignTo: y,
        mainAnnotObject: v,
        isCommentingEditingEnable: _,
        hasResolveAccess: b,
        hasReopenAccess: w,
      } = e;
      (this._container = t),
        (this._annotation = n),
        (this._relatedNodesCount = o),
        (this._sidebarActive = i),
        (this._isLastRow = a),
        (this._onMouseEnter = s),
        (this._onMouseLeave = l),
        (this._onChange = c),
        (this._onToggleState = d),
        (this._onResolve = u),
        (this._onReopen = p),
        (this._onDelete = g),
        (this._onCancel = h),
        (this._onExpandClick = f),
        (this._onCopyPermalinkClick = m),
        (this._onAssignTo = y),
        (this._mainAnnotObject = v),
        (this._shouldAssign = !1),
        (this._assignees = []),
        (this._mentionsCollection = []),
        (this._data = r.data),
        (this._owner = r.owner),
        (this._additionalMentions = r.additionalMentions),
        (this._mentionData = r),
        (this._isCommentingEditingEnable = _),
        (this._hasResolveAccess = b),
        (this._hasReopenAccess = w),
        this._init();
    }
    function G(e) {
      if (13 !== e.keyCode) return !1;
      if (p.operatingSystem !== p.OperatingSystem.OSX_IOS) {
        if (!e.shiftKey) return !0;
      } else {
        if (!e.altKey) return !0;
        if ("keydown" === e.type) {
          let t = $(e.target).val();
          $(e.target).val(t + "\n");
        }
      }
      return !1;
    }
    function P(e) {
      return (t) =>
        t.getFirstName() === e ||
        t.getFullUserName() === e ||
        t.getEmail() === e;
    }
    function D(e) {
      const t = (0, r.createAdditionalMentions)();
      return Object.values(t).find((t) => t.getUID() === e);
    }
    function L(e) {
      return f.xss(e);
    }
    v.inherit(T, x),
      (T.prototype._isRead = !1),
      (T.prototype._isTypeResolved = !1),
      (T.prototype._isTypeReopened = !1),
      (T.prototype._isParentAnnotResolved = !1),
      (T.prototype._init = function () {
        var e,
          t = this._container,
          n = this._annotation,
          o = A(
            this._annotation instanceof m
              ? this._annotation._parent
              : this._annotation
          ),
          i = this,
          r = gDesigner.getSyncUser(),
          s = c.default.isOwner(r, n),
          d = gDesigner.getApplicationManager();
        const u =
            this._isCommentingEditingEnable && (this._hasResolveAccess || s),
          f = this._isCommentingEditingEnable && (this._hasReopenAccess || s);
        var v = $("<span></span>")
          .addClass("annotation-title-group")
          .appendTo(t);
        t.on("mouseenter", this._onMouseEnter).on(
          "mouseleave",
          this._onMouseLeave
        );
        var b = $("<div/>").addClass("email-and-role-tooltop").appendTo(v);
        gDesigner
          .getShareManager()
          .getRoleNameByUserId(n.getProperty("uid"))
          .then((e) => {
            b.gRichTooltip(
              l.GRichTooltipConfig.from({
                title: n.getProperty("email") || r.getEmail() || " ",
                description: e,
                forceShow: !0,
                middle: !1,
                flipHorizontal: !0,
                marginLeft: 26,
              })
            );
          });
        var x = n.getProperty("name");
        x =
          x ||
          n.getProperty("login") ||
          n.getProperty("email").split("@")[0] ||
          g.get(new h("GAnnotationPanel", "text.empty"));
        var T = $("<span></span>")
          .html(L(x))
          .addClass("annotation-title")
          .appendTo(b);
        gDesigner
          .getShareManager()
          .getCollaboratorById(n.getProperty("uid"))
          .then((e) => {
            const t = S.getUserDataFromAnnotAndUser(n, e || r);
            new S(t).build().addClass("g-user-comment-preview").insertBefore(T);
          });
        var P = new Date(n.getProperty("mtime") || n.getProperty("time")),
          D = g.toLocaleDate(P, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          });
        $("<span>").text("·").addClass("dot").appendTo(v),
          $("<span></span>").text(D).addClass("annotation-date").appendTo(v),
          (this._annotationCommentContainer = $("<div/>")
            .addClass("annotation-comment-container")
            .appendTo(t)),
          (this._contentEditorButtons = $("<div>"));
        var I = $("<span></span>")
          .addClass("annotation-comment-content")
          .css("userSelect", "text")
          .appendTo(this._annotationCommentContainer);
        if (n instanceof m)
          switch (
            (this._updateParentAnnotResolvedStatus(n.getParent()),
            n.getProperty("type"))
          ) {
            case m.Type.User:
              (e = this._generateCommentContentHTML(n)),
                I.html(e.html),
                this._updateReadUnreadStatus(v);
              break;
            case m.Type.Open:
              I.addClass("automatic").text(
                g.get(new h("GAnnotationPanel", "text.re-opened"))
              ),
                this._updateReadUnreadStatus(v),
                (this._isTypeReopened = !0),
                (this._isTypeResolved = !1);
              break;
            case m.Type.Close:
              I.addClass("automatic").text(
                g.get(new h("GAnnotationPanel", "text.marked-as-resolved"))
              ),
                (this._isRead = !0),
                (this._isTypeResolved = !0),
                (this._isTypeReopened = !1);
          }
        else
          this._updateParentAnnotResolvedStatus(n),
            (e = this._generateCommentContentHTML(n)),
            I.html(e.html),
            this._updateReadUnreadStatus(v);
        var k = (e) => {
            ((e = (
              (e = a.replaceAdditionalCollabShowTextBeforeSend.call(this, e)) ||
              ""
            ).trim()) ||
              n.isEmptyTextAllowed()) &&
              (this._onChange(e),
              this._shouldAssign &&
                this._assignees &&
                this._assignees.length &&
                i._onAssignTo(i._assignees));
          },
          O = $("<textarea></textarea>")
            .appendTo(this._annotationCommentContainer)
            .addClass("annotation-comment-editor")
            .addClass("mention")
            .on("click", function (e) {
              i.isEditMode() && e.stopPropagation();
            })
            .on("blur", function () {
              !i.isEditMode() ||
                (i._mentionsCollection && i._mentionsCollection.length) ||
                (k(this.value), i.cancelEditMode());
            })
            .on("keydown", function (e) {
              i.isEditMode() && G(e) && e.preventDefault();
            })
            .on("keypress", function (e) {
              i.isEditMode() &&
                p.operatingSystem === p.OperatingSystem.OSX_IOS &&
                13 === e.keyCode &&
                e.altKey &&
                e.preventDefault();
            })
            .on("keyup", function (e) {
              const t = O.parent()
                .find(".mentions-autocomplete-list")
                .data("assign");
              i.isEditMode() &&
                (G(e) && !t
                  ? (k(this.value), i.cancelEditMode(), e.preventDefault())
                  : 27 === e.keyCode && (i.cancelEditMode(), i._onCancel()));
            });
        if (
          (O.mentionsInput({
            elastic: !1,
            onDataRequest: (e, t, n) => {
              let o = this._data.filter(
                (e) =>
                  e.getFullUserName().toLowerCase().includes(t.toLowerCase()) ||
                  (e.getEmail() &&
                    e.getEmail().toLowerCase().includes(t.toLowerCase()))
              );
              o.push(...this._additionalMentions), n.call(this, o);
            },
            onSelectItem: () => {
              gDesigner.stats("commentdocker_mention_select-user", o);
            },
          }).on("input", function () {
            a.showAssigneeRow.call(i, O),
              (this.style.height = 0),
              (this.style.height = this.scrollHeight + "px");
          }),
          this._annotationCommentContainer
            .find(".mentions-autocomplete-list")
            .delegate("li", "mousedown", () => {
              a.showAssigneeRow.call(this, O);
            }),
          this.setMentionOverlayBorderVisiblity(!1),
          (this._onlyOneAssignee = $("<span>")
            .addClass("only-one-assignee")
            .html(
              1 === this._mentionsCollection.length
                ? this._mentionsCollection[0].name
                : ""
            )
            .css("display", "none")),
          (this._assigneeSelector = $("<div>")
            .addClass("assignee-selector")
            .css("display", "none")
            .append(
              $("<select>").on("change", (e) => {
                a.updateAssignee.call(this, $(e.target).val());
              })
            )),
          (this._assigneeCheckBox = $("<input>")
            .attr("type", "checkbox")
            .prop("checked", this._shouldAssign)
            .on("change", (e) => {
              (this._shouldAssign = $(e.target).prop("checked")),
                gDesigner.stats("commentdocker_mention_assign-user", o);
            })),
          (this._assigneeRow = $("<div>")
            .css("display", "none")
            .addClass("assignee-row-container")
            .append(
              $("<label>")
                .addClass("label")
                .addClass("assignee-row-label")
                .append(this._assigneeCheckBox)
                .append(
                  $("<span>").html(
                    g.get(new h("GAnnotationPanel", "text.assign-to"))
                  )
                )
                .append(this._onlyOneAssignee)
                .append(this._assigneeSelector)
            )
            .appendTo(this._annotationCommentContainer)),
          this._contentEditorButtons
            .appendTo(this._annotationCommentContainer)
            .css("display", "none")
            .addClass("contenteditor-buttonrow")
            .append(
              $("<button>")
                .addClass("annotations-cancelcomment")
                .text(g.get(new h("GAnnotationPanel", "text.cancel")))
                .on("mousedown", (e) => {
                  e.preventDefault();
                })
                .on("click", (e) => {
                  e.stopPropagation(),
                    gDesigner.stats("commentdocker_cancel-btn", o),
                    i.cancelEditMode(),
                    i._onCancel();
                })
            )
            .append(
              $("<button>")
                .addClass("annotations-addcomment")
                .text(g.get(new h("GAnnotationPanel", "text.fill-contents")))
                .on("mousedown", (e) => {
                  e.preventDefault();
                })
                .on("click", (e) => {
                  e.stopPropagation(),
                    gDesigner.stats(
                      n.getProperty("text").trim().length > 0
                        ? "commentdocker_edit-btn"
                        : "commentdocker_add-btn",
                      o
                    ),
                    k(O.val()),
                    i.cancelEditMode();
                })
            ),
          $(t)
            .toggleClass("g-active", n.hasFlag(_.Flag.Active))
            .toggleClass(
              "g-selected",
              n.hasFlag(_.Flag.Selected) ||
                (n instanceof m && n.getParent().hasFlag(_.Flag.Selected))
            ),
          this._relatedNodesCount > 1)
        )
          this.isCollapsible()
            ? (this._container.addClass("collapsible"),
              (this._expandIcon = $("<div></div>")
                .addClass(
                  this._mainAnnotObject.expanded
                    ? "gravit-icon-down "
                    : "gravit-icon-right"
                )
                .addClass("annotation-collapse")
                .click(this._onExpandClick)),
              v.prepend(this._expandIcon))
            : this._mainAnnotObject.expanded
            ? t.show()
            : t.hide();
        else {
          const e = $("<div></div>").addClass("annotation-collapse-empty");
          v.prepend(e);
        }
        (n.hasFlag(_.Flag.Selected) ||
          (n instanceof m && n.getParent().hasFlag(_.Flag.Selected))) &&
          (this.setCollapseState(!0), this.setVisiblity(!0));
        var F = $("<span>").addClass("annotation-action-group").appendTo(v);
        if (this._isCommentingEditingEnable && n.hasMixin(y)) {
          var R = n.getProperty("rsv"),
            M = !1,
            N = "";
          R
            ? ((M = !0),
              (N = f
                ? g.get(new h("GAnnotationPanel", "text.reopen"))
                : g.get(new h("GAnnotationPanel", "text.marked-as-resolved"))))
            : ((M = !1),
              (N = g.get(new h("GAnnotationPanel", "text.resolve")))),
            (!R && !f) ||
              (n.getProperty("asgn") || []).length ||
              $("<span>")
                .addClass(
                  "icon " + (R ? "gravit-icon-resolved" : "gravit-icon-resolve")
                )
                .addClass(M ? "visible" : "")
                .addClass("annotation-action")
                .attr("data-title", N)
                .click((e) => {
                  e.stopPropagation(),
                    d.hasAccess(E.RESOLVE_COMMENT_ANNOTATION).then((e) => {
                      e || s
                        ? this._onToggleState(n)
                        : d.hasAccess(E.REOPEN_COMMENT_ANNOTATION).then((e) => {
                            (e || s) && this._onToggleState(n);
                          });
                    });
                })
                .appendTo(F);
        }
        var B = $("<span>")
            .append($("<span></span>").addClass("gravit-annotation-icon-menu"))
            .addClass("annotationpanel-menubutton")
            .addClass("annotation-action"),
          U = $("<div></div>")
            .addClass("annotations-menu")
            .gOverlay({
              releaseOnClose: !1,
              closeCallback: () => {
                B.removeClass("g-active");
              },
            });
        if (
          (t.data("annotmenu", U),
          n.hasMixin(y) &&
            (u || f) &&
            !(n.getProperty("asgn") || []).length &&
            (n.getProperty("rsv")
              ? U.append(
                  $("<label>")
                    .append(
                      $("<span>")
                        .addClass("icon gravit-icon-reopen")
                        .addClass("annot-menu-icon")
                    )
                    .on("click", (e) => {
                      e.stopPropagation(),
                        gDesigner.stats("commentdocker_option_reopen", o),
                        U.gOverlay("close"),
                        this._onReopen(n);
                    })
                    .append(
                      $("<span>").text(
                        g.get(new h("GAnnotationPanel", "text.reopen"))
                      )
                    )
                )
              : U.append(
                  $("<label>")
                    .append(
                      $("<span>")
                        .addClass(
                          "icon ".concat(
                            C ? "gravit-icon-resolved" : "gravit-icon-resolve"
                          )
                        )
                        .addClass("annot-menu-icon")
                    )
                    .on("click", (e) => {
                      e.stopPropagation(),
                        gDesigner.stats("commentdocker_option_resolve", o),
                        U.gOverlay("close"),
                        this._onResolve(n);
                    })
                    .append(
                      $("<span>").text(
                        g.get(new h("GAnnotationPanel", "text.resolve"))
                      )
                    )
                )),
          s &&
            ((n.hasMixin(y) && !n.getProperty("rsv")) ||
              (n instanceof m && !n.getParent().getProperty("rsv"))) &&
            n.isFillingCompleted())
        ) {
          const e = n.getProperty("text").trim().length > 0;
          this._isCommentingEditingEnable &&
            U.append(
              $("<label>")
                .append(
                  $("<span>")
                    .addClass("icon gravit-icon-edit")
                    .addClass("annot-menu-icon")
                )
                .on(
                  "click",
                  function (t) {
                    t.stopPropagation();
                    let a = e
                      ? "commentdocker_option_edit"
                      : "commentdocker_option_add";
                    gDesigner.stats("".concat(a), o),
                      i._startEditMode(
                        i._annotationCommentContainer,
                        n.getProperty("text").trim().length > 0,
                        n.getProperty("text"),
                        I.outerWidth(),
                        I.outerHeight(),
                        i._data,
                        i._additionalMentions
                      ),
                      U.gOverlay("close");
                  }.bind(I)
                )
                .append(
                  $("<span>").text(
                    g.get(
                      new h(
                        "GAnnotationPanel",
                        e ? "text.edit-comment" : "text.add-comment"
                      )
                    )
                  )
                )
            );
        }
        s &&
          this._isCommentingEditingEnable &&
          U.append(
            $("<label>")
              .append(
                $("<span>")
                  .addClass("icon gravit-icon-trash")
                  .addClass("annot-menu-icon")
              )
              .on("click", (e) => {
                e.stopPropagation(),
                  gDesigner.stats("commentdocker_option_delete", o),
                  U.gOverlay("close"),
                  this._onDelete(n);
              })
              .append(
                $("<span>").text(
                  g.get(new h("GAnnotationPanel", "text.delete"))
                )
              )
          );
        const j = gDesigner.getActiveDocument();
        w &&
          j &&
          j.isShareable() &&
          U.append(
            $("<label/>")
              .append(
                $("<span/>")
                  .addClass("icon gravit-icon-copy-annot")
                  .addClass("annot-menu-icon")
              )
              .append(
                $("<span>").text(
                  g.get(new h("GAnnotationPanel", "text.copy-permalink"))
                )
              )
              .on("click", async (e) => {
                e.stopPropagation(),
                  gDesigner.stats("commentdocker_option_copy-permalink", o);
                const t = $("<span/>")
                  .addClass("g-loading")
                  .appendTo($(e.target).closest("label"));
                try {
                  await this._onCopyPermalinkClick(this._annotation);
                } finally {
                  t.remove(), U.gOverlay("close");
                }
              })
          ),
          (n.hasMixin(y) || n.getProperty("type") === m.Type.User) &&
            U.find(".annot-menu-icon").length &&
            B.on("click", (e) => {
              e.stopPropagation(),
                B.addClass("g-active"),
                U.gOverlay("open", $(e.target).closest("span").closest("span"));
            }).appendTo(F);
      }),
      (T.prototype.isCollapsible = function () {
        return this._annotation.hasMixin(y);
      }),
      (T.prototype.setCollapseState = function (e) {
        if (this.isCollapsible())
          return $(this._expandIcon)
            .removeClass(e ? "gravit-icon-right" : "gravit-icon-down")
            .addClass(e ? "gravit-icon-down" : "gravit-icon-right");
      }),
      (T.prototype.isEditMode = function () {
        return this._annotationCommentContainer.hasClass("g-edit-mode");
      }),
      (T.prototype._clearOwnData = function () {
        var e = this._container.data("annotmenu");
        e && (e.empty(), this._container.data("annotmenu", null));
      }),
      (T.prototype.cancelEditMode = function () {
        this._annotationCommentContainer.removeClass("g-edit-mode"),
          this._contentEditorButtons.hide(),
          this._assigneeRow.hide(),
          this.setMentionOverlayBorderVisiblity(!1);
      }),
      (T.prototype.toggleHighlight = function (e) {
        this._container.toggleClass("g-highlighted-row", e);
      }),
      (T.prototype.isRead = function () {
        return this._isRead;
      }),
      (T.prototype.isTypeResolved = function () {
        return this._isTypeResolved;
      }),
      (T.prototype.isTypeReopened = function () {
        return this._isTypeReopened;
      }),
      (T.prototype.isParentAnnotationResolved = function () {
        return this._isParentAnnotResolved;
      }),
      (T.prototype.setVisiblity = function (e) {
        e ? this._container.show() : this._container.hide();
      }),
      (T.prototype.setMentionOverlayBorderVisiblity = function (e) {
        e
          ? this._annotationCommentContainer
              .find(".mentions-input-box")
              .css("display", "block")
          : this._annotationCommentContainer
              .find(".mentions-input-box")
              .css("display", "none");
      }),
      (T.prototype._updateParentAnnotResolvedStatus = function (e) {
        this._isParentAnnotResolved = !!e.getProperty("rsv");
      }),
      (T.prototype._updateReadUnreadStatus = function (e) {
        var t = this._annotation,
          n = gDesigner.getSyncUser(),
          o = c.default.isOwner(n, t);
        if (
          this._isParentAnnotResolved ||
          o ||
          (t.getProperty("read") || []).includes(n.getUID())
        )
          this._isRead = !0;
        else {
          var a = null;
          i.SHOW_SIDEBAR_BADGE &&
            ((a = $("<div/>")
              .addClass("new-comment")
              .append([
                $("<span/>").addClass("dot").text("·"),
                $("<span/>")
                  .addClass("text-new")
                  .text(
                    g.get(new h("GAnnotationPanel", "text.unread-comment"))
                  ),
              ])
              .appendTo(e)),
            this._container.addClass("new-element")),
            this._sidebarActive &&
              setTimeout(() => {
                let e = t.getProperty("read") || [];
                e.includes(n.getUID()) ||
                  (t.setProperty("read", e.concat(n.getUID())),
                  a && a.remove(),
                  (this._isRead = !0),
                  this._container.addClass("new-element"));
              }, b);
        }
      }),
      (T.prototype.scrollIntoView = function () {
        this._scrollToElement(this._container);
      }),
      (T.prototype._startEditMode = function (e, t, n, o, i) {
        let a =
            arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : [],
          r =
            arguments.length > 6 && void 0 !== arguments[6] ? arguments[6] : [];
        if (!e.hasClass("g-edit-mode")) {
          var s = e.find(".annotation-comment-editor"),
            l = e.find(".contenteditor-buttonrow");
          s.val(L(n));
          var c = this._generateCommentContentHTML(n);
          let o = c.mentioned.map((e) => e.id),
            i = a
              .concat(r)
              .filter((e) => o.includes(e.id))
              .map((e) => u.default.clone(e));
          i &&
            i.length &&
            (i.forEach((e) => {
              const t = c.mentioned.find((t) => t.id === e.id);
              (e.value = t.showText), (e.showText = t.showText);
            }),
            e
              .find(".annotation-comment-editor")
              .mentionsInput("setMentions", i)),
            this.setMentionOverlayBorderVisiblity(!0),
            s.trigger("input"),
            s[0].setSelectionRange(s[0].textLength, s[0].textLength),
            l.show(),
            l
              .find(".annotations-addcomment")
              .text(
                g.get(
                  new h(
                    "GAnnotationPanel",
                    t ? "text.edit-comment" : "text.add-comment"
                  )
                )
              ),
            setTimeout(() => s.focus()),
            e.addClass("g-edit-mode");
        }
      }),
      (T.prototype._generateCommentContentHTML = function (e) {
        let t = "string" == typeof e ? e : L(e.getProperty("text"));
        if (
          ((t = t || ""),
          !gDesigner.getActiveDocument() ||
            !gDesigner.getActiveDocument().getStorageItem())
        )
          return { html: t, mentioned: [] };
        let n = t.match(s.GRegex.String.USERNAME_RE);
        if (!(n || []).length) return { html: t, mentioned: [] };
        let o = (this._data || []).filter((e) => {
            let t = (e.getRole && e.getRole()) || e.role;
            return !t.is(i.ShareRoles.Viewer) && !t.is(i.ShareRoles.NoAccess);
          }),
          a = [];
        if (
          (n.forEach((e) => {
            const t = e.substring(1);
            if (!t) return;
            if (D(e)) return void a.push(e);
            const n = o.find(P(t));
            n &&
              !a.find(
                (function (e) {
                  return (t) =>
                    e.getFirstName() === t.substring(1) ||
                    e.getFullUserName() === t.substring(1) ||
                    e.getEmail() === t.substring(1);
                })(n)
              ) &&
              a.push(e);
          }),
          !(a || []).length)
        )
          return { html: t, mentioned: [] };
        let r = o.filter(
          (e) =>
            a.includes("@" + e.getFirstName()) ||
            a.includes("@" + e.getFullUserName()) ||
            (e.getEmail() && a.includes("@" + e.getEmail()))
        );
        return (
          (r = r.map((e) => {
            const t = Object.assign(new d.default(), e),
              n = "@" + t.getEmail(),
              o = "@" + t.getFirstName();
            return (
              a.includes(o)
                ? (t.showText = "@" + t.getFullUserName())
                : a.includes(n) && (t.showText = n),
              t
            );
          })),
          a.forEach((e) => {
            let n = e;
            const o = D(e);
            if (o) (n = o.showText), r.push(o);
            else {
              const o = e.substring(1),
                i = r.find(P(o));
              i && ((n = i.showText), t.includes(n) && (e = n));
            }
            t = t.replace(e, "<strong><span>" + n + "</span></strong>");
          }),
          { html: t, mentioned: r }
        );
      }),
      (e.exports = T);
  }