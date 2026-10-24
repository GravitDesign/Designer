/**
 * Webpack Module #1540
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13), n(32), n(33);
    var o = n(395);
    (o.prototype._rightSidebarDefaultWidthForTouch = 300),
      (o.prototype._updateTouchToolbar = function (e) {
        const t = ["fill", "border", "effect"];
        if (!gDesigner.isTouchEnabled()) return;
        this._touchToolbar ||
          (this._touchToolbar = $("<div/>")
            .addClass("g-touch-toolbar")
            .prependTo(this._htmlElement));
        let n = null;
        this._touchToolbar.empty(),
          this.removeClassName("align-active"),
          this._sidebars.forEach((o) => {
            let { sidebar: i, container: a } = o;
            const r = i.getTouchTools(e);
            i &&
              i.isVisible() &&
              r &&
              r.forEach((e) => {
                e.sidebar = i.getId();
                const o =
                  !!this._activeTouchTool && e.id == this._activeTouchTool.id;
                o && (n = e);
                let r = e.panel;
                if (
                  (Array.isArray(e.panel) || (r = [e.panel]),
                  "dimension.align" === e.id &&
                    o &&
                    this.addClassName("align-active"),
                  r.forEach((t) => {
                    let n;
                    (n = "string" == typeof t ? a.find(t) : $(t)),
                      n
                        .attr("g-touch-tool", e.id)
                        .toggleClass("g-active", o)
                        .addClass("g-touch-toolbar-panel");
                  }),
                  e.toolbar)
                ) {
                  let t = e.toolbar;
                  Array.isArray(e.toolbar) || (t = [e.toolbar]),
                    t.forEach((t) => {
                      let n;
                      (n = "string" == typeof t ? a.find(t) : $(t)),
                        n
                          .attr("g-touch-tool", e.id)
                          .toggleClass("g-active", o)
                          .addClass("g-touch-toolbar-label");
                    });
                }
                var s = $("<button/>")
                  .addClass("g-touch-toolbar-button")
                  .attr("g-touch-tool", e.id)
                  .attr("id", e.id)
                  .toggleClass("g-active", o)
                  .append($("<span/>").addClass(e.icon || ""))
                  .on("click", () => {
                    this.removeClassName("align-active"),
                      "dimension.align" == e.id
                        ? ($(".scrolling-panels").addClass("hide"),
                          this.addClassName("align-active"))
                        : $(".scrolling-panels").removeClass("hide"),
                      -1 != t.indexOf(e.id)
                        ? $(".sidebar-inspector").addClass("expand")
                        : $(".sidebar-inspector").removeClass("expand"),
                      this._activeTouchTool && this._activeTouchTool.id == e.id
                        ? this._isActiveSidebarDeactivatable() &&
                          (this.setActiveTouchTool(null),
                          this._htmlElement.css(
                            "width",
                            i.getDefaultWidth() + "px"
                          ))
                        : this._tryActivateSidebar(i) &&
                          (this.setActiveTouchTool(e),
                          e.panelWidth
                            ? this._htmlElement.css("width", e.panelWidth)
                            : this._htmlElement.css(
                                "width",
                                i.getDefaultWidth() + "px"
                              ),
                          ".appearance-toolbar" !== e.toolbar
                            ? this._htmlElement
                                .find(".appearance-properties-panel")
                                .addClass("display-none")
                            : this._htmlElement
                                .find(".appearance-properties-panel")
                                .removeClass("display-none"));
                  })
                  .appendTo(this._touchToolbar);
                if (-1 != t.indexOf(e.id)) {
                  var l = $(".".concat(e.id, "-block")).length;
                  s.append(
                    $("<div/>")
                      .addClass("count")
                      .append($("<div/>").addClass("scale").text(l))
                  );
                }
              });
          }),
          this.setActiveTouchTool(n),
          n || this._setDefaultRightSidebarWidthForTouch();
      }),
      (o.prototype.updateTouchToolbar = function () {
        this._updateTouchToolbar();
      }),
      (o.prototype._setDefaultRightSidebarWidthForTouch = function () {
        this._htmlElement.css(
          "width",
          this._rightSidebarDefaultWidthForTouch + "px"
        );
      });
  }