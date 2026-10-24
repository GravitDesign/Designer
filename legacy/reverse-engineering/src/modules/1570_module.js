/**
 * Webpack Module #1570
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(3);
    const { HAS_ANNOTATIONS: o } = n(10);
    function i() {
      let e =
        arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      Object.assign(
        this,
        {
          isShareEnabled: !1,
          isSharing: !1,
          isPrivateSharing: !1,
          role: void 0,
          realtimeCollaborators: [],
          edit: !0,
          save: !0,
          export: !0,
          inspect: !0,
          comment: !!o,
          copyPaste: !0,
          isDocumentTabManagementEnabled: !0,
        },
        e
      );
    }
    (i.prototype.isDocumentTabManagementEnabled = !0),
      (i.prototype.isShareEnabled = !1),
      (i.prototype.isSharing = !1),
      (i.prototype.isPrivateSharing = !1),
      (i.prototype.role = void 0),
      (i.prototype.realtimeCollaborators = []),
      (i.prototype.edit = !0),
      (i.prototype.saveAs = !0),
      (i.prototype.export = !0),
      (i.prototype.inspect = !0),
      (i.prototype.comment = !!o),
      (i.prototype.copyPaste = !0),
      (i.prototype.toString = function () {
        return "Object [GApplicationState]";
      }),
      (e.exports = i);
  }