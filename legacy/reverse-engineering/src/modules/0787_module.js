/**
 * Webpack Module #787
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.GoogleToCloudRoleMap = void 0);
    var i = n(10),
      a = o(n(788));
    const r = (t.GoogleToCloudRoleMap = {
      [a.default.Reader]: i.ShareRoles.Viewer.id,
      [a.default.Commenter]: i.ShareRoles.Reviewer.id,
      [a.default.Writer]: i.ShareRoles.CoAuthor.id,
      [a.default.Owner]: i.ShareRoles.Owner.id,
      [a.default.Organizer]: i.ShareRoles.CoAuthor.id,
      [a.default.FileOrganizer]: i.ShareRoles.CoAuthor.id,
    });
    t.default = r;
  }