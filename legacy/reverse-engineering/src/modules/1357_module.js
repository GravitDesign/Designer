/**
 * Webpack Module #1357
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(19), n(71), n(91), n(4), n(41), n(13), n(26);
    var o = n(15),
      i = n(882);
    const a = n(44),
      { GSystem: r, GLocale: s, GLocaleKey: l, GObject: c, GNode: d } = n(1),
      u = n(1191),
      { getAnnotationType: p } = n(40);
    n(85);
    function g(e) {
      let {
        container: t,
        annotation: n,
        onSubmit: o,
        onCancel: i,
        onAssignTo: a,
        mentionData: r,
      } = e;
      (this._containter = t),
        (this._annotation = n),
        (this._onSubmit = o),
        (this._onCancel = i),
        (this._onAssignTo = a),
        (this._shouldAssign = !1),
        (this._assignees = []),
        (this._mentionsCollection = []),
        (this._data = r.data),
        (this._owner = r.owner),
        (this._additionalMentions = r.additionalMentions || []),
        (this._mentionData = r),
        this._init();
    }
    function h(e) {
      if (13 === e.keyCode)
        if (r.operatingSystem !== r.OperatingSystem.OSX_IOS) {
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
    c.inherit(g, u),
      (g.prototype._init = function () {
        var e = this._containter;
        this._containter.addClass("reply-docker");
        var t,
          n = p(this._annotation);
        e.toggleClass(
          "g-active",
          this._annotation.hasFlag(d.Flag.Active)
        ).toggleClass("g-selected", this._annotation.hasFlag(d.Flag.Selected));
        const c = !this._annotation.isFillingCompleted();
        e.on("focusout", (n) => {
          if (e.find(n.relatedTarget).length)
            return n.stopPropagation(), n.preventDefault(), !1;
          $(n.target).val() ||
            a.isDialogOpen(".g-system-dialog.g-confirm-dialog") ||
            ($(n.target).attr("rows", 1), t.hide());
        })
          .on("keydown", function (e) {
            h(e) && e.preventDefault();
          })
          .on("keypress", function (e) {
            r.operatingSystem === r.OperatingSystem.OSX_IOS &&
              13 === e.keyCode &&
              e.altKey &&
              e.preventDefault();
          })
          .on("keyup", (e) => {
            const t = u.find(".mentions-autocomplete-list").data("assign");
            h(e) && !t && (this._addContent(), e.preventDefault());
          });
        var u = $("<span>").addClass("annotations-comment-area").appendTo(e);
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
                i.updateAssignee.call(this, $(e.target).val());
              })
            )),
          (this._assigneeCheckBox = $("<input>")
            .attr("type", "checkbox")
            .prop("checked", this._shouldAssign)
            .on("change", (e) => {
              (this._shouldAssign = $(e.target).prop("checked")),
                gDesigner.stats("replydocker_mention_assign-user", n);
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
                    s.get(new l("GAnnotationPanel", "text.assign-to"))
                  )
                )
                .append(this._onlyOneAssignee)
                .append(this._assigneeSelector)
            )
            .appendTo(u)),
          (t = $("<div>")
            .css("display", "none")
            .addClass("annotations-buttonrow")
            .append(
              $("<button>")
                .addClass("annotations-cancelcomment")
                .text(s.get(new l("GAnnotationPanel", "text.cancel")))
                .on("click", (e) => {
                  e.stopImmediatePropagation(),
                    gDesigner.stats("replydocker_cancel-reply", n),
                    t.hide(),
                    this._input.val("").attr("rows", 1).trigger("input"),
                    this._onCancel();
                })
            )
            .append(
              $("<button>")
                .addClass("annotations-addcomment")
                .text(
                  c
                    ? s.get(new l("GAnnotationPanel", "text.fill-contents"))
                    : s.get(new l("GAnnotationPanel", "text.comment"))
                )
                .on("click", () => {
                  gDesigner.stats("replydocker_add-reply", n),
                    this._addContent();
                })
            )
            .appendTo(u)),
          e.attr("draggable", !1);
        const g =
          c &&
          o.GPlatform.webBrowser !== o.GPlatform.constructor.WebBrowser.Safari;
        (this._input = $("<textarea>")
          .attr(
            "placeholder",
            s.get(
              new l(
                "GAnnotationPanel",
                c ? "text.write-annotation-here" : "text.write-reply-here"
              )
            )
          )
          .attr("rows", 1)
          .attr("autofocus", g)
          .addClass("annotations-comment-placeholder")
          .addClass("mention")
          .on("input", function () {
            if (gDesigner.isTouchEnabled())
              (this.style.height = 0),
                (this.style.height = this.scrollHeight + "px");
            else {
              const t = 18;
              var e = Math.ceil(this.scrollHeight / t);
              this.rows = Math.max(e, 5);
            }
          })
          .on("click", (e) => {
            $(e.target).attr("rows") <= 5 && $(e.target).attr("rows", 5),
              t.show(),
              i.showAssigneeRow.call(this, this._input),
              gDesigner.isTouchEnabled() && this.requestFocus();
          })
          .prependTo(u)),
          this._input
            .mentionsInput({
              onDataRequest: (e, t, n) => {
                let o = this._data.filter(
                  (e) =>
                    e
                      .getFullUserName()
                      .toLowerCase()
                      .includes(t.toLowerCase()) ||
                    (e.getEmail() &&
                      e.getEmail().toLowerCase().includes(t.toLowerCase()))
                );
                o.push(...this._additionalMentions), n.call(this, o);
              },
              onSelectItem: () => {
                gDesigner.stats("replydocker_mention_select-user", n);
              },
            })
            .on("input", () => {
              i.showAssigneeRow.call(this, this._input);
            }),
          u
            .find(".mentions-autocomplete-list")
            .delegate("li", "mousedown", () => {
              i.showAssigneeRow.call(this, this._input);
            }),
          c && (this._input.trigger("click"), this._input.focus());
      }),
      (g.prototype._addContent = function () {
        var e = i.replaceAdditionalCollabShowTextBeforeSend.call(
          this,
          $(this._input).val()
        );
        (e = e.trim()),
          this._onSubmit(e),
          this._shouldAssign &&
            this._assignees &&
            this._assignees.length &&
            this._onAssignTo(this._assignees);
      }),
      (g.prototype.requestFocus = function () {
        const e = this._input[0];
        e && e.focus ? e.focus() : this._input.focus();
      }),
      (g.prototype.forceSubmit = function () {
        this._addContent();
      }),
      (g.prototype.isVisible = function () {
        return (
          "none" !==
          this._containter.find(".annotations-buttonrow").css("display")
        );
      }),
      (g.prototype.show = function () {
        this._containter.find(".annotations-buttonrow").show();
      }),
      (g.prototype.hide = function () {
        this._containter.find(".annotations-buttonrow").hide();
      }),
      (g.prototype.scrollIntoView = function () {
        this._scrollToElement(this._input);
      }),
      (e.exports = g);
  }