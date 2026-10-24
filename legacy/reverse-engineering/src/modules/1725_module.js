/**
 * Webpack Module #1725
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13), n(32), n(33);
    var o = {
      init: function (e) {
        return (
          (e = $.extend({}, e)),
          this.each(function () {
            var t = $(this);
            if (
              (t.addClass("g-property-row"),
              e.hasOwnProperty("clazz") && t.addClass(e.clazz),
              e.hasOwnProperty("label") || e.hasOwnProperty("icon"))
            ) {
              var n = $('<label class="property-label"></label>').appendTo(t);
              if (e.hasOwnProperty("icon"))
                t.addClass("icon-label"),
                  n.addClass("strict-line-height"),
                  "string" == typeof e.icon
                    ? $("<span></span>").addClass(e.icon).appendTo(n)
                    : n.append(e.icon);
              else {
                var o = $("<span />").addClass("vertical-align").appendTo(n);
                "string" == typeof e.label
                  ? o.text(e.label)
                  : o.append(e.label);
              }
              e.click &&
                n
                  .addClass("clickable")
                  .find("span")
                  .append(
                    $("<span></span>").addClass("gravit-icon-down click-arrow")
                  )
                  .on("click", e.click);
            } else t.addClass("no-label");
            e.hasOwnProperty("justified") &&
              !0 === e.justified &&
              t.addClass("justified");
            var i = $("<div></div>").addClass("columns").appendTo(t);
            e.hasOwnProperty("clickable") &&
              e.clickable &&
              i.addClass("clickable"),
              e.hasOwnProperty("hoverable") &&
                e.hoverable &&
                i.addClass("hoverable"),
              e.hasOwnProperty("height") && i.css("height", e.height);
            var a = !1;
            if (
              (e.columns.forEach(function (t) {
                var n = "<div></div>";
                t.content &&
                  $(t.content).is(":input") &&
                  (n = "<label></label>");
                var o = $(n).addClass("column");
                if (
                  (t.hasOwnProperty("clazz") && o.addClass(t.clazz),
                  "auto" === t.width
                    ? o.addClass("auto-grow")
                    : t.width && o.css("width", t.width),
                  t.prefix)
                ) {
                  var r = "",
                    s = null;
                  "string" == typeof t.prefix
                    ? (r = t.prefix + "&nbsp;")
                    : ((r = t.prefix.label), (s = t.prefix.width || null)),
                    $("<div></div>")
                      .addClass("prefix")
                      .css("width", s)
                      .html(r)
                      .appendTo(o);
                }
                t.content
                  ? $("<div></div>")
                      .addClass("content")
                      .append(t.content)
                      .appendTo(o)
                  : t.html
                  ? $(t.html).appendTo(o)
                  : o.html("&nbsp;"),
                  (!t.content ||
                    (t.hasOwnProperty("padding") && !1 === t.padding)) &&
                    o.addClass("no-padding"),
                  t.label && (a = !0),
                  e.isMenu &&
                    ($("<div/>")
                      .addClass("gravit-icon-right")
                      .click(() => {
                        t.content.click();
                      })
                      .appendTo(o),
                    i.addClass("no-padding-left")),
                  e.hasOwnProperty("rawClick") &&
                    e.rawClick &&
                    o.on("click", e.rawClick),
                  e.noPaddingRight && i.addClass("no-padding-right"),
                  o.appendTo(i);
              }),
              a)
            ) {
              var r = $("<div></div>").addClass("labels").appendTo(t);
              e.columns.forEach(function (e) {
                var t = $("<label></label>");
                e.label
                  ? "string" == typeof e.label
                    ? $("<span></span>")
                        .text(e.label)
                        .addClass(e.labelClass ? e.labelClass : "")
                        .appendTo(t)
                    : t.append(e.label)
                  : t.html("&nbsp;"),
                  "auto" === e.width
                    ? t.addClass("auto-grow")
                    : e.width && t.css("width", e.width),
                  (!e.content ||
                    (e.hasOwnProperty("padding") && !1 === e.padding)) &&
                    t.addClass("no-padding"),
                  t.appendTo(r);
              });
            }
          })
        );
      },
    };
    $.fn.gPropertyRow = function (e) {
      return o[e]
        ? o[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : o.init.apply(this, arguments);
    };
  }