/**
 * Webpack Module #789
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.NoAccessId = t.CloudToGoogleRoleMap = void 0);
    var i = n(10),
      a = o(n(788));
    const r = (t.NoAccessId = "NoAccess"),
      s = (t.CloudToGoogleRoleMap = {
        [i.ShareRoles.Viewer.id]: a.default.Reader,
        [i.ShareRoles.Developer.id]: a.default.Commenter,
        [i.ShareRoles.Reviewer.id]: a.default.Commenter,
        [i.ShareRoles.CoAuthor.id]: a.default.Writer,
        [i.ShareRoles.Owner.id]: a.default.Owner,
        [i.ShareRoles.NoAccess.id]: r,
      });
    t.default = s;
  }