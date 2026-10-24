/**
 * Webpack Module #1716
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(57),
      n(356),
      n(20),
      n(3),
      n(71),
      n(34),
      n(91),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(33);
    var i = o(n(883)),
      a = n(263),
      r = 8,
      s = 9,
      l = 13,
      c = 37,
      d = 38,
      u = 39,
      p = 40,
      g = 36,
      h = 35,
      f = {
        triggerChar: "@",
        onDataRequest: $.noop,
        minChars: 1,
        allowRepeat: !1,
        showAvatars: !0,
        elastic: !0,
        defaultValue: "",
        onCaret: !0,
        classes: { autoCompleteItemActive: "active" },
        templates: {
          wrapper: '<div class="mentions-input-box"></div>',
          autocompleteList: '<div class="mentions-autocomplete-list"></div>',
          autocompleteListItem:
            '<li data-ref-id="<%=id%>" data-ref-type="<%=type%>" data-display="<%=display%>" data-style="<%=fontWeight%>"><%=content%></li>',
          autocompleteListItemAvatar: '<img src="<%=avatar%>"/>',
          autocompleteListItemLetterAvatar:
            '<div class="avatar g-user-commit-avatar"><%=letterAvatarsValue%></div>',
          autocompleteListItemIcon: '<div class="icon <%=icon%>"></div>',
          mentionsOverlay: '<div class="mentions"><div></div></div>',
          mentionItemSyntax: "@[<%=value%>](<%=type%>:<%=id%>)",
          mentionItemHighlight:
            '<strong><span id="<%=id%>"><%=value%></span></strong>',
        },
      },
      m = 0,
      y = function (e) {
        return $("<div>").text(e).html();
      },
      v = function (e) {
        return e.replace(a.GRegex.String.MentionInputRegexpEncode, "\\$1");
      },
      _ = function (e, t, n) {
        return !t || (t instanceof Array && !t.length) || !n
          ? e
          : e.replace(
              new RegExp(
                a.GRegex.String.MentionInputHighlightRegString.replace(
                  "<%=term%>",
                  t
                ),
                "gi"
              ),
              "<b>$1</b>"
            );
      },
      b = function (e, t) {
        if (e.createTextRange) {
          var n = e.createTextRange();
          n.move("character", t), n.select();
        } else
          e.selectionStart ? (e.focus(), e.setSelectionRange(t, t)) : e.focus();
      },
      w = function (e) {
        return e.replace(a.GRegex.String.MentionInputRtrim, "");
      },
      C = function (e) {
        let t = ++m + "";
        return e ? e + t : t;
      },
      x = function (e, t) {
        return (
          t.forEach((t) => {
            e = e.replace(t.key, t.value);
          }),
          e
        );
      },
      S = function (e) {
        var t,
          n,
          o,
          a,
          m,
          S,
          E = [],
          A = {},
          T = [],
          G = "";
        function P() {
          var n = I(),
            o = [];
          E.forEach((e) => {
            o.some((t) => t.name === e.name) || o.push(e);
          }),
            o.forEach((t) => {
              let o = x(e.templates.mentionItemSyntax, [
                { key: "<%=value%>", value: t.value },
                { key: "<%=type%>", value: t.type },
                { key: "<%=id%>", value: t.getUID() },
              ]);
              n = n.replace(new RegExp(v(t.value), "g"), o);
            });
          var i = y(n);
          o.forEach((t) => {
            let n = y(t.value),
              o = x(e.templates.mentionItemSyntax, [
                { key: "<%=value%>", value: t.value },
                { key: "<%=type%>", value: t.type },
                { key: "<%=id%>", value: t.getUID() },
              ]),
              a = x(e.templates.mentionItemHighlight, [
                { key: "<%=value%>", value: n },
                { key: "<%=id%>", value: t.getUID() },
              ]);
            i = i.replace(new RegExp(v(o), "g"), a);
          }),
            (i = (i = i.replace(/\n/g, "<br />")).replace(/ {2}/g, "&nbsp; ")),
            t.data("messageText", n),
            t.trigger("updated"),
            m.find("div").html(i);
        }
        function D() {
          T = [];
        }
        function L(n) {
          for (
            var o = I(),
              i = t[0].selectionStart,
              a = !1,
              r = !1,
              s = new RegExp("\\" + e.triggerChar + G, "gi");
            s.exec(o);

          )
            (!1 === a || Math.abs(s.lastIndex - i) < a) &&
              ((a = Math.abs(s.lastIndex - i)), (r = s.lastIndex));
          var l = r - G.length - 1,
            c = r,
            d = o.substr(0, l),
            u = o.substr(c, o.length),
            p = (d + n.value).length + 1;
          E.find((e) => e.id === n.id) || E.push(n), D(), (G = ""), B();
          var g = d + n.value + " " + u;
          t.val(g), t.trigger("mention"), P(), t.focus(), b(t[0], p);
        }
        function I() {
          return $.trim(t.val());
        }
        function k() {
          var e,
            n,
            o = $(this);
          return (
            L(A[o.attr("data-uid")]),
            (e = $(t).offset().top),
            (n = $("body").offset().top),
            $(window).scrollTop() > e && $(window).scrollTop(e - n),
            !1
          );
        }
        function O() {
          D();
        }
        function F() {
          B();
        }
        function R() {
          var t;
          P(),
            (t = I()),
            (E = (E = E.filter((e) => e.value && t.includes(e.value))).filter(
              (e) => e
            ));
          var n = T.lastIndexOf(e.triggerChar);
          n > -1 &&
            ((G = T.slice(n + 1).join("")),
            (G = w(G)),
            setTimeout(() => {
              K.call(this, G);
            }, 1));
        }
        function M(e) {
          if (e.keyCode !== r) {
            var t = String.fromCharCode(e.which || e.keyCode);
            T.push(t);
          }
        }
        function N(e) {
          if (
            (o.data("assign", o.find("li").length),
            e.keyCode === c ||
              e.keyCode === u ||
              e.keyCode === g ||
              e.keyCode === h)
          )
            return (
              setTimeout(D, 1),
              void (
                navigator.userAgent.indexOf("MSIE 9") > -1 && setTimeout(P, 1)
              )
            );
          if (e.keyCode !== r) {
            if (!o.is(":visible")) return !0;
            switch (e.keyCode) {
              case d:
              case p:
                var t = null;
                return (
                  (t =
                    e.keyCode === p
                      ? S && S.length
                        ? S.next()
                        : o.find("li").first()
                      : $(S).prev()).length && U(t),
                  !1
                );
              case l:
              case s:
                if ((e.stopPropagation(), S && S.length))
                  return S.trigger("mousedown"), !1;
            }
            return !0;
          }
          T = T.slice(0, -1 + T.length);
        }
        function B() {
          (S = null), o.empty().hide();
        }
        function U(t) {
          t.addClass(e.classes.autoCompleteItemActive),
            t.siblings().removeClass(e.classes.autoCompleteItemActive),
            (S = t);
        }
        function j(n, i) {
          if ((o.show(), !e.allowRepeat)) {
            let e = E.map((e) => e.value);
            i = i.filter((t) => !e.includes(t.showText));
          }
          if (i.length) {
            o.empty();
            var a = $("<ul>").appendTo(o).css("visibility", "hidden");
            i.forEach((t, o) => {
              let i = C("mention_");
              t.setValue(t.showText), (A[i] = t);
              let r = $(
                x(e.templates.autocompleteListItem, [
                  { key: "<%=id%>", value: y(t.getUID()) },
                  { key: "<%=display%>", value: y(t.getFullUserName()) },
                  { key: "<%=type%>", value: y(t.type) },
                  {
                    key: "<%=content%>",
                    value: _(
                      y(
                        t.display
                          ? t.display
                          : ""
                              .concat(t.getFullUserName())
                              .concat(
                                t.getEmail() ? "\n ".concat(t.getEmail()) : ""
                              )
                      ),
                      n,
                      !1
                    ),
                  },
                  { key: "<%=fontWeight%>", value: y(t.fontWeight) },
                ])
              ).attr("data-uid", i);
              if ((0 === o && U(r), e.showAvatars)) {
                var s, l;
                if (((l = t.getUserNameInitials()), t.avatar))
                  if ("assets/icon/notification-icon.svg" === t.avatar) {
                    let t;
                    (t =
                      "light" === gDesigner.getSetting("theme", "light")
                        ? "assets/icon/notification-icon-light.svg"
                        : "assets/icon/notification-icon-dark.svg"),
                      (s = $(
                        x(e.templates.autocompleteListItemAvatar, [
                          { key: "<%=avatar%>", value: t },
                        ])
                      ));
                  } else
                    t.hasOwnPictureAvatar()
                      ? (s = $(
                          x(e.templates.autocompleteListItemAvatar, [
                            { key: "<%=avatar%>", value: t.avatar },
                          ])
                        ))
                      : (s = $(
                          x(e.templates.autocompleteListItemLetterAvatar, [
                            { key: "<%=letterAvatarsValue%>", value: l },
                          ])
                        )).css({ "background-color": t.getUserColor() });
                else
                  (s = $(
                    x(e.templates.autocompleteListItemLetterAvatar, [
                      { key: "<%=letterAvatarsValue%>", value: l },
                    ])
                  )).css({ "background-color": t.getUserColor() });
                s.prependTo(r);
              }
              r = r.appendTo(a);
            }),
              o.show(),
              e.onCaret &&
                (function (e, t) {
                  var n,
                    o = e.css("position");
                  if ("absolute" === o) {
                    var i = (function (e) {
                      var t, n, o, i, a, r, s, l, c, d, u;
                      if (
                        (c = e[0]) &&
                        $(c).is("textarea") &&
                        null !== c.selectionEnd
                      ) {
                        for (
                          s = {
                            position: "absolute",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            boxSizing: "content-box",
                            top: 0,
                            left: -9999,
                          },
                            d = 0,
                            u = (l = [
                              "boxSizing",
                              "fontFamily",
                              "fontSize",
                              "fontStyle",
                              "fontVariant",
                              "fontWeight",
                              "height",
                              "letterSpacing",
                              "lineHeight",
                              "paddingBottom",
                              "paddingLeft",
                              "paddingRight",
                              "paddingTop",
                              "textDecoration",
                              "textIndent",
                              "textTransform",
                              "width",
                              "word-spacing",
                            ]).length;
                          d < u;
                          d++
                        )
                          s[(a = l[d])] = $(c).css(a);
                        return (
                          (o = document.createElement("div")),
                          $(o).css(s),
                          $(c).after(o),
                          (n = document.createTextNode(
                            c.value.substring(0, c.selectionEnd)
                          )),
                          (t = document.createTextNode(
                            c.value.substring(c.selectionEnd)
                          )),
                          ((i = document.createElement("span")).innerHTML =
                            "&nbsp;"),
                          o.appendChild(n),
                          o.appendChild(i),
                          o.appendChild(t),
                          (o.scrollTop = c.scrollTop),
                          (r = $(i).position()),
                          $(o).remove(),
                          r
                        );
                      }
                    })(t);
                    (n = parseInt(t.css("line-height"), 10) || 18),
                      e.css("width", "15em"),
                      e.css("left", i.left),
                      e.css("top", n + i.top);
                    var a = t.offset().left + t.width(),
                      r = e.offset().left + e.width();
                    a <= r &&
                      e.css("left", Math.abs(e.position().left - (r - a)));
                  } else if ("fixed" === o) {
                    var s = (function (e) {
                      var t, n, o, i, a, r, s, l, c, d, u;
                      if (
                        (c = e[0]) &&
                        $(c).is("textarea") &&
                        null !== c.selectionEnd
                      ) {
                        for (
                          s = {
                            position: "absolute",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            boxSizing: "content-box",
                            top: 0,
                            left: -9999,
                          },
                            d = 0,
                            u = (l = [
                              "boxSizing",
                              "fontFamily",
                              "fontSize",
                              "fontStyle",
                              "fontVariant",
                              "fontWeight",
                              "height",
                              "letterSpacing",
                              "lineHeight",
                              "paddingBottom",
                              "paddingLeft",
                              "paddingRight",
                              "paddingTop",
                              "textDecoration",
                              "textIndent",
                              "textTransform",
                              "width",
                              "word-spacing",
                            ]).length;
                          d < u;
                          d++
                        )
                          s[(a = l[d])] = $(c).css(a);
                        return (
                          (o = document.createElement("div")),
                          $(o).css(s),
                          $(c).after(o),
                          (n = document.createTextNode(
                            c.value.substring(0, c.selectionEnd)
                          )),
                          (t = document.createTextNode(
                            c.value.substring(c.selectionEnd)
                          )),
                          ((i = document.createElement("span")).innerHTML =
                            "&nbsp;"),
                          o.appendChild(n),
                          o.appendChild(i),
                          o.appendChild(t),
                          (o.scrollTop = c.scrollTop),
                          (r = $(i).offset()),
                          $(o).remove(),
                          r
                        );
                      }
                    })(t);
                    (n = parseInt(t.css("line-height"), 10) || 18),
                      e.css("width", "15em"),
                      e.css("left", s.left + 1e4),
                      e.css("top", n + s.top);
                  }
                })(o, t),
              a.css("visibility", "visible");
          } else B();
        }
        function K(t) {
          t && t.length && t.length >= e.minChars
            ? e.onDataRequest.call(this, "search", t, function (e) {
                j(t, e);
              })
            : B();
        }
        function V(n) {
          E = [];
          for (
            var o,
              a = y(n),
              r = new RegExp(
                "(" + e.triggerChar + ")\\[(.*?)\\]\\((.*?):(.*?)\\)",
                "gi"
              ),
              s = a;
            null !== (o = r.exec(a));

          )
            (s = s.replace(o[0], o[1] + o[2])),
              E.push(
                new i.default({
                  id: o[4],
                  type: o[3],
                  value: o[2],
                  trigger: o[1],
                })
              );
          t.val(s), P();
        }
        return (
          (e = $.extend(!0, {}, f, e)),
          {
            init: function (i) {
              "true" !== (t = $(i)).attr("data-mentions-input") &&
                ((n = t.parent()),
                (a = $(e.templates.wrapper)),
                t.wrapAll(a),
                (a = n.find("> div.mentions-input-box")),
                t.attr("data-mentions-input", "true"),
                t.bind("keydown", N),
                t.bind("keypress", M),
                t.bind("click", O),
                t.bind("blur", F),
                t.bind("input", R),
                e.elastic && t.elastic()),
                (o = $(e.templates.autocompleteList)).appendTo(a),
                o.delegate("li", "mousedown", k),
                (m = $(e.templates.mentionsOverlay)).prependTo(a),
                V(e.defaultValue),
                e.prefillMention && L(e.prefillMention);
            },
            val: function (e) {
              $.isFunction(e) &&
                e.call(this, E.length ? t.data("messageText") : I());
            },
            reset: function () {
              V();
            },
            reinit: function () {
              V(!1);
            },
            getMentions: function (e) {
              $.isFunction(e) && e.call(this, E);
            },
            setMentions: function (e) {
              e && e.length && (E = e);
            },
          }
        );
      };
    $.fn.mentionsInput = function (e, t) {
      var n = arguments;
      return (
        ("object" != typeof e && e) || (t = e),
        this.each(function () {
          var o =
            $.data(this, "mentionsInput") ||
            $.data(this, "mentionsInput", new S(t));
          return $.isFunction(o[e])
            ? o[e].apply(this, Array.prototype.slice.call(n, 1))
            : "object" != typeof e && e
            ? void $.error("Method " + e + " does not exist")
            : o.init.call(this, this);
        })
      );
    };
  }