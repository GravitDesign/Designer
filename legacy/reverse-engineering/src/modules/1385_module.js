/**
 * Webpack Module #1385
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    var o = n(1),
      i = n(10),
      a = n(237),
      r = n(220),
      s = n(40).decrypt;
    n(173);
    function l() {}
    o.GObject.inherit(l, a),
      (l.prototype.canPromptOpen = function () {
        return !1;
      }),
      (l.prototype.canPromptSave = function (e) {
        return !1;
      }),
      (l.prototype.canSave = function () {
        return !1;
      }),
      (l.prototype.canDownload = function () {
        return !1;
      }),
      (l.Item = function (e, t, n, o) {
        r.CommercialProduct.call(this, e, t, n, o);
      }),
      o.GObject.inherit(l.Item, r.CommercialProduct),
      (l.Item.prototype.getPrice = async function () {
        return Promise.resolve(this._file.price);
      }),
      (l.Item.prototype.getName = function () {
        return this._filename
          ? this._filename
          : o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.image"));
      }),
      (l.Item.prototype.getFullName = function () {
        return this._filename
          ? this._filename
          : o.GLocale.get(new o.GLocaleKey("GCommonNames", "text.image"));
      }),
      (l.Item.prototype.getFormattedPrice = async function () {
        const e = await this.getPrice(),
          t = o.GLocale.toLocaleCurrency(e, "USD");
        return new Promise((e) => e(t));
      }),
      (l.Item.prototype.setFile = function (e) {
        if (!e) throw new Error("File can not be null");
        (this._file = e), (this._id = e.id), (this._name = e.name);
      }),
      (l.Item.prototype.getFile = function () {
        return this._file;
      }),
      (l.Item.prototype.read = async function (e, t, n) {
        var o = await i.gApi.getProviderContentFile(this._file.hash);
        return e(new TextEncoder().encode(s(o)));
      }),
      (l.Item.prototype.getExtension = function () {
        return this._file.extension && this._file.extension.toUpperCase();
      }),
      (e.exports = l);
  }