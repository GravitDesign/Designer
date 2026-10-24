/**
 * Webpack Module #1478
 * Type: class
 * Name: GCloudUser
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.GCloudUser = r),
      (t.default = void 0),
      n(58),
      n(3),
      n(71);
    var o = n(1241);
    const i = n(0),
      a = n(177);
    function r() {}
    i.inherit(r, a),
      (r.ValidRoles = [
        o.GCloudRole.Type.Viewer,
        o.GCloudRole.Type.Coauthor,
        o.GCloudRole.Type.Creator,
        o.GCloudRole.Type.Reviewer,
        o.GCloudRole.Type.Approver,
        o.GCloudRole.Type.ContentEditor,
      ]),
      (r.prototype._role = null),
      (r.prototype._id = null),
      (r.prototype._name = null),
      (r.prototype._email = null),
      (r.prototype.setRole = function (e) {
        if (!(e instanceof o.GCloudRole))
          throw new Error("Incorrect type parameter");
        if (!this.getValidRoles().includes(e.getRole()))
          throw new Error("Incorrect User role");
        return (this._role = e), this;
      }),
      (r.prototype.getRole = function () {
        return this._role;
      }),
      (r.prototype.getValidRoles = function () {
        return r.ValidRoles;
      }),
      (r.prototype.getEmail = function () {
        return this._email;
      }),
      (r.prototype.getId = function () {
        return this._id;
      }),
      (r.prototype.getName = function () {
        return this._name;
      }),
      (r.prototype.toString = function () {
        return "[Object GCloudUser]";
      });
    t.default = r;
  }