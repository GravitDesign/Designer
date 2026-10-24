/**
 * Webpack Module #1735
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(168), n(4), n(41), n(13), n(169);
    var o = n(1);
    const i = n(238),
      a = (e) => {
        e.empty().append(
          $("<div/>")
            .addClass("container")
            .append($("<span/>").addClass("gravit-icon-pages"))
            .append($("<span/>").addClass("caption"))
            .append($("<span/>").addClass("gravit-icon-down"))
        );
      },
      r = (e, t) => {
        e.empty()
          .append(
            $("<div />")
              .addClass("action-button")
              .append($("<span />").addClass("gravit-icon-touch-pages-panel"))
              .append($("<span />").addClass("caption"))
          )
          .append(t);
      },
      s = {
        init: function () {
          return this.each(function () {
            const e = $(this),
              t = $("<button />")
                .addClass("dropdown-button")
                .append($("<span></span>").addClass("gravit-icon-down"));
            e.data("g-page-button-dropdownbutton", t);
            let n = new i(void 0, "g-page-menu");
            e.addClass("g-page-button").gMenuButton({
              menu: () => {
                const t = e.data("options") && e.data("options").scene;
                return (
                  t &&
                    (n.clearItems(),
                    t
                      .getChildren()
                      .filter((e) => e instanceof o.GPage && e.isVisible())
                      .reduce(
                        (e, t) => (
                          e.createAddItem(t.getLabel(), () => {
                            t.setFlag(o.GNode.Flag.Active);
                          }),
                          e
                        ),
                        n
                      )),
                  n
                );
              },
              getActiveItem: () => {
                const t = e.data("options") && e.data("options").scene;
                if (t) {
                  const e = t.getActivePage();
                  if (e) return n.findItem(e.getLabel());
                }
                return null;
              },
              reference: () => (gDesigner.isTouchEnabled() ? t : null),
            }),
              gDesigner.isTouchEnabled() ? r(e) : a(e);
          });
        },
        scene: function (e) {
          const t = $(this),
            n = t.data("options") || {};
          return (
            n.scene !== e &&
              (n.scene &&
                n.scene.removeEventListener(
                  o.GNode.AfterFlagChangeEvent,
                  s._afterFlagChangeEvent,
                  this
                ),
              (n.scene = e),
              e &&
                (s._activatePage.call(this, e.getActivePage()),
                e.addEventListener(
                  o.GNode.AfterFlagChangeEvent,
                  s._afterFlagChangeEvent,
                  this
                ))),
            t.data("options", n),
            this
          );
        },
        reinit: function () {
          const e = $(this);
          gDesigner.isTouchEnabled()
            ? r(e, e.data("g-page-button-dropdownbutton"))
            : a(e);
          const t = (e.data("options") || {}).scene;
          t &&
            (s._activatePage.call(this, t.getActivePage()),
            t.hasEventListeners(
              o.GNode.AfterFlagChangeEvent,
              s._afterFlagChangeEvent,
              this
            ) ||
              t.addEventListener(
                o.GNode.AfterFlagChangeEvent,
                s._afterFlagChangeEvent,
                this
              ));
        },
        release: function () {
          const e = $(this),
            t = e.data("options");
          return (
            t &&
              t.scene &&
              t.scene.removeEventListener(
                o.GNode.AfterFlagChangeEvent,
                s._afterFlagChangeEvent,
                this
              ),
            e.remove(),
            this
          );
        },
        _afterFlagChangeEvent: function (e) {
          e.node instanceof o.GPage &&
            e.flag === o.GNode.Flag.Active &&
            s._activatePage.call(this, e.node);
        },
        _activatePage: function (e) {
          $(this)
            .find(".caption")
            .text(e ? e.getLabel() : "");
        },
      };
    $.fn.gPageButton = function (e) {
      return s[e]
        ? s[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.gPageButton")
        : s.init.apply(this, arguments);
    };
  }