/**
 * Webpack Module #1565
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(3);
    const o = n(433);
    function i() {
      let e =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      Object.assign(
        this,
        {
          edit: !1,
          inspect: !1,
          copy: !1,
          owner: !0,
          share: !1,
          sharing: !1,
          isPrivate: !1,
          comment: !1,
          role: o.ROLES.NO_ACCESS_ROLE,
          realtimeCollaborators: [],
        },
        e
      );
    }
    (i.prototype.edit = !1),
      (i.prototype.inspect = !1),
      (i.prototype.copy = !1),
      (i.prototype.owner = !0),
      (i.prototype.share = !1),
      (i.prototype.sharing = !1),
      (i.prototype.comment = !1),
      (i.prototype.role = o.ROLES.NO_ACCESS_ROLE),
      (i.prototype.isPrivate = !1),
      (i.prototype.realtimeCollaborators = []),
      (i.prototype.toString = function () {
        return "Object [GShareState]";
      }),
      (e.exports = i);
  }