/**
 * Webpack Module #1658
 * Type: class
 * Name: GSymbolProperties
 */

function (e, t, n) {
    "use strict";
    n(3), n(4), n(41), n(13), n(32), n(33);
    var o = n(1),
      i = n(123),
      a = (n(173), n(874)),
      r = n(566);
    const s = n(135);
    function l() {}
    o.GObject.inherit(l, i),
      (l.prototype._panel = null),
      (l.prototype._toolbar = null),
      (l.prototype._document = null),
      (l.prototype._symbols = null),
      (l.prototype._disabledSiblingMaps = null),
      (l.prototype.init = function (e, t) {
        (this._panel = e),
          (this._toolbar = t),
          t.addClass("filled"),
          t.addClass("page-toolbar"),
          t.addClass("symbol-instance-toolbar"),
          e.addClass("symbol-instance-panel");
        var n = $("<select></select>")
          .attr("data-property", "symbol-instance")
          .on(
            "change",
            function (e) {
              gDesigner.stats("symbolproperties_select_swap");
              var t = this._document.getScene(),
                n = this._document.getEditor(),
                i = function (e) {
                  var n = e.findParent(function (e) {
                    return e instanceof o.GPage;
                  });
                  n && t.getActivePage() !== n && t.setActivePage(n);
                };
              if (
                e.target.value &&
                "0" !== e.target.value &&
                "-1" !== e.target.value
              ) {
                var s = $(e.target)
                  .find('option[value="' + e.target.value + '"]')
                  .data("symbol");
                if (s) {
                  (n = this._document.getEditor()).beginTransaction();
                  var l = s,
                    c = this._symbols[0],
                    d = c.getMasterSymbol(),
                    u = c.getDisabledSiblings(),
                    p = c.swapWith(l);
                  if (
                    (this._disabledSiblingMaps ||
                      (this._disabledSiblingMaps = {}),
                    u)
                  ) {
                    var g =
                      d.getMultireferenceId() + "_" + p.getMultireferenceId();
                    this._disabledSiblingMaps[g] = u;
                  }
                  var h =
                    this._disabledSiblingMaps[
                      l.getMultireferenceId() + "_" + c.getMultireferenceId()
                    ];
                  h && p.desynchronize(h),
                    p && (i(p), n.updateSelection(!1, [p])),
                    n.commitTransaction("Swap symbol instance");
                }
              } else if (e.target.value && "0" === e.target.value) {
                var f = this._symbols[0].getMasterSymbol();
                n.beginTransaction(),
                  i(f),
                  n.clearSelection(),
                  n.updateSelection(!1, [f]),
                  n.hasSelection() &&
                    gDesigner.executeAction(r.ID, void 0, void 0, !0),
                  n.commitTransaction("Select master symbol");
              } else
                e.target.value &&
                  "-1" === e.target.value &&
                  (gDesigner.executeAction(a.ID, void 0, void 0, !0),
                  n.updateSelection(!1, n.getSelection().slice()));
            }.bind(this)
          );
        $("<label></label>")
          .text(o.GLocale.get(new o.GLocaleKey("GSymbolProperties", "title")))
          .appendTo(t),
          $("<div></div>")
            .addClass("chooseinstance-row")
            .gPropertyRow({
              columns: [
                {
                  clazz: "chooseinstance-title-col",
                  content: $(
                    "<span>" +
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GSymbolProperties",
                          "text.chooseinstance"
                        )
                      ) +
                      "</span>"
                  ),
                },
                { clazz: "chooseinstance-select-col", content: n },
              ],
            })
            .appendTo(e);
      }),
      (l.prototype.update = function (e, t) {
        return (
          this._updateUI(),
          this._document &&
            (gDesigner.removeEventListener(s, this._settingChanged, this),
            (this._document = null)),
          (this._symbols = null),
          !(
            !e ||
            (gDesigner.addEventListener(s, this._settingChanged, this),
            !(t = t.filter(
              (e) =>
                e instanceof o.GSymbol && !e.isMaster() && !!e.getMasterSymbol()
            )).length)
          ) &&
            ((this._symbols = t.slice()),
            (this._document = e),
            this._updateProperties(),
            !0)
        );
      }),
      (l.prototype._updateUI = function () {
        gDesigner.isTouchEnabled()
          ? this._panel.find(".frm-checkbox").gCheckboxSlider()
          : this._panel.find(".frm-checkbox").gCheckboxSlider("unmount");
      }),
      (l.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateUI();
      }),
      (l.prototype._updateProperties = function () {
        var e,
          t = this._document.getScene(),
          n = this._symbols[0],
          i = n.getMasterSymbol(),
          r = (t.isFixedSized(), t.getSymbols());
        this._symbols.length > 1
          ? (e =
              this._symbols.length +
              " " +
              o.GLocale.get(
                new o.GLocaleKey("GSymbolProperties", "text.instances")
              ))
          : ((e =
              n.getProperty("name") ||
              o.GLocale.get(new o.GLocaleKey("GSymbolProperties", "title"))),
            i.getProperty("name")
              ? (e +=
                  " (" +
                  o.GLocale.get(
                    new o.GLocaleKey("GSymbolProperties", "text.instanceof")
                  ) +
                  " " +
                  i.getProperty("name"))
              : (e +=
                  " (" +
                  o.GLocale.get(
                    new o.GLocaleKey("GSymbolProperties", "text.instance")
                  )),
            (e += ")")),
          this._toolbar.find("label:first-child").text(e);
        var s,
          l = this._panel
            .find('select[data-property="symbol-instance"]')
            .empty();
        gDesigner.canExecuteAction(a.ID) &&
          (l.append(
            $('<option value="-1">(' + o.GLocale.get(a.TITLE) + ")</option>")
          ),
          l.append((s = $('<option value="-2"></option>'))));
        var c = 0;
        !r.length && i && (r = [i]),
          r.length
            ? l.removeClass("g-disabled").attr("disabled", null)
            : l.addClass("g-disabled").attr("disabled", "");
        var d = !1;
        r.forEach(function (e) {
          var t = $("<option></option>")
            .data("symbol", e)
            .attr("value", ++c)
            .text(e.getProperty("name"))
            .appendTo(l);
          i.getMultireferenceId() === e.getMultireferenceId() &&
            (t.prop("selected", !0), (d = !0));
        }),
          d || s.prop("selected", !0),
          i &&
            i.getScene() &&
            l.append(
              $(
                '<option value="0">(' +
                  o.GLocale.get(
                    new o.GLocaleKey("GSymbolProperties", "text.master")
                  ) +
                  ")</option>"
              )
            );
      }),
      (l.prototype.toString = function () {
        return "[Object GSymbolProperties]";
      }),
      (e.exports = l);
  }