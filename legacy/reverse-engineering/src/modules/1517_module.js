/**
 * Webpack Module #1517
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.REARRANGE_TAB_SELECTOR = t.REARRANGE_TAB_CLASS = void 0),
      (t.allowRearrangeTabs = function (e) {
        $(".tabs").sortable({
          axis: "x",
          containment: $("#header"),
          revert: 150,
          activate: function (e, t) {
            $(t.item[0]).trigger("click"),
              $(t.placeholder[0]).css({ height: "1px" });
            var n = t.item.offset().top;
            $(".tabs")
              .children()
              .map(function () {
                $(this).hasClass("ui-sortable-placeholder") ||
                  ($(this).offset().top > n && $(this).addClass("hide"));
              });
          },
          beforeStop: function () {
            $(".tabs").children().removeClass("hide");
          },
        }),
          $("#mainframe").on("click", function () {
            $(".more-button").hasClass("active") &&
              $(".more-button").removeClass("active");
          }),
          $("<div></div>")
            .addClass("more-button")
            .append($("<div></div>").addClass("more-symbol"))
            .append($("<div></div>").addClass("moreTab"))
            .on("click", function () {
              gDesigner.stats(
                "header_click_more-button",
                $(".more-button").hasClass("active") ? "Close" : "Open"
              ),
                $(".more-button").hasClass("active")
                  ? $(".more-button").removeClass("active")
                  : setTimeout(function () {
                      $(".more-button").addClass("active");
                    }, 10),
                a();
            })
            .appendTo(e);
      }),
      (t.toggleRearrangeTabsVisibility = function (e, t) {
        $(e)
          .find(i)
          .css("display", t ? "" : "none");
      }),
      (t.updateTabsInterface = a),
      n(4),
      n(13),
      n(38),
      n(1518);
    const o = (t.REARRANGE_TAB_CLASS = "more-button"),
      i = (t.REARRANGE_TAB_SELECTOR = ".".concat(o));
    function a() {
      var e = 0,
        t = 0;
      $(".moreTab").empty(),
        $(".moreTab").append($(".tabs").children().clone(!0)),
        $(".moreTab")
          .children()
          .children()
          .prepend($("<span/>").addClass("select")),
        $(".moreTab").css({
          left: -$(".moreTab").width(),
          maxHeight: $("body").height() - 50,
        }),
        $(".moreTab").children().off("contextmenu"),
        $(".tabs")
          .children()
          .each(function (n) {
            if (t);
            else if (
              (e += $(this).outerWidth() + 7.5) >
              $(".section.windows").outerWidth()
            )
              return (t = n);
          }),
        setTimeout(function () {
          t &&
            $(".tabs>div").index($(".tab.g-active")) >= t &&
            $(".tabs")
              .find(".tab.g-active")
              .insertBefore(
                $(".tabs")
                  .children()
                  .eq(t - 1)
              ),
            $(".moreTab")
              .children()
              .eq($(".tabs>div").index($(".tab.g-active")))
              .children()
              .children(".select")
              .addClass("more-tab-icon");
        }, 100);
    }
  }