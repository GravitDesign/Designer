/**
 * GError
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GError(e) {
      const {
        accessToken: t,
        expires: n,
        corporate: o,
        accountId: a,
      } = new i.Settings(e);
      (this.accessToken = t);
(this.expires = n);
(this.corporate = o);
(this.accountId = a);
    }

// Prototype methods
GError.prototype.isExpired = function () {
        return !this.expires || new Date().getTime() > this.expires;
      }

GError.prototype.getSettings = function () {
        return {
          accessToken: this.accessToken,
          expires: this.expires,
          corporate: this.corporate,
          accountId: this.accountId,
        };
      }


module.exports = GError;
