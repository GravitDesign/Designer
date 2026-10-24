/**
 * Webpack Module #1560
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(96), n(30), n(8);
    var i = n(1),
      a = n(53),
      r = o(n(1561)),
      s = o(n(177));
    const { gApi: l } = n(10);
    e.exports = class {
      constructor(e, t) {
        let n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        (this._firstName = e),
          (this._lastName = t),
          (this._anonymous = n),
          (this._confirmBtn = $("<button/>")
            .addClass("confirm-btn")
            .attr("disabled", this._checkNameFieldsFilled())
            .text(
              i.GLocale.get(
                new i.GLocaleKey("GUserNameConfigDialog", "text.ok")
              )
            )
            .on("click", () => {
              gDesigner.stats("user-name-config-dialog_update-user-name"),
                this._updateUserName();
            })),
          (this._dialog = $("<div/>")
            .append(
              $("<div/>")
                .addClass("header")
                .append(
                  $("<span/>")
                    .addClass("title")
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GUserNameConfigDialog",
                          "text.dialog-title"
                        )
                      )
                    )
                )
            )
            .append(
              $("<div/>")
                .addClass("tips-content-container")
                .append(
                  $("<span/>")
                    .addClass("tips")
                    .text(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GUserNameConfigDialog",
                          "text.name-usage-tips"
                        )
                      )
                    )
                )
            )
            .append(this._buildNameFields())
            .append(this._confirmBtn)
            .gDialog({
              releaseOnClose: !0,
              className: "g-username-config-dialog",
            }));
      }
      _buildNameFields() {
        return $("<div/>")
          .addClass("name-fields")
          .append(
            $("<div/>")
              .addClass("label-and-input")
              .addClass("first-name-field")
              .append(
                $("<span/>").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GUserNameConfigDialog", "text.first-name")
                  )
                )
              )
              .append(
                $("<input/>")
                  .addClass("field-input")
                  .val(this._firstName)
                  .on("input", (e) => this._nameFieldValueChange(!0, e))
                  .on("change", (e) => this._nameFieldValueChange(!0, e))
              )
          )
          .append(
            $("<div/>")
              .addClass("label-and-input")
              .addClass("last-name-field")
              .append(
                $("<span/>").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GUserNameConfigDialog", "text.last-name")
                  )
                )
              )
              .append(
                $("<input/>")
                  .addClass("field-input")
                  .val(this._lastName)
                  .on("input", (e) => this._nameFieldValueChange(!1, e))
                  .on("change", (e) => this._nameFieldValueChange(!1, e))
              )
          );
      }
      async _updateUserName() {
        const e = { name: this._firstName, last_name: this._lastName },
          t = new s.default(e);
        this._anonymous
          ? gContainer.setCookie({
              name: r.default.ANONYMOUS_USERNAME,
              value: encodeURIComponent(JSON.stringify(e)),
            })
          : await l.updateUser(e),
          await this._updateUserProperties(t),
          this.close();
      }
      async _updateUserProperties(e) {
        (a.GEditorOptions.userConfig = Object.assign(
          {},
          a.GEditorOptions.userConfig,
          { userName: e.getFullUserName() }
        )),
          gDesigner.getCloudCommunicationManager().userPropertiesChanged(),
          await gDesigner.getUser();
      }
      _checkNameFieldsFilled() {
        return !this._firstName || !this._firstName.length;
      }
      _nameFieldValueChange(e, t) {
        e
          ? (this._firstName = $(t.target).val())
          : (this._lastName = $(t.target).val()),
          this._confirmBtn.attr("disabled", this._checkNameFieldsFilled());
      }
      open() {
        gDesigner.stats("user-name-config-dialog_open"),
          this._dialog.gDialog("open", !1);
      }
      close() {
        this._dialog.gDialog("close");
      }
    };
  }