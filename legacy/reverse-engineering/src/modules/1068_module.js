/**
 * Webpack Module #1068
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(8), n(4), n(322), n(32), n(38), n(97), n(33), n(26);
    const { GObject: o } = n(1),
      i = n(1069);
    function a() {
      (this._resourceMap = new i()),
        (this._controlSubjectState = { locked: !1 });
    }
    o.inherit(a, o),
      (a.prototype._controlSubjectState = null),
      (a.prototype.lockPermissions = function () {
        (this._controlSubjectState.locked = !0),
          Object.freeze(this._controlSubjectState),
          Object.freeze(this._resourceMap);
      }),
      (a.prototype.grant = function (e, t) {
        if (this._controlSubjectState.locked) return this;
        if (
          (e = e instanceof Array ? e : [e]).some((e) =>
            this._resourceMap.has(e)
          )
        )
          throw "Can't override an existing resource";
        return e.forEach((e) => this._resourceMap.set(e, t)), this;
      }),
      (a.prototype.revoke = function (e) {
        return (
          this._controlSubjectState.locked ||
            (e = e instanceof Array ? e : [e]).forEach((e) => {
              this._resourceMap.has(e) && this._resourceMap.delete(e);
            }),
          this
        );
      }),
      (a.prototype.can = function (e) {
        return (
          (e = e instanceof Array ? e : [e]),
          Promise.all(
            e.map(async (e) => {
              if (!this._resourceMap.has(e)) return !1;
              var t = this._resourceMap.get(e);
              return !t || !!(await t(this, e));
            })
          ).then((e) => e.every((e) => !!e))
        );
      }),
      (a.prototype.canSync = function (e) {
        return (e = e instanceof Array ? e : [e]).every((e) => {
          if (!this._resourceMap.has(e)) return !1;
          const t = this._resourceMap.get(e);
          if (!t) return !0;
          return !!t(this, e);
        });
      }),
      (a.prototype.extend = function (e) {
        if (this._controlSubjectState.locked) return this;
        if (!(e instanceof a)) throw "Not a valid instance to extend";
        const t = o(this._resourceMap),
          n = o(e._resourceMap);
        return (this._resourceMap = new i(...t, ...n)), this;
        function o(e) {
          return e instanceof Map ? e : new Map(Object.entries(e));
        }
      }),
      (e.exports = a);
  }