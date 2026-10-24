/**
 * Webpack Module #1166
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58), n(8), n(71);
    const o = n(177),
      i = n(805),
      { gApi: a } = n(10),
      r = {};
    let s = !1;
    const l = (e) => {
      delete r[e.user.getUID()];
    };
    function c(e) {
      e instanceof o || (e = new o(e)),
        (this._user = e),
        s || (gDesigner.addEventListener(i, l), (s = !0));
    }
    (c.getUserDataFromAnnotAndUser = function (e, t) {
      const n = e.getProperty("uid");
      let o = e.getProperty("name"),
        i = "";
      return (
        n === t.getUID() &&
          ((o = t.getFirstName() || o), (i = t.getLastName() || "")),
        { id: n, name: o, last_name: i }
      );
    }),
      (c.prototype.build = function (e) {
        var t = null;
        const n = $("<span></span>")
          .addClass("g-user-preview")
          .append(
            $("<div />")
              .append(this._user.getUserNameInitials())
              .addClass("color-preview")
              .css({ "background-color": this._user.getUserColor() })
          );
        return (
          (async (e) => {
            if (!r.hasOwnProperty(e)) {
              const t = await a
                .getUser(e, !0)
                .catch(() => Promise.resolve(null));
              r[e] = new o(t);
            }
            return r[e];
          })(this._user.getUID()).then((o) => {
            o &&
              (t = this._user.avatar || o.avatar) &&
              (t.includes("graph.microsoft.com") ||
              ("http" !== t.substr(0, 4) && "assets" !== t.substr(0, 6))
                ? "<svg" === t.substr(0, 4) &&
                  n
                    .empty()
                    .append(
                      $(t)
                        .addClass("g-user-preview")
                        .toggleClass("grayed", !1)
                        .addClass("svg")
                    )
                : (this._user.hasOwnPictureAvatar() ||
                    (!this._user.avatar && o.hasOwnPictureAvatar())) &&
                  n
                    .empty()
                    .append(
                      $("<img>")
                        .attr("src", t)
                        .addClass("g-user-preview")
                        .toggleClass("grayed", !1)
                    )),
              e && e();
          }),
          n
        );
      }),
      (e.exports = c);
  }