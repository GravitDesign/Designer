/**
 * Webpack Module #1477
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.GMicrosoftUser = r),
      (t.default = void 0),
      n(3);
    var o = n(1),
      i = n(1478),
      a = n(1241);
    function r(e) {
      let { Id: t, Email: n, Title: o, UserId: i, UserPrincipalName: a } = e;
      (this._id = t),
        (this._email = n),
        (this._name = o),
        (this._userId = i),
        (this._userPrincipalName = a);
    }
    o.GObject.inherit(r, i.GCloudUser),
      (r.ValidRoles = [
        a.GCloudRole.Type.Viewer,
        a.GCloudRole.Type.ContentEditor,
      ]),
      (r.prototype._userId = null),
      (r.prototype.getValidRoles = function () {
        return r.ValidRoles;
      }),
      (r.prototype.getEmail = function () {
        return this._email;
      }),
      (r.prototype.getUserReference = function () {
        return this.getEmail();
      }),
      (r.prototype.getUserPrincipalName = function () {
        return this._userPrincipalName;
      }),
      (r.prototype.getNameId = function () {
        return this._userId && this._userId.NameId;
      }),
      (r.prototype.toString = function () {
        return "[GObject GMicrosoftUser]";
      });
    t.default = r;
  }