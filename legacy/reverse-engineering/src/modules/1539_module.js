/**
 * Webpack Module #1539
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    var o = n(1),
      i = n(394);
    function a(e) {
      (this._htmlElement = e),
        (this._collapseIcon = $(
          '<span class="collapse-icon"><span></span><span></span></span>'
        ));
    }
    (a.CollapseMode = { None: "none", Half: "half", Full: "full" }),
      (a.prototype._htmlElement = null),
      (a.prototype._collapseIcon = null),
      (a.prototype._panels = null),
      (a.prototype._activePanel = null),
      (a.prototype._collapseMode = null),
      (a.prototype.getCollapseMode = function () {
        return this._collapseMode;
      }),
      (a.prototype.setCollapseMode = function (e) {
        e !== this._collapseMode &&
          (this._collapseMode &&
            this._htmlElement.removeClass("collapse-" + this._collapseMode),
          (this._collapseMode = e),
          this._collapseMode &&
            this._htmlElement.addClass("collapse-" + this._collapseMode));
      }),
      (a.prototype.toggleCollapseMode = function () {
        switch (this._collapseMode) {
          case a.CollapseMode.Full:
            this.setCollapseMode(a.CollapseMode.None);
            break;
          case a.CollapseMode.Half:
            this.setCollapseMode(a.CollapseMode.Full);
            break;
          case a.CollapseMode.None:
            this.setCollapseMode(a.CollapseMode.Half);
        }
      }),
      (a.prototype.getActivePanel = function () {
        return this._activePanel;
      }),
      (a.prototype.setActivePanel = function (e) {
        if (e === this._activePanel) this.toggleCollapseMode();
        else {
          for (var t = 0; t < this._panels.length; ++t) {
            var n = this._panels[t],
              o = n.panel.getId();
            o === e
              ? (n.container.css("display", ""),
                n.tab.addClass("g-active"),
                n.panel.activate())
              : (n.container.css("display", "none"),
                n.tab.removeClass("g-active"),
                o === this._activePanel && n.panel.deactivate());
          }
          this._activePanel = e;
        }
      }),
      (a.prototype.setPanelEnabled = function (e, t) {
        var n = this._getPanelInfo(e);
        if (n)
          if (t)
            n.container.find(".g-disabled-overlay").remove(),
              n.container.removeClass("g-disabled");
          else {
            var o = n.container.find(".g-disabled-overlay");
            0 === o.length &&
              (o = $("<div></div>")
                .addClass("g-disabled-overlay")
                .appendTo(n.container)),
              n.container.addClass("g-disabled");
          }
      }),
      (a.prototype.init = function () {
        this._panels = [];
        var e = $("<div></div>")
            .addClass("panels-tabs")
            .appendTo(this._htmlElement),
          t = $("<div></div>")
            .addClass("panels-frame")
            .appendTo(this._htmlElement),
          n = function (n) {
            var a = $("<button></button>")
                .addClass("panel-tab")
                .attr("data-panel-id", n.getId())
                .text(o.GLocale.get(n.getTitle()))
                .on(
                  "click",
                  function (e) {
                    gDesigner.stats("panels_set_active"),
                      this.setActivePanel(
                        $(e.target).closest("button").attr("data-panel-id")
                      );
                  }.bind(this)
                )
                .on("mousedown", function (e) {
                  e.preventDefault();
                })
                .prepend(this._collapseIcon.clone())
                .appendTo(e),
              r = $("<div></div>")
                .addClass("panel-container panel-" + n.getId())
                .css("display", "none")
                .appendTo(t);
            n.init(r),
              r.find("button").each(function (e, t) {
                t.on("mousedown", function (e) {
                  e.preventDefault();
                });
              }),
              this.setPanelEnabled(n.getId(), n.isEnabled()),
              this._panels.push({ tab: a, container: r, panel: n }),
              n.addEventListener(
                i.UpdateEvent,
                function () {
                  this.setPanelEnabled(n.getId(), n.isEnabled());
                }.bind(this)
              );
          }.bind(this);
        if (gravit.panels)
          for (var r = 0; r < gravit.panels.length; ++r) {
            var s = gravit.panels[r];
            n(s), this._activePanel || this.setActivePanel(s.getId());
          }
        this.setCollapseMode(a.CollapseMode.None);
      }),
      (a.prototype.relayout = function () {}),
      (a.prototype._getPanelInfo = function (e) {
        for (var t = 0; t < this._panels.length; ++t) {
          if (this._panels[t].panel.getId() === e) return this._panels[t];
        }
      }),
      (e.exports = a);
  }