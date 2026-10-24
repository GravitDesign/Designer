/**
 * Webpack Module #1589
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    const i = [
      {
        selector: "#toolbar > .section > .menubar-toolbar-button",
        i18n: "text.menu",
        offsetX: 10,
      },
      {
        selector: "#toolbar > .section > .open-toolbar-button > .action-button",
        i18n: "text.open",
        furtherAway: !0,
      },
      {
        selector: "#toolbar > .section > .save-toolbar-button > .action-button",
        i18n: "text.save",
      },
      {
        selector: "#toolbar > .section > .undo-toolbar-button > .action-button",
        i18n: "text.undo-redo",
        furtherAway: !0,
      },
      {
        selector:
          "#toolbar > .section > .zoom-button > .action-button > .caption",
        i18n: "text.zoom",
        offsetY: 14,
      },
      {
        selector: "#toolbar > .section > .snap-button > .action-button",
        i18n: "text.snapping",
        furtherAway: !0,
      },
      {
        selector:
          "#toolbar > .section > .select-toolbar-button > .action-button",
        i18n: "text.select",
      },
      {
        selector:
          "#toolbar > .section > .shapes-toolbar-button > .action-button",
        i18n: "text.shapes",
        furtherAway: !0,
      },
      {
        selector: "#toolbar > .section > .path-toolbar-button > .action-button",
        i18n: "text.path",
      },
      {
        selector:
          "#toolbar > .section > .knife-toolbar-button > .action-button",
        i18n: "text.knife",
        furtherAway: !0,
      },
      {
        selector: "#toolbar > .section > .text-toolbar-button > .action-button",
        i18n: "text.text",
      },
      {
        selector:
          "#toolbar > .section > .image-toolbar-button > .action-button",
        i18n: "text.image",
        furtherAway: !0,
      },
      {
        selector: "#toolbar > .section > .window-button  > .action-button",
        i18n: "text.files",
      },
      {
        selector:
          "#toolbar > .section > .export-toolbar-button > .action-button",
        i18n: "text.export",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="pages"]',
        i18n: "text.pages",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="layers"]',
        i18n: "text.layers",
        furtherAway: !0,
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="libraries"]',
        i18n: "text.libraries",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="symbols"]',
        i18n: "text.symbols",
        furtherAway: !0,
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="dimension.align"]',
        i18n: "text.align-distribute",
        className: "align-distribute",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="dimension.dimension"]',
        i18n: "text.transform",
        furtherAway: !0,
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="document"]',
        i18n: "text.document",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="appearance"]',
        i18n: "text.appearance",
        furtherAway: !0,
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="fill"]',
        i18n: "text.fills",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="border"]',
        i18n: "text.borders",
        furtherAway: !0,
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="effect"]',
        i18n: "text.effects",
      },
      {
        selector: '.g-touch-toolbar-button[g-touch-tool="annotation"]',
        i18n: "text.comments",
        furtherAway: !0,
      },
      {
        selector: "#assistant-bar > .container",
        side: o.GRect.Side.LEFT_CENTER,
        i18n: "text.modifier-keys",
        disconnected: !0,
        offsetX: -15,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar > .container",
        side: o.GRect.Side.RIGHT_CENTER,
        i18n: "text.nudge",
        disconnected: !0,
        offsetX: 15,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-copy",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.copy",
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-paste",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.paste",
        furtherAway: !0,
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-trash-2",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.delete",
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-selection",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.select-deselect",
        furtherAway: !0,
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-arrange-order",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.arrange",
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-fullscreen",
        side: o.GRect.Side.TOP_CENTER,
        i18n: "text.fullscreen",
        furtherAway: !0,
        offsetY: -10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-group",
        i18n: "text.group",
        offsetY: 10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-ungroup",
        i18n: "text.ungroup",
        furtherAway: !0,
        offsetY: 10,
        className: "assistant-bar",
      },
      {
        selector: "#assistant-bar .gravit-icon-touch-convert-to-path",
        i18n: "text.convert-to-path",
        offsetY: 10,
        className: "assistant-bar",
      },
    ];
    e.exports = new (class {
      constructor() {
        this._resizeBound = this._resize.bind(this);
      }
      open() {
        this._panel && this._panel.remove();
        const e = $("body").addClass("g-quick-help");
        (this._panel = $("<div/>")
          .addClass("g-quick-help-screen")
          .addClass(o.GLocale.getLocaleTagISO6391())
          .addClass("hidden")
          .on("click", () => this.close())
          .appendTo(e)),
          gDesigner.getRightSidebars().disableContextSensitive(),
          this._update(),
          this._panel.removeClass("hidden"),
          $(window).on("resize", this._resizeBound);
      }
      close() {
        $("body").removeClass("g-quick-help"),
          this._panel && this._panel.remove(),
          delete this._panel,
          gDesigner.getRightSidebars().enableContextSensitive(),
          $(window).off("resize", this._resizeBound);
      }
      _resize() {
        this._panel && (this._panel.empty(), this._update());
      }
      _update() {
        this._createStaticTooltips(),
          i.forEach((e) => this._createDynamicTooltip(e));
      }
      _createStaticTooltips() {
        $("<div/>")
          .addClass("static-tooltips")
          .append(
            $("<div/>")
              .addClass("container")
              .append($("<img/>").attr("src", "assets/help/pinch-to-zoom.svg"))
              .append(
                this._createTooltip({
                  disconnected: !0,
                  i18n: "text.pinch-to-zoom",
                })
              )
          )
          .append(
            $("<div/>")
              .addClass("container")
              .append(
                $("<img/>").attr("src", "assets/help/drag-with-2-fingers.svg")
              )
              .append(
                this._createTooltip({
                  disconnected: !0,
                  i18n: "text.drag-with-2-fingers",
                })
              )
          )
          .append(
            $("<div/>")
              .addClass("container")
              .append($("<img/>").attr("src", "assets/help/tap-and-holder.svg"))
              .append(
                this._createTooltip({
                  disconnected: !0,
                  i18n: "text.tap-and-hold",
                })
              )
          )
          .appendTo(this._panel);
      }
      _createDynamicTooltip(e) {
        const t = $(e.selector),
          n = t.offset();
        if (!n || !t.is(":visible")) return;
        const i = this._createTooltip(e).appendTo(this._panel),
          a = new o.GRect(n.left, n.top, t.outerWidth(), t.outerHeight()),
          r = new o.GRect(0, 0, i.outerWidth(), i.outerHeight()),
          s = this._calculatePosition(r, a, e);
        i.css({ top: s.getY(), left: s.getX() });
      }
      _calculatePosition(e, t, n) {
        const i = n.side || o.GRect.Side.BOTTOM_CENTER,
          a = t.getSide(i);
        switch (i) {
          case o.GRect.Side.TOP_CENTER: {
            const t = e.getSide(o.GRect.Side.CENTER).getX();
            return new o.GPoint(
              a.getX() - t + (n.offsetX || 0),
              a.getY() - e.getHeight() + (n.offsetY || 0)
            );
          }
          case o.GRect.Side.BOTTOM_CENTER: {
            const t = e.getSide(o.GRect.Side.CENTER).getX();
            return new o.GPoint(
              a.getX() - t + (n.offsetX || 0),
              a.getY() + (n.offsetY || 0)
            );
          }
          case o.GRect.Side.LEFT_CENTER: {
            const t = e.getSide(o.GRect.Side.CENTER).getY();
            return new o.GPoint(
              a.getX() - e.getWidth() + (n.offsetX || 0),
              a.getY() - t + (n.offsetY || 0)
            );
          }
          case o.GRect.Side.RIGHT_CENTER: {
            const t = e.getSide(o.GRect.Side.CENTER).getY();
            return new o.GPoint(
              a.getX() + (n.offsetX || 0),
              a.getY() - t + (n.offsetY || 0)
            );
          }
          default:
            throw "Unsupported side";
        }
      }
      _createTooltip(e) {
        const t = $("<div>")
          .addClass("content")
          .append(
            $("<span/>").text(
              o.GLocale.get(new o.GLocaleKey("GQuickHelpScreen", e.i18n))
            )
          );
        return $("<div/>")
          .addClass("tooltip" + (e.className ? " " + e.className : ""))
          .addClass("side-" + (e.side || o.GRect.Side.BOTTOM_CENTER))
          .toggleClass("further-away", !!e.furtherAway)
          .append(
            $("<div/>")
              .addClass("container")
              .append(
                $("<div>")
                  .addClass("connector")
                  .css("display", e.disconnected ? "none" : "")
              )
              .append(t)
          );
      }
    })();
  }