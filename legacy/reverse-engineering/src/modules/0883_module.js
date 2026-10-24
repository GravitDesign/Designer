/**
 * Webpack Module #883
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30);
    const o = n(177);
    class i extends o {
      constructor() {
        let {
          id: e,
          name: t,
          last_name: n,
          email: o,
          showText: i,
          avatar: a,
          role: r,
          fontWeight: s = "normal",
          type: l = "contact",
          trigger: c = "@",
          additional: d = !1,
        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        super({
          id: e,
          name: t,
          last_name: n,
          email: o,
          showText: i,
          avatar: a,
          fontWeight: s,
          type: l,
          trigger: c,
        }),
          (this.value = ""),
          (this._role = r),
          (this._additional = d);
      }
      setValue(e) {
        this.value = e;
      }
      getFullUserName() {
        return this._additional ? this.name : super.getFullUserName();
      }
      static createUserMention(e, t) {
        let n = e.getFirstName();
        return new i({
          id: e.getUID(),
          name: n,
          last_name: e.getLastName(),
          showText: "@" + e.getFullUserName(),
          avatar: t ? t.avatar : "assets/icon/notification-icon.svg",
          role: e.getRole(),
          email: e.getEmail(),
        });
      }
      static clone(e) {
        const t = new i();
        return Object.assign(t, e), t;
      }
    }
    e.exports = i;
  }