/**
 * Webpack Module #18
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i(e) {
      let t =
          !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1],
        n = arguments.length > 2 ? arguments[2] : void 0;
      (this.label = o.GLocale.get(e)),
        (this.visible = t),
        (this.icon = n),
        (this.parent = null);
    }
    function a(e) {
      let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
        n =
          arguments.length > 2 && void 0 !== arguments[2]
            ? arguments[2]
            : () => !0,
        a =
          arguments.length > 3 && void 0 !== arguments[3]
            ? arguments[3]
            : () => null;
      var r = new i();
      return (
        Object.defineProperties(r, {
          label: { get: () => o.GLocale.get(new o.GLocaleKey(e[0], e[1])) },
          visible: { get: n },
          icon: { get: a },
          parent: { get: () => t },
        }),
        r
      );
    }
    o.GObject.inherit(i, o.GObject),
      (i.prototype.label = null),
      (i.prototype.visible = !0),
      (i.prototype.icon = null),
      (i.CATEGORY_FILE = a(["GCategory", "category.file"])),
      (i.CATEGORY_FILE_SHARE = a(
        ["GCategory", "category.file.share"],
        i.CATEGORY_FILE
      )),
      (i.CATEGORY_FILE_OPEN_RECENT = a(
        ["GCategory", "category.file.open-recent"],
        i.CATEGORY_FILE
      )),
      (i.CATEGORY_FILE_SAVE_AS = a(
        ["GCategory", "category.file.save-as"],
        i.CATEGORY_FILE
      )),
      (i.CATEGORY_FILE_GRAVIT_CLOUD = a(
        ["GCategory", "category.file.gravit-cloud"],
        i.CATEGORY_FILE
      )),
      (i.CATEGORY_FILE_IMPORT = a(
        ["GCategory", "category.file.import"],
        i.CATEGORY_FILE
      )),
      (i.CATEGORY_FILE_IMPORT_IMAGE = a(
        ["GCategory", "category.file.import.image"],
        i.CATEGORY_FILE_IMPORT
      )),
      (i.CATEGORY_FILE_EXPORT = a(
        ["GCategory", "category.file.export"],
        i.CATEGORY_FILE,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-export" : null)
      )),
      (i.CATEGORY_FILE_EXPORT_PDF = a(
        ["GCategory", "category.file.export.pdf"],
        i.CATEGORY_FILE_EXPORT
      )),
      (i.CATEGORY_EDIT = a(["GCategory", "category.edit"])),
      (i.CATEGORY_EDIT_PASTE = a(
        ["GCategory", "category.edit.paste"],
        i.CATEGORY_EDIT,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-paste" : null)
      )),
      (i.CATEGORY_EDIT_SELECT_SAME = a(
        ["GCategory", "category.edit.select-same"],
        i.CATEGORY_EDIT
      )),
      (i.CATEGORY_MODIFY = a(["GCategory", "category.modify"])),
      (i.CATEGORY_MODIFY_COMBINE = a(
        ["GCategory", "category.modify.combine"],
        i.CATEGORY_MODIFY
      )),
      (i.CATEGORY_MODIFY_ARRANGE = a(
        ["GCategory", "category.modify.arrange"],
        i.CATEGORY_MODIFY,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-arrange" : null)
      )),
      (i.CATEGORY_MODIFY_ALIGN = a(
        ["GCategory", "category.modify.align"],
        i.CATEGORY_MODIFY,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-align" : null)
      )),
      (i.CATEGORY_MODIFY_TRANSFORM = a(
        ["GCategory", "category.modify.transform"],
        i.CATEGORY_MODIFY,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-transform" : null)
      )),
      (i.CATEGORY_MODIFY_PATH = a(
        ["GCategory", "category.modify.path"],
        i.CATEGORY_MODIFY
      )),
      (i.CATEGORY_MODIFY_SYMBOL = a(
        ["GCategory", "category.modify.symbol"],
        i.CATEGORY_MODIFY,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-symbol" : null)
      )),
      (i.CATEGORY_VIEW = a(
        ["GCategory", "category.view"],
        null,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-no-icon" : null)
      )),
      (i.CATEGORY_VIEW_CANVAS = a(
        ["GCategory", "category.view.canvas"],
        i.CATEGORY_VIEW
      )),
      (i.CATEGORY_VIEW_SNAP = a(
        ["GCategory", "category.view.snap"],
        i.CATEGORY_VIEW,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-snap" : null)
      )),
      (i.CATEGORY_VIEW_MAGNIFICATION = a(
        ["GCategory", "category.view.magnification"],
        i.CATEGORY_VIEW,
        () => !0,
        () => (gDesigner.isTouchEnabled() ? "gravit-icon-zoom-in" : null)
      )),
      (i.CATEGORY_HELP = a(["GCategory", "category.help"])),
      (i.CATEGORY_HELP_SUPPORT = a(
        ["GCategory", "category.help.support"],
        i.CATEGORY_HELP
      )),
      (i.CATEGORY_HELP_BETA_FEEDBACK = a(
        ["GCategory", "category.help.beta_feedback"],
        i.CATEGORY_HELP
      )),
      (i.CATEGORY_HELP_LEARN = a(
        ["GCategory", "category.help.learn"],
        i.CATEGORY_HELP
      )),
      (i.CATEGORY_HELP_LANGUAGE = a(
        ["GCategory", "category.help.language"],
        i.CATEGORY_HELP
      )),
      (i.CATEGORY_HELP_SWITCHWEBCDR = a(
        ["GCategory", "category.help.switchwebcdr"],
        i.CATEGORY_HELP
      )),
      (i.CATEGORY_ACCOUNT = a(
        ["GCategory", "category.account"],
        null,
        () => gDesigner.isTouchEnabled(),
        () => {
          const e = gDesigner.getSyncUser();
          if (e) {
            if (e.hasOwnPictureAvatar())
              return $("<div/>")
                .addClass("avatar")
                .css("background-image", 'url("'.concat(e.avatar, '")'));
            const t = e.getUserColor();
            return $("<div/>")
              .addClass("avatar")
              .css("background-color", t)
              .css("border-color", t)
              .append($("<span/>").text(e.getUserNameInitials()));
          }
          return null;
        }
      )),
      (e.exports = i);
  }