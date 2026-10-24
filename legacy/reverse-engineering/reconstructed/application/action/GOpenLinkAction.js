/**
 * GOpenLinkAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GOpenLinkAction(e) {
      let { name: t, category: n, group: i, link: a, icon: r, builder: s } = e;
      (this._name = t);
(this._category = n);
(this._group = i);
(this._link = a);
(this._builder = s);
(this._title = new o.GLocaleKey("GOpenLinkAction", "title." + t));
(this._icon = r);
    }

GObject.inherit(GOpenLinkAction, GAction);

// Prototype methods
GOpenLinkAction.prototype.getIcon = function () {
        return this._icon || null;
      }

GOpenLinkAction.prototype.getId = function () {
        return a.ID + "." + this._name;
      }

GOpenLinkAction.prototype.getTitle = function () {
        return this._title;
      }

GOpenLinkAction.prototype.getCategory = function () {
        return this._category;
      }

GOpenLinkAction.prototype.getGroup = function () {
        return this._group;
      }

GOpenLinkAction.prototype.isEnabled = function () {
        return true;
      }

GOpenLinkAction.prototype.execute = function () {
        if (this._link || this._builder) {
          let e =
            (this._builder &&
              "function" == typeof this._builder &&
              this._builder()) ||
            this._link;
          e && gContainer.openExternalLink(null, e);
        }
      }

GOpenLinkAction.prototype.toString = function () {
        return "[Object GOpenLinkAction]";
      }


module.exports = GOpenLinkAction;
