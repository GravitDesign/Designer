/**
 * Webpack Module #1292
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13), n(38);
    const { GLocale: o, GLocaleKey: i } = n(1);
    function a() {
      throw "No instantiate";
    }
    a.Mode = { Online: "online", Offline: "offline" };
    const r = {
      init: function () {
        return this.each(function () {
          $(this)
            .data("mode", a.Mode.Online)
            .addClass("g-collaborators")
            .append($("<div/>").addClass("g-collaborators-container"));
        });
      },
      mode: function (e) {
        const t = r[e];
        return t && ($(this).data("mode", e), t.call(this)), this;
      },
      online: function () {
        const e = $(this).data("collaborators") || [];
        return r.collaborators.call(this, e), this;
      },
      offline: function () {
        return (
          $(this)
            .find(".g-collaborators-container")
            .attr(
              "data-title",
              o.get(new i("GCollaborators", "text.you-are-offline-tooltip"))
            )
            .empty()
            .append(
              $("<div/>")
                .addClass("g-collaborator")
                .addClass("offline")
                .append($("<span/>").addClass("gravit-icon-offline"))
            )
            .append(
              $("<span/>").text(
                o.get(new i("GCollaborators", "text.you-are-offline"))
              )
            ),
          this
        );
      },
      collaborators: function (e) {
        if (arguments.length > 0) {
          if (!((e && e.length) || $(this).data("mode") !== a.Mode.Offline))
            return;
          const t = (e) => {
              const t = e.getUserColor(),
                n = e.getTooltip() || "",
                o = e.getIcon(),
                i = $("<div/>")
                  .addClass("g-collaborator")
                  .attr("data-title", n)
                  .css("border-color", t)
                  .css("background-color", t)
                  .append(
                    $("<span/>")
                      .addClass("icon")
                      .addClass(o || "")
                      .css("display", o ? "flex" : "none")
                  );
              if (e.hasOwnPictureAvatar()) {
                const t = e.avatar;
                "<svg>" === t.substr(0, "<svg>".length)
                  ? $(t).appendTo(i)
                  : i.css({ backgroundImage: 'url("'.concat(t, '")') });
              } else $("<span/>").text(e.getUserNameInitials()).appendTo(i);
              return i;
            },
            n = $(this)
              .data("collaborators", e)
              .find(".g-collaborators-container")
              .removeAttr("data-title")
              .empty()
              .append(e.slice(0, 4).map((e) => t(e)));
          if (e.length > 4) {
            const o = $("<div/>")
              .gOverlay({ clazz: "g-collaborators-overlay" })
              .append(
                $("<div/>")
                  .addClass("g-collaborators-container")
                  .append(
                    e
                      .slice(4, e.length)
                      .map((e) =>
                        $("<div/>")
                          .addClass("g-collaborator-row")
                          .append(t(e))
                          .append($("<span/>").text(e.name))
                      )
                  )
              );
            $("<div/>")
              .addClass("g-collaborator")
              .addClass("plus")
              .append($("<span/>").text("+ ".concat(e.length - 4)))
              .on("click", (e) => {
                o.gOverlay("open", $(e.target).closest(".g-collaborator"));
              })
              .appendTo(n);
          }
          return this;
        }
        return $(this).data("collaborators");
      },
    };
    ($.fn.gCollaborators = function (e) {
      return r[e]
        ? r[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error(
            "Method " + e + " does not exist on jQuery.gCollaborators"
          )
        : r.init.apply(this, arguments);
    }),
      (e.exports = a);
  }