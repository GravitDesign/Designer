/**
 * Webpack Module #44
 * Type: class
 * Name: GSystemDialog
 */

function (e, t, n) {
    "use strict";
    n(19),
      n(30),
      n(57),
      n(8),
      n(20),
      n(34),
      n(4),
      n(13),
      n(32),
      n(38),
      n(33),
      n(26);
    var o = n(1),
      i = n(15);
    class a {
      static error(e) {
        let { showTitle: t = !0, closeCallback: n } =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        return a.custom({
          title: t
            ? o.GLocale.get(
                new o.GLocaleKey("GCommonNames", "text.something-wrong")
              )
            : "",
          subtitle: gApi.formatError(e),
          closeCallback: n,
        });
      }
      static externalFileError(e) {
        let t = e
          ? o.GLocale.get(
              new o.GLocaleKey("GContainer", "text.load-failed-from-recent")
            )
          : o.GLocale.get(
              new o.GLocaleKey("GContainer", "text.load-failed-from-link")
            );
        return a.custom({ subtitle: t, icon: "error" });
      }
      static splashScreenError(e, t, n) {
        var o = $("<div></div>").append(
          $("<div></div>").addClass("message").html(e)
        );
        const i = [];
        return (
          n &&
            i.push(
              $("<button></button>")
                .text(t)
                .on("click", (e) => {
                  n && n(e), o.gDialog("close");
                })
            ),
          o.gDialog({
            releaseOnClose: !0,
            className: "g-system-dialog g-splash-screen-error-dialog",
            buttons: i,
          }),
          o.gDialog("open", !1),
          o
        );
      }
      static async confirm(e, t, n, a, r, s, l, c) {
        if (c) {
          let e = () => {
            try {
              return gContainer.getProperty(c);
            } catch (e) {
              return !1;
            }
          };
          if (await e()) return;
        }
        var d = $("<div></div>").append(
          $("<div></div>").addClass("message").html(e)
        );
        let u;
        const p = (e) => {
          u && document.removeEventListener("keydown", u, !0),
            d.gDialog("close"),
            t && t(e);
        };
        (s || l) &&
          ((u = (e) => {
            s && i.GKey.translateKey(e.keyCode) === i.GKey.Constant.ENTER
              ? d.gDialog("isOpen") &&
                (e.preventDefault(), e.stopImmediatePropagation(), p(!0))
              : l &&
                i.GKey.translateKey(e.keyCode) === i.GKey.Constant.ESC &&
                d.gDialog("isOpen") &&
                (e.preventDefault(), e.stopImmediatePropagation(), p(!1));
          }),
          document.addEventListener("keydown", u, !0));
        const g = (e) => (e && "object" == typeof e ? e.text : e),
          h = (e) => !!e && "object" == typeof e && !!e.pro,
          f = !!(m = a) && "object" == typeof m && !!m.disabled;
        var m;
        d.gDialog({
          releaseOnClose: !0,
          className:
            "g-system-dialog g-confirm-dialog" + (c ? " g-onetime-dialog" : ""),
          buttons: [
            $("<button></button>")
              .text(
                g(n) || o.GLocale.get(new o.GLocaleKey("GLocale", "cancel"))
              )
              .gPro({ pro: h(n) })
              .on("click", () => {
                p(!1);
              }),
            $("<button></button>")
              .addClass("primary")
              .toggleClass("g-disabled", f)
              .text(g(a) || o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
              .gPro({ pro: h(a) })
              .on("click", () => {
                f || p(!0);
              }),
          ],
        }),
          c &&
            d
              .closest(".g-dialog")
              .find(".g-dialog-footer")
              .prepend(
                $("<label></label>").append([
                  $("<input>")
                    .attr("type", "checkbox")
                    .on("change", function () {
                      this.checked
                        ? gContainer.setProperty(c, !0)
                        : gContainer.setProperty(c, !1);
                    }),
                  $("<span></span>").text(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GSystemDialog",
                        "text.do-not-show-again"
                      )
                    )
                  ),
                ])
              ),
          null === r && (r = !1),
          d.gDialog("open", r);
      }
      static prompt(e, t, n, i, a, r) {
        var s = n && "string" != typeof n,
          l = s
            ? n
            : $("<input/>")
                .addClass("max-width")
                .attr("type", "text")
                .val(n || "")
                .on("keypress", (e) => {
                  13 === e.keyCode || "Enter" === e.key
                    ? (c.gDialog("close"), t && t(!!s || l.val()))
                    : (27 !== e.keyCode && "Escape" !== e.key) ||
                      (c.gDialog("close"), t && t());
                }),
          c = $("<div></div>")
            .append($("<div></div>").addClass("message").html(e))
            .append($("<div></div>").addClass("input").append(l));
        c.gDialog({
          releaseOnClose: !0,
          className: "g-system-dialog g-prompt-dialog " + r,
          buttons: [
            $("<button></button>")
              .text(i || o.GLocale.get(new o.GLocaleKey("GLocale", "cancel")))
              .on("click", () => {
                c.gDialog("close"), t && t();
              }),
            $("<button></button>")
              .addClass("primary")
              .text(a || o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
              .on("click", () => {
                t && (t(!!s || l.val()), c.gDialog("close"));
              }),
          ],
        }),
          c.gDialog("open", !0),
          c.find("input:first-child").focus().select();
      }
      static alert(e, t) {
        let { closeByEnter: n = !0, className: a } =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
        var r,
          s = $("<div></div>").append(
            $("<div></div>").addClass("message").html(e)
          );
        const l = () => {
          n && document.removeEventListener("keypress", r, !0),
            s.gDialog("close"),
            t && t();
        };
        return (
          (r = (e) => {
            i.GKey.translateKey(e.keyCode) === i.GKey.Constant.ENTER &&
              s.gDialog("isOpen") &&
              (e.preventDefault(), e.stopImmediatePropagation(), l());
          }),
          s.gDialog({
            releaseOnClose: !0,
            className: "g-system-dialog g-alert-dialog" + (a ? " " + a : ""),
            buttons: [
              $("<button></button>")
                .addClass("primary")
                .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                .on("click", () => l()),
            ],
          }),
          s.gDialog("open", !1),
          n && document.addEventListener("keypress", r, !0),
          s
        );
      }
      static showOneTimeDialog(e, t) {
        return gContainer.getProperty(t).then((n) => {
          if (!n) {
            var i = $("<div></div>").append(
              $("<div></div>").addClass("message").html(e)
            );
            return (
              i.gDialog({
                releaseOnClose: !0,
                className: "g-system-dialog g-onetime-dialog",
                buttons: [
                  $("<button></button>")
                    .addClass("primary")
                    .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                    .on("click", () => {
                      i.gDialog("close");
                    }),
                ],
              }),
              i
                .closest(".g-dialog")
                .find(".g-dialog-footer")
                .prepend(
                  $("<label></label>").append([
                    $("<input>")
                      .attr("type", "checkbox")
                      .on("change", function () {
                        this.checked
                          ? gContainer.setProperty(t, !0)
                          : gContainer.setProperty(t, !1);
                      }),
                    $("<span></span>").text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GSystemDialog",
                          "text.do-not-show-again"
                        )
                      )
                    ),
                  ])
                ),
              i.gDialog("open", !1),
              i
            );
          }
        });
      }
      static showCDRWarning() {
        return gDesigner.getSetting("disable_cdr_warning", !1)
          ? Promise.resolve()
          : this.info({
              className: "g-cdr-warning",
              setting: "disable_cdr_warning",
              title: o.GLocale.get(
                new o.GLocaleKey("GSystemDialog", "text.cdr-warning-title")
              ),
              label: o.GLocale.get(
                new o.GLocaleKey("GSystemDialog", "text.cdr-warning-label")
              ),
              message: o.GLocale.get(
                new o.GLocaleKey("GSystemDialog", "text.cdr-warning-message")
              ),
            });
      }
      static showCDRUnsupportedObjectWarning(e) {
        if (
          !this.isDialogOpen(".g-system-dialog.g-dialog-v1") &&
          !gDesigner.getSetting("disable_cdr_unsupported_effect", !1)
        ) {
          const t =
            e instanceof o.GStylable.Effect
              ? o.GLocale.get(
                  new o.GLocaleKey(
                    "GSystemDialog",
                    "text.cdr-unsupported-object-warning-effect-name"
                  )
                ).replace("%name", e.getNodeNameTranslated())
              : o.GLocale.get(
                  new o.GLocaleKey(
                    "GSystemDialog",
                    "text.cdr-unsupported-object-warning-generic-name"
                  )
                );
          return this.info({
            setting: "disable_cdr_unsupported_effect",
            title: o.GLocale.get(
              new o.GLocaleKey("GSystemDialog", "text.cdr-warning-title")
            ),
            label: o.GLocale.get(
              new o.GLocaleKey(
                "GSystemDialog",
                "text.cdr-unsupported-objects-warning-label"
              )
            ),
            message: o.GLocale.get(
              new o.GLocaleKey(
                "GSystemDialog",
                "text.cdr-unsupported-object-warning-message"
              )
            ).replace("%name", t),
          });
        }
        return Promise.resolve();
      }
      static showCDRUnsupportedObjectsWarning() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
        return gDesigner.getSetting("disable_cdr_unsupported_effects", !1)
          ? Promise.resolve(
              gDesigner.getSetting("default_cdr_unsupported_effects", 1)
            )
          : (gDesigner.stats("unsupported-dialog_open"),
            this.warning({
              setting: "disable_cdr_unsupported_effects",
              title: o.GLocale.get(
                new o.GLocaleKey(
                  "GSystemDialog",
                  "text.cdr-unsupported-objects-warning-title"
                )
              ),
              label: o.GLocale.get(
                new o.GLocaleKey(
                  "GSystemDialog",
                  "text.cdr-unsupported-objects-warning-label"
                )
              ),
              message: o.GLocale.get(
                new o.GLocaleKey(
                  "GSystemDialog",
                  "text.cdr-unsupported-objects-warning-message"
                )
              ),
              options: {
                setting: "default_cdr_unsupported_effects",
                values: [
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-0"
                    )
                  ),
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-1"
                    )
                  ),
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-2"
                    )
                  ),
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-3"
                    )
                  ),
                ],
                tooltips: [
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-0-tooltip"
                    )
                  ),
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-1-tooltip"
                    )
                  ),
                  "",
                  o.GLocale.get(
                    new o.GLocaleKey(
                      "GSystemDialog",
                      "text.cdr-unsupported-objects-warning-option-3-tooltip"
                    )
                  ),
                ],
                onClick: () => {
                  gDesigner.stats("unsupported-dialog_click_option");
                },
              },
              details: {
                label: o.GLocale.get(
                  new o.GLocaleKey(
                    "GSystemDialog",
                    "text.cdr-unsupported-objects-warning-details-label"
                  )
                ),
                onClick: () => {
                  gDesigner.stats("unsupported-dialog_click_details");
                },
                items: e,
              },
              onCancel: () => {
                gDesigner.stats("unsupported-dialog_click_cancel");
              },
              onSubmit: () => {
                gDesigner.stats("unsupported-dialog_click_submit");
              },
            }).then(
              (e) => (
                gDesigner.setSetting("default_cdr_unsupported_effects", e), e
              )
            ));
      }
      static warning(e) {
        return this._dialogV1(
          Object.assign(
            {
              icon: "assets/icon/dialog/warning.svg",
              buttons: [
                $("<button/>")
                  .text(o.GLocale.get(new o.GLocaleKey("GLocale", "cancel")))
                  .attr(
                    "data-title",
                    o.GLocale.get(
                      new o.GLocaleKey("GFilesPanel", "action.cancel-tooltip")
                    )
                  )
                  .on("click", (t) => {
                    e.onCancel && e.onCancel.call(this),
                      $(t.target)
                        .closest(".g-dialog-content")
                        .gDialog("close", !0);
                  }),
                $("<button/>")
                  .addClass("primary")
                  .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                  .on("click", (t) => {
                    e.onSubmit && e.onSubmit.call(this),
                      $(t.target).closest(".g-dialog-content").gDialog("close");
                  }),
              ],
            },
            e || {}
          )
        );
      }
      static info(e) {
        return this._dialogV1(
          Object.assign(
            {
              icon: "assets/icon/dialog/info.svg",
              buttons: [
                $("<button/>")
                  .addClass("primary")
                  .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                  .on("click", (e) =>
                    $(e.target).closest(".g-dialog-content").gDialog("close")
                  ),
              ],
            },
            e || {}
          )
        );
      }
      static isDialogOpen(e) {
        return $(e).length > 0;
      }
      static _dialogV1() {
        let {
          title: e = "",
          label: t = "",
          message: n = "",
          icon: i = "assets/icon/dialog/info.svg",
          closeable: a = !0,
          buttons: r = [],
          details: s,
          options: l,
          setting: c,
          className: d = "",
        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        const u = {},
          p = new Promise((e, t) =>
            Object.assign(u, { resolve: e, reject: t })
          ),
          g = $("<div></div>").gDialog({
            releaseOnClose: !0,
            className: "g-system-dialog g-dialog-v1 " + d,
            closeCallback: (e) => {
              e
                ? u.reject()
                : (c &&
                    gDesigner.setSetting(
                      c,
                      g
                        .find('input[data-property="'.concat(c, '"]'))
                        .is(":checked")
                    ),
                  l
                    ? u.resolve(
                        parseInt(
                          g.find('input[name="options"]:checked').val()
                        ) || 0
                      )
                    : u.resolve());
            },
          }),
          h = $("<header></header>")
            .append($("<span/>").addClass("title").text(e))
            .appendTo(g);
        return (
          a &&
            h.append(
              $("<div></div>")
                .addClass("g-btn-close")
                .append($("<span></span>").addClass("gravit-icon-close"))
                .on("click", () => g.gDialog("close", !0))
            ),
          $("<main></main>")
            .append(
              $("<img/>")
                .attr("src", i)
                .css("display", i ? "" : "none")
            )
            .append(
              $("<div/>")
                .addClass("container")
                .append(
                  $("<div/>")
                    .addClass("content")
                    .append($("<span/>").addClass("label").text(t))
                    .append($("<pre/>").addClass("message").text(n))
                    .append(
                      s
                        ? $("<div/>")
                            .addClass("details")
                            .append(
                              $("<label/>")
                                .append($("<span/>").text(s.label))
                                .append(
                                  $("<span/>").addClass("gravit-icon-down icon")
                                )
                                .on("click", (e) => {
                                  s.onClick && s.onClick.call(this);
                                  const t = $(e.target).closest(".details");
                                  t.find(".panel").toggleClass("collapsed"),
                                    t
                                      .find(".icon")
                                      .toggleClass(
                                        "gravit-icon-down gravit-icon-up"
                                      );
                                })
                            )
                            .append(
                              $("<div/>")
                                .addClass("panel collapsed")
                                .append(
                                  $("<ul/>").append(
                                    s.items.map((e) =>
                                      $("<li/>").append($("<span/>").text(e))
                                    )
                                  )
                                )
                            )
                        : ""
                    )
                    .append(
                      l
                        ? $("<div/>")
                            .addClass("options")
                            .append(
                              l.values.map((e, t) => {
                                let n = $("<label/>")
                                  .append(
                                    $("<input/>")
                                      .attr("type", "radio")
                                      .attr("name", "options")
                                      .attr("value", t)
                                      .prop(
                                        "checked",
                                        (e) =>
                                          e ===
                                          (l.setting
                                            ? gDesigner.getSetting(l.setting, 0)
                                            : 0)
                                      )
                                      .on("change", () => {
                                        l.onClick && l.onClick.call(this);
                                      })
                                  )
                                  .append($("<span/>").text(e));
                                return (
                                  l.tooltips &&
                                    l.tooltips[t] &&
                                    n.append(
                                      $("<span/>")
                                        .addClass("tooltip")
                                        .text("?")
                                        .attr("data-title", l.tooltips[t])
                                    ),
                                  n
                                );
                              })
                            )
                        : ""
                    )
                )
                .append(
                  $("<footer/>")
                    .append(
                      c
                        ? $("<label/>")
                            .append(
                              $("<input>")
                                .attr("type", "checkbox")
                                .attr("data-property", c)
                            )
                            .append(
                              $("<span/>").text(
                                o.GLocale.get(
                                  new o.GLocaleKey(
                                    "GSystemDialog",
                                    "text.do-not-show-again"
                                  )
                                )
                              )
                            )
                        : ""
                    )
                    .append(
                      r.length ? $("<div/>").addClass("buttons").append(r) : ""
                    )
                )
            )
            .appendTo(g),
          g.gDialog("open", a),
          p
        );
      }
      static messageWithInfo(e) {
        let { mainMessage: t, infoMessage: n } = e;
        const i = $("<div />").gDialog({
            releaseOnClose: !0,
            className: "g-system-dialog g-message-with-info-dialog",
            buttons: [
              $("<button/>")
                .addClass("primary")
                .text(o.GLocale.get(new o.GLocaleKey("GLocale", "ok")))
                .on("click", () => i.gDialog("close")),
            ],
          }),
          a = $("<div />").addClass("content").appendTo(i);
        return (
          t && a.append($("<div />").addClass("main-message").html(t)),
          n &&
            a.append(
              $("<div />")
                .addClass("info-message")
                .append(
                  $("<div />")
                    .addClass("info-message-icon")
                    .append(
                      $("<img/>").attr("src", "assets/icon/dialog/info.svg")
                    )
                )
                .append($("<div />").addClass("info-message-content").html(n))
            ),
          i.gDialog("open", !0)
        );
      }
      static custom(e) {
        let {
          title: t = "",
          subtitle: n = "",
          styles: i = {},
          footer: a,
          icon: r,
          buttons: s = [],
          openCallback: l,
          closeCallback: c,
          closeable: d = !0,
          className: u = "",
          dontShowAgainCb: p,
        } = e;
        var g = [];
        const h = $("<div></div>").gDialog({
          releaseOnClose: !0,
          className: "g-system-dialog g-custom-dialog ".concat(u),
          closeCallback: (e) => {
            g.length && (g.forEach((e) => Mousetrap.unbind(e)), (g = [])),
              c && c(e);
          },
          openCallback: l,
        });
        i.dialog && h.css(i.dialog),
          d &&
            $("<div></div>")
              .addClass("g-btn-close")
              .append($("<span></span>").addClass("gravit-icon-close"))
              .on("click", () => h.gDialog("close"))
              .appendTo(h),
          r &&
            $("<div></div>")
              .addClass("icon")
              .append($("<div></div>").addClass(r))
              .appendTo(h);
        let f = $("<div></div>")
          .addClass("content")
          .append($("<span></span>").addClass("title").html(t))
          .append($("<span></span>").addClass("subtitle").html(n))
          .appendTo(h);
        if (
          (a && f.append($("<span></span>").addClass("footer").html(a)),
          s && s.length)
        ) {
          var m = $("<div></div>").addClass("buttons");
          p &&
            m.prepend(
              $("<label></label>").append([
                $("<input>")
                  .attr("type", "checkbox")
                  .on("change", function () {
                    p(this.checked);
                  }),
                $("<span></span>")
                  .addClass("dont-show-this-again-message")
                  .text(
                    o.GLocale.get(
                      new o.GLocaleKey(
                        "GSystemDialog",
                        "text.do-not-show-again"
                      )
                    )
                  ),
              ])
            ),
            m.append(
              s.map((e) => {
                let {
                  label: t,
                  onclick: n,
                  highlighted: o,
                  className: i,
                  position: a,
                  shortcut: r,
                  closeOnClick: s = !1,
                } = e;
                var l = !1,
                  c = () => {
                    l ||
                      ((l = !0),
                      r && (Mousetrap.unbind(r), g.splice(g.indexOf(r), 1)),
                      g.length &&
                        (g.forEach((e) => Mousetrap.unbind(e)), (g = [])),
                      s && h.gDialog("close"),
                      n && n(h));
                  },
                  d = $("<button></button>")
                    .append($("<span></span>").text(t))
                    .addClass("g-pro-button " + (o ? "highlighted" : ""))
                    .on("click", () => c());
                return (
                  r && (Mousetrap.bind(r, c), g.push(r)),
                  i &&
                    ((i = i instanceof Array ? i : [i]),
                    i.forEach((e) => d.addClass(e))),
                  a && d.css("float", a),
                  d
                );
              })
            ),
            i.buttons && m.css(i.buttons),
            m.appendTo(f);
        }
        return h.gDialog("open", d), h;
      }
      static advanced(e) {
        let {
          title: t = "",
          buttons: n = [],
          closeCallback: o,
          closeable: i = !0,
        } = e;
        var a = [],
          r = $("<div></div>").append(
            $("<div></div>").addClass("message").html(t)
          );
        return (
          r.gDialog({
            releaseOnClose: !0,
            className: "g-system-dialog g-advanced-dialog",
            closeCallback: (e) => {
              a.length && (a.forEach((e) => Mousetrap.unbind(e)), (a = [])),
                o && o(e);
            },
            buttons: n.map((e) => {
              let {
                label: t,
                onclick: n,
                highlighted: o,
                className: i,
                position: s,
                shortcut: l,
                closeOnClick: c = !1,
              } = e;
              var d = !1,
                u = () => {
                  d ||
                    ((d = !0),
                    l && (Mousetrap.unbind(l), a.splice(a.indexOf(l), 1)),
                    a.length &&
                      (a.forEach((e) => Mousetrap.unbind(e)), (a = [])),
                    n(r),
                    c && r.gDialog("close", !1));
                },
                p = $("<button></button>")
                  .append($("<span></span>").text(t))
                  .addClass(o ? "primary" : "")
                  .on("click", () => u());
              return (
                l && (Mousetrap.bind(l, u), a.push(l)),
                i &&
                  ((i = i instanceof Array ? i : [i]),
                  i.forEach((e) => p.addClass(e))),
                s && p.css("float", s),
                p
              );
            }),
          }),
          r.gDialog("open", i),
          r
        );
      }
      toString() {
        return "[Object GSystemDialog]";
      }
    }
    (a.Shortcut = { Esc: "esc", Enter: "enter" }), (e.exports = a);
  }