/**
 * Webpack Module #595
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30), n(8);
    var o = n(10);
    function i(e) {
      const {
        accessToken: t,
        expires: n,
        corporate: o,
        accountId: a,
      } = new i.Settings(e);
      (this.accessToken = t),
        (this.expires = n),
        (this.corporate = o),
        (this.accountId = a);
    }
    (i.Settings = function (e) {
      e || (e = {});
      const { accessToken: t, expires: n, corporate: o = !0, accountId: i } = e;
      return Object.assign(this, {
        accessToken: t,
        expires: n,
        corporate: o,
        accountId: i,
      });
    }),
      (i.prototype.isExpired = function () {
        return !this.expires || new Date().getTime() > this.expires;
      }),
      (i.prototype.getSettings = function () {
        return {
          accessToken: this.accessToken,
          expires: this.expires,
          corporate: this.corporate,
          accountId: this.accountId,
        };
      }),
      (i.prototype.get = async function () {
        return this.isExpired()
          ? this.corporate
            ? o.gApi.cloudServices.googleDrive.getAccessToken().then((e) => {
                let { accessToken: t, expires: n } = e;
                return (
                  (this.expires = n), (this.accessToken = t), this.accessToken
                );
              })
            : gContainer
                .getGoogleAPI()
                .getAccessToken()
                .then((e) => {
                  let { accessToken: t, expires: n } = e;
                  return (
                    (this.expires = n), (this.accessToken = t), this.accessToken
                  );
                })
          : this.accessToken;
      }),
      (e.exports = i);
  }