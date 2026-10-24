/**
 * Webpack Module #433
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(290), n(38);
    const {
        ShareRoles: o,
        defaultUserSettings: {
          share: {
            defaults: {
              public: { role: i } = {},
              private: { role: a } = {},
            } = {},
          } = {},
        } = {},
      } = n(10),
      r = n(1067),
      s = n(1070),
      l = n(1071);
    function c() {
      throw "No instantiate";
    }
    (c.makeFromShare = function (e) {
      const t = c._makeFromShareRole(e.getRole());
      return (
        t &&
          (t.applyPermissions(new s(e.getPermissions())), t.lockPermissions()),
        t
      );
    }),
      (c.makeFromShareRole = function (e) {
        const t = c._makeFromShareRole(e);
        return t.lockPermissions(), t;
      }),
      (c._makeFromShareRole = function (e) {
        if (!e) return null;
        const {
            id: t,
            name: n,
            description: o,
            status: i,
            pro: a,
            permissions: c = {},
            assignable: d,
            level: u,
          } = e,
          p = new r({
            id: t,
            level: u,
            name: n,
            description: o,
            status: i,
            pro: a,
            permissions: new s(c),
            assignable: d,
          }),
          g = l[p.id];
        return g && p.grant(g), p;
      }),
      (c.ROLES = {
        get ALL() {
          return Object.values(o).map((e) => c.makeFromShareRole(e));
        },
        get DEFAULT_PUBLIC_ROLE() {
          return c.makeFromShareRole(i);
        },
        get DEFAULT_PRIVATE_ROLE() {
          return c.makeFromShareRole(a);
        },
        get NO_ACCESS_ROLE() {
          return c.makeFromShareRole(o.NoAccess);
        },
        get APPROVER_ROLE() {
          return c.makeFromShareRole(o.Approver);
        },
        get OWNER_ROLE() {
          return c.makeFromShareRole(o.Owner);
        },
        get VIEWER_ROLE() {
          return c.makeFromShareRole(o.Viewer);
        },
      }),
      (e.exports = c);
  }