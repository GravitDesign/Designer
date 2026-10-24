/**
 * Webpack Module #1731
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    var o = n(1),
      i = n(40),
      a = (n(173), !1),
      r = null,
      s = null;
    function l() {}
    function c(e, t) {
      var n = gDesigner.getActiveDocument().getEditor(),
        i = n.getSelection();
      if (i && i.length > 0) {
        var a = o.GLocale.get(
          new o.GLocaleKey("GDesignerStyleEditor", "text.style-attribution")
        );
        n.beginTransaction();
        try {
          for (var r = 0; r < i.length; ++r)
            t
              ? i[r].removeStyle(e.getReferenceId())
              : i[r].addStyle(e.getReferenceId());
        } finally {
          n.commitTransaction(a);
        }
        n.updateSelection(!1, i);
      }
    }
    function d(e, t, n, i) {
      var a = gDesigner.getActiveDocument();
      t ||
        ((n = new o.GStyle()).setProperty(
          "name",
          o.GLocale.get(
            new o.GLocaleKey("GDesignerStyleEditor", "text.new-style")
          )
        ),
        n.setProperty("defaultStyle", !1));
      var r = n.clone(),
        s = null;
      a.getEditor().getSelection() &&
        a.getEditor().getSelection().length > 0 &&
        (s = a.getEditor().getSelection()[0]),
        !t && s && r.assignStyleFrom(s);
      var l = t
          ? o.GLocale.get(
              new o.GLocaleKey("GDesignerStyleEditor", "text.style-editor")
            )
          : o.GLocale.get(
              new o.GLocaleKey("GDesignerStyleEditor", "text.style-creator")
            ),
        d = $("<div/>")
          .append($("<span/>").text(l))
          .addClass("creator-toolbar"),
        u = $("<input/>")
          .css("align-self", "center")
          .css("width", "100%")
          .attr("type", "text")
          .val(n.getProperty("name")),
        g = $("<div/>")
          .addClass("style")
          .append(
            $("<img/>")
              .css("align-self", "center")
              .css("margin-left", "10px")
              .attr("src", gDesigner.getStylePreview(r, s instanceof o.GText))
          )
          .append(u),
        f = $("<div/>")
          .addClass("checkboxes")
          .append(
            $("<div/>")
              .append(
                $("<input/>")
                  .attr("data-property", "style")
                  .attr("type", "checkbox")
                  .prop(
                    "checked",
                    !t ||
                      $.inArray(
                        o.GStylable.PropertySet.Style,
                        n.getProperty("ps")
                      ) >= 0
                  )
              )
              .append(
                $("<span/>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GDesignerStyleEditor", "text.style")
                  )
                )
              )
              .addClass("checkbox")
          )
          .append(
            $("<div/>")
              .append(
                $("<input/>")
                  .attr("data-property", "fill")
                  .attr("type", "checkbox")
                  .prop(
                    "checked",
                    !t ||
                      $.inArray(
                        o.GStylable.PropertySet.FillPaintLayers,
                        n.getProperty("ps")
                      ) >= 0
                  )
              )
              .append(
                $("<span/>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GDesignerStyleEditor", "text.fill")
                  )
                )
              )
              .addClass("checkbox")
          )
          .append(
            $("<div/>")
              .append(
                $("<input/>")
                  .attr("data-property", "border")
                  .attr("type", "checkbox")
                  .prop(
                    "checked",
                    !t ||
                      $.inArray(
                        o.GStylable.PropertySet.BorderPaintLayers,
                        n.getProperty("ps")
                      ) >= 0
                  )
              )
              .append(
                $("<span/>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GDesignerStyleEditor", "text.border")
                  )
                )
              )
              .addClass("checkbox")
          )
          .append(
            $("<div/>")
              .append(
                $("<input/>")
                  .attr("data-property", "effects")
                  .attr("type", "checkbox")
                  .prop(
                    "checked",
                    !t ||
                      $.inArray(
                        o.GStylable.PropertySet.Effects,
                        n.getProperty("ps")
                      ) >= 0
                  )
              )
              .append(
                $("<span/>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GDesignerStyleEditor", "text.effects")
                  )
                )
              )
              .addClass("checkbox")
          )
          .append(
            $("<div/>")
              .append(
                $("<input/>")
                  .attr("data-property", "text")
                  .attr("type", "checkbox")
                  .prop(
                    "checked",
                    t
                      ? $.inArray(
                          o.GStylable.PropertySet.Text,
                          n.getProperty("ps")
                        ) >= 0
                      : s instanceof o.GText
                  )
              )
              .append(
                $("<span/>").text(
                  o.GLocale.get(
                    new o.GLocaleKey("GDesignerStyleEditor", "text.text")
                  )
                )
              )
              .addClass("checkbox")
          ),
        m = $("<div/>"),
        y = $("<div/>")
          .append(
            $("<button/>")
              .html(
                t
                  ? o.GLocale.get(
                      new o.GLocaleKey("GCommonNames", "action.apply")
                    )
                  : o.GLocale.get(
                      new o.GLocaleKey("GDesignerStyleEditor", "action.create")
                    )
              )
              .on("click", function () {
                gDesigner.stats("designerstyle_click_create");
                var r = [];
                if (
                  (f.find('input[data-property="style"]').is(":checked") &&
                    r.push(o.GStylable.PropertySet.Style),
                  f.find('input[data-property="fill"]').is(":checked") &&
                    r.push(o.GStylable.PropertySet.FillPaintLayers),
                  f.find('input[data-property="border"]').is(":checked") &&
                    r.push(o.GStylable.PropertySet.BorderPaintLayers),
                  f.find('input[data-property="effects"]').is(":checked") &&
                    r.push(o.GStylable.PropertySet.Effects),
                  f.find('input[data-property="text"]').is(":checked") &&
                    (r.push(o.GStylable.PropertySet.Text),
                    r.push(o.GStylable.PropertySet.Paragraph)),
                  n.setProperties(["name", "ps"], [g.find("input").val(), r]),
                  !t)
                ) {
                  if (
                    (s && n.assignStyleFrom(s),
                    a.getScene().getStyles().appendChild(n),
                    h(n, e, !1, i),
                    i.parent())
                  ) {
                    var l = i.parent();
                    l.offset().top + l.height() > document.body.clientHeight &&
                      l.offset({
                        top: l.offset().top - 34,
                        left: l.offset().left,
                      });
                  }
                  c(n);
                }
                gDesigner.createNewStylePreview(n, !0, s instanceof o.GText),
                  m.gOverlay("close", e),
                  !t && i && i.gOverlay("close"),
                  p(
                    t
                      ? $(".g-style-creator").find(".styles")
                      : $(".g-style-editor").find(".styles:not(.no-style)"),
                    t
                  );
              })
          )
          .addClass("creator-toolbar bottom");
      m.addClass("g-style-creator")
        .append(d)
        .append($("<div/>").addClass("styles").append(g))
        .append(f)
        .append(y)
        .gOverlay({ padding: !1, releaseOnClose: !0 })
        .gOverlay("open", e);
      var v = m.parent().offset().top,
        _ = m.parent().offset().left;
      m.parent().offset({ top: v, left: _ - 100 }), u.focus();
    }
    function u(e) {
      if (r) {
        var t = $(e).data("style");
        return t && t.getReferenceId() !== r.getReferenceId();
      }
      return !1;
    }
    function p(e, t) {
      if ((e.empty(), gDesigner.getActiveDocument().getScene().getStyles())) {
        var n = gDesigner.getActiveDocument().getScene().getStyles();
        t ||
          ($(".g-style-editor").find(".no-style").empty(),
          f($(".g-style-editor").find(".no-style")));
        for (var o = n.getFirstChild(); null !== o; o = o.getNext())
          !1 === o.getProperty("defaultStyle") && h(o, e, t);
      }
    }
    function g(e) {
      var t = gDesigner.getActiveDocument().getEditor().getSelection();
      return (
        !!(t && t.length > 0) && t[0].getProperty("sref") === e.getReferenceId()
      );
    }
    function h(e, t, n, i) {
      var l = function (e) {
          if (!a) return e.preventDefault(), void e.stopPropagation();
          var n = (s = $(e.target).closest(".style")).offset(),
            o = e.originalEvent;
          o.stopPropagation(),
            (r = s.data("style")),
            !1,
            o.pageX - n.left,
            o.pageY - n.top,
            (o.dataTransfer.effectAllowed = "move"),
            o.dataTransfer.setData("text/plain", "dummy_data"),
            t.find(".style").each(function (e, n) {
              $(n)
                .on("dragenter", function (e) {
                  u(this) &&
                    ($(this).parent().find(".style").removeClass("g-drop"),
                    $(this).addClass("g-drop"));
                })
                .on("dragleave", function (e) {
                  u(this) &&
                    $(e.target).parent() !== this &&
                    e.target !== this &&
                    $(this).removeClass("g-drop");
                })
                .on("dragover", function (e) {
                  var t = e.originalEvent;
                  u(this) &&
                    (t.preventDefault(),
                    t.stopPropagation(),
                    (t.dataTransfer.dropEffect = "move"));
                })
                .on("drop", function () {
                  var e = $(this);
                  e.removeClass("g-drop"), !0;
                  var n = e.data("style");
                  if (r && n && r.getParent() === n.getParent()) {
                    var o = r.getParent(),
                      i = o.getIndexOfChild(r),
                      a = o.getIndexOfChild(n);
                    o.removeChild(r),
                      o.insertChild(r, i < a ? n.getNext() : n),
                      p(t, !0);
                  }
                });
            });
        }.bind(this),
        h = function () {
          !1;
        }.bind(this),
        f = $("<div/>").addClass("style").data("style", e).appendTo(t);
      $("<div/>").addClass("style-selector").appendTo(f),
        n &&
          f
            .attr("draggable", !0)
            .on("mousedown", function (e) {
              a =
                $(e.target).hasClass("style") ||
                $(e.target).parent().hasClass("style");
            })
            .on("dragstart", l)
            .on("dragend", h),
        n ||
          f
            .attr("data-selected", g(e) ? "yes" : "no")
            .addClass(g(e) ? "g-selected" : "")
            .on("click", function () {
              var t = $(this);
              gDesigner.stats(
                "designerstyle_click_assign",
                e && e.getReferenceId()
              ),
                "no" === t.attr("data-selected") &&
                  ($(".g-style-editor")
                    .find(".style")
                    .removeClass("g-selected"),
                  $(".g-style-editor")
                    .find(".style")
                    .attr("data-selected", "no"),
                  t.attr("data-selected", "yes").addClass("g-selected"),
                  c(e)),
                i && i.gOverlay("close");
            });
      var m = null,
        y = gDesigner.getActiveDocument().getEditor().getSelection();
      if (
        (y && y.length > 0 && (m = y[0]),
        f.append(
          $("<img/>")
            .css("align-self", "center")
            .attr("src", gDesigner.getStylePreview(e, m instanceof o.GText))
        ),
        $("<span/>")
          .css({
            alignSelf: "center",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
            width: "200px",
          })
          .text(e.getProperty("name"))
          .appendTo(f),
        n)
      )
        $("<div/>")
          .addClass("styles-buttons")
          .css("display", "none")
          .append(
            $("<button/>")
              .addClass("g-flat")
              .css("align-self", "center")
              .append($("<span/>").addClass("gravit-icon-trash"))
              .on("click", function () {
                gDesigner.stats(
                  "designerstyle_click_disconnect",
                  e && e.getReferenceId()
                ),
                  e.disconnectStyle(),
                  gDesigner
                    .getActiveDocument()
                    .getScene()
                    .getStyles()
                    .removeChild(e),
                  f.remove();
              })
          )
          .append(
            $("<button/>")
              .addClass("g-flat")
              .css("align-self", "center")
              .append($("<span/>").addClass("gravit-icon-settings"))
              .on("click", function () {
                gDesigner.stats(
                  "designerstyle_click_open",
                  e && e.getReferenceId()
                ),
                  d(f, !0, e);
              })
          )
          .appendTo(f);
      t.hasClass("styles") || t.addClass("styles");
    }
    function f(e, t) {
      var n = gDesigner.getActiveDocument().getEditor().getSelection();
      if (n && n.length > 0) {
        var i = $("<div/>").addClass("style").appendTo(e),
          a = n[0],
          r = !a.getProperty("sref");
        $("<div/>").addClass("style-selector").appendTo(i),
          i
            .attr("data-selected", r ? "yes" : "no")
            .addClass(r ? "g-selected" : "")
            .on("click", function () {
              var e = $(this);
              "no" === e.attr("data-selected") &&
                (e
                  .parent()
                  .find(".style")
                  .attr("data-selected", "no")
                  .removeClass("g-selected"),
                e.attr("data-selected", "yes").addClass("g-selected"),
                c(a.getReferencedStyle(), !0)),
                t && t.gOverlay("close");
            }),
          $("<span/>")
            .css("align-self", "center")
            .text(
              o.GLocale.get(
                new o.GLocaleKey("GDesignerStyleEditor", "text.no-style")
              )
            )
            .css("width", "165px")
            .css("margin-left", "10px")
            .appendTo(i),
          e.hasClass("styles") ||
            (e.addClass("styles"), e.addClass("no-style"));
      }
    }
    o.GObject.inheritAndMix(l, o.GObject);
    var m = {
      init: function () {
        return this.each(function () {
          var e = this,
            t = $(this),
            n = function () {
              var n = $("<div/>"),
                i = $("<div/>"),
                a = $("<div></div>")
                  .addClass("g-style-editor")
                  .css("width", "250px");
              if (
                (f(n, a), gDesigner.getActiveDocument().getScene().getStyles())
              )
                for (
                  var r = gDesigner
                    .getActiveDocument()
                    .getScene()
                    .getStyles()
                    .getFirstChild();
                  null !== r;
                  r = r.getNext()
                )
                  !1 === r.getProperty("defaultStyle") && h(r, i, !1, a);
              var s = $("<div/>")
                .addClass("style-toolbar")
                .append(
                  $("<div/>")
                    .append(
                      $("<button/>")
                        .addClass("g-flat")
                        .html(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GDesignerStyleEditor",
                              "action.create-new-style"
                            )
                          )
                        )
                    )
                    .on("click", function () {
                      gDesigner.stats("designerstyle_click_createnewstyle"),
                        d(i, !1, null, a);
                    })
                )
                .append(
                  $("<div/>")
                    .append(
                      $("<button/>")
                        .addClass("g-flat")
                        .html(
                          o.GLocale.get(
                            new o.GLocaleKey(
                              "GDesignerStyleEditor",
                              "action.organize-styles"
                            )
                          ) + "..."
                        )
                    )
                    .on("click", function () {
                      gDesigner.stats("designerstyle_click_organize"),
                        (function (e) {
                          var t = $("<div/>")
                              .append(
                                $("<span/>").text(
                                  o.GLocale.get(
                                    new o.GLocaleKey(
                                      "GDesignerStyleEditor",
                                      "text.style-organizer"
                                    )
                                  )
                                )
                              )
                              .addClass("creator-toolbar"),
                            n = $("<div/>"),
                            i = gDesigner
                              .getActiveDocument()
                              .getScene()
                              .getStyles(),
                            a = !1;
                          if (i)
                            for (
                              var r = i.getFirstChild();
                              null !== r;
                              r = r.getNext()
                            )
                              !1 === r.getProperty("defaultStyle") &&
                                ((a = !0), h(r, n, !0));
                          a || f(n);
                          var s = $("<div/>"),
                            l = $("<div/>")
                              .append(
                                $("<button/>")
                                  .html(
                                    o.GLocale.get(
                                      new o.GLocaleKey(
                                        "GCommonNames",
                                        "text.finish"
                                      )
                                    )
                                  )
                                  .on("click", function () {
                                    gDesigner.stats(
                                      "designerstyle_click_finish"
                                    );
                                    var t = $(".g-style-editor").find(
                                      ".styles:not(.no-style)"
                                    );
                                    if ((t.empty(), i))
                                      for (
                                        var n = i.getFirstChild();
                                        null !== n;
                                        n = n.getNext()
                                      )
                                        !1 === n.getProperty("defaultStyle") &&
                                          h(n, t, !1, e);
                                    s.gDialog("close");
                                  })
                              )
                              .addClass("creator-toolbar bottom");
                          s.append(t).append(n).append(l).gDialog({
                            releaseOnClose: !0,
                            className: "g-style-creator organizer",
                          }),
                            s.gDialog("open", !1);
                        })(a);
                    })
                );
              a.append(n)
                .append(i)
                .append(s)
                .on("open", function () {
                  t.trigger("open");
                })
                .on("close", function () {
                  t.trigger("close");
                })
                .gOverlay({ padding: !1, releaseOnClose: !0 })
                .gOverlay("open", e);
            };
          t.gPro().on(
            "click",
            i.watchDog.trap(
              function () {
                gDesigner.stats("designerstyle_click_openpanel"),
                  t.find(".g-styles-field").hasClass("g-disabled") || n();
              },
              null,
              () => {
                gDesigner.stats("designerstyle_nonprotriespro_openpanel");
              }
            )
          );
        });
      },
      value: function (e) {},
    };
    (e.exports = l),
      ($.fn.gDesignerStyleEditor = function (e) {
        return m[e]
          ? m[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : m.init.apply(this, arguments);
      });
  }