/**
 * Webpack Module #388
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(3);
    var o = n(1);
    const i = n(237),
      a = n(156);
    function r() {}
    o.GObject.inherit(r, i),
      (r.Item = function (e, t) {
        i.Item.call(this, e), this.setFile(t);
      }),
      o.GObject.inherit(r.Item, i.Item),
      (r.Item.prototype._app = null),
      (r.Item.prototype._filename = null),
      (r.Item.prototype._ext = null),
      (r.Item.prototype._id = null),
      (r.Item.prototype._file = null),
      (r.Item.prototype.isRegistrable = function () {
        return !!this.getId();
      }),
      (r.Item.prototype.getId = function () {
        return this._id;
      }),
      (r.Item.prototype.setId = function (e) {
        return (this._id = e), this;
      }),
      (r.Item.prototype.getFullName = function () {
        return this._filename;
      }),
      (r.Item.prototype.getName = function () {
        return this._filename;
      }),
      (r.Item.prototype.setFileName = function (e) {
        return (this._filename = e), this;
      }),
      (r.Item.prototype.getExtension = function () {
        return (this._ext && this._ext.toUpperCase()) || "CDRAPP";
      }),
      (r.Item.prototype.setFile = function (e) {
        if (!e)
          throw new Error(
            o.GLocale.get(
              new o.GLocaleKey(
                "GExternalStorage",
                "text.error-file-cant-be-null"
              )
            )
          );
        (e = a.createOrReturnSelfInstance(e)),
          (this._file = e),
          (this._id = e.id),
          (this._filename = e.name);
      }),
      (r.Item.prototype.getFile = function () {
        const e = this._file;
        return (
          !e.settings &&
            this._client &&
            (e.settings = this._client.getSettings()),
          e
        );
      }),
      (r.Item.prototype.hasFileSettings = function () {
        return this._file && this._file.settings;
      }),
      (r.Item.prototype.getUniqueId = function () {
        return this._id;
      }),
      (r.Item.prototype.getVersion = function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.getMimeType = function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.hasVersionControl = function () {
        return !1;
      }),
      (r.Item.prototype.hasUpdates = async function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.getLatestFileVersion = async function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.getLatestFileInfo = async function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.exists = async function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.isVersionNewerThan = function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.setCloudClient = function (e) {
        this._client = e;
      }),
      (r.Item.prototype.getCloudClient = function () {
        return this._client;
      }),
      (r.Item.prototype.supportsSharing = function () {
        return this._getClient().isCorporate();
      }),
      (r.Item.prototype.getCorporateProviderName = function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.isEmailFromCorporateDomain = function () {
        throw Error("Not implemented!");
      }),
      (r.Item.prototype.toString = function () {
        return "[Object GExternalStorage.Item]";
      }),
      (e.exports = r);
  }