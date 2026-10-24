/**
 * GSymbolProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSymbolProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GSymbolProperties.prototype.update = function (e, t) {
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
      }

GSymbolProperties.prototype._updateUI = function () {
        gDesigner.isTouchEnabled()
          ? this._panel.find(".frm-checkbox").gCheckboxSlider()
          : this._panel.find(".frm-checkbox").gCheckboxSlider("unmount");
      }

GSymbolProperties.prototype._settingChanged = function (e) {
        "touch" === e.key && this._updateUI();
      }

GSymbolProperties.prototype._updateProperties = function () {
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
        var d = false;
        r.forEach(function (e) {
          var t = $("<option></option>")
            .data("symbol", e)
            .attr("value", ++c)
            .text(e.getProperty("name"))
            .appendTo(l);
          i.getMultireferenceId() === e.getMultireferenceId() &&
            (t.prop("selected", !0), (d = true));
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
      }

GSymbolProperties.prototype.toString = function () {
        return "[Object GSymbolProperties]";
      }

module.exports = GSymbolProperties;
