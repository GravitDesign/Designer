/**
 * Webpack Module #1640
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(57),
      n(8),
      n(71),
      n(91),
      n(4),
      n(41),
      n(13),
      n(38),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1),
      a = o(n(1343)),
      r = o(n(44)),
      s = n(40);
    function l() {}
    i.GObject.inherit(l, i.GObject),
      (l.prototype._translationManager = null),
      (l.prototype._hasUnappliedChanges = null),
      (l.prototype._shouldDownloadMetaData = !1),
      (l.prototype._currentLanguage = null),
      (l.prototype._dialog = null),
      (l.prototype.init = function () {
        (this._translationManager = gDesigner.getTranslationManager()),
          (this._dialog = $("<div></div>").gDialog({
            releaseOnClose: !0,
            className: "g-translation-tool-dialog",
          })),
          $("<div></div>")
            .addClass("g-btn-close")
            .append($("<span></span>").addClass("gravit-icon-close"))
            .on("click", this.close.bind(this))
            .appendTo(this._dialog),
          (this._container = $("<div></div>")
            .addClass("container")
            .appendTo(this._dialog)),
          (this._panel = $("<div></div>")
            .addClass("panel")
            .appendTo(this._container)),
          (this._header = $("<div></div>")
            .addClass("header")
            .append(
              $("<span/>")
                .addClass("spin")
                .addClass("loading-element")
                .load("assets/icon/gravit-icon-rotate-right-flat.svg")
            )
            .append($("<span></span>").text("Choose project"))
            .append(
              $("<select></select>")
                .addClass("project-chooser")
                .append(
                  this._translationManager
                    .getProjectsDescription()
                    .map((e) => $("<option></option>").text(e).attr("value", e))
                )
                .on("change", (e) => {
                  this._translationManager
                    .getProjectsDescription()
                    .includes(e.target.value) &&
                    this._handleProjectChange(e.target.value);
                })
            )
            .append($("<span></span>").text("Choose language"))
            .append(
              $("<select></select>")
                .addClass("language-chooser")
                .on("change", (e) => {
                  this._handleLanguageChange(e.target.value, e);
                })
            )
            .append($("<span></span>").text("Available"))
            .append(
              $("<input></input>")
                .attr("type", "checkbox")
                .addClass("check-available")
                .on("change", (e) =>
                  this._toggleCurrentLanguageAvailability(e.target.checked)
                )
            )
            .append($("<span></span>").text("Filter by temporary translations"))
            .append(
              $("<input></input>")
                .attr("type", "checkbox")
                .addClass("check-temporary")
                .on("change", (e) => {
                  const t = $(e.target).closest("input").is(":checked");
                  this._body
                    .find(".translations-container")
                    .toggleClass("filter-by-temporary", !!t);
                })
            )
            .append(
              $("<span></span>")
                .addClass("only-export-empty-strings")
                .text("Only export empty strings?")
            )
            .append(
              $("<input></input>")
                .attr("type", "checkbox")
                .on(
                  "change",
                  (e) => (this._onlyExportEmptyStrings = e.target.checked)
                )
            )
            .append(
              $("<button></button>")
                .addClass("button")
                .text("Export CSV")
                .click(this._exportAsCSV.bind(this))
            )
            .append(
              $("<button></button>")
                .addClass("button")
                .text("Import CSV")
                .click(this._handleCSVImport.bind(this))
            )
            .append(
              $("<button></button>")
                .addClass("button")
                .text("New language")
                .click(this._handleNewLanguage.bind(this))
            )
            .appendTo(this._panel)),
          $("<hr></hr>").appendTo(this._panel),
          (this._body = $("<div></div>")
            .addClass("body")
            .appendTo(this._panel)),
          (this._footer = $("<div></div>")
            .addClass("footer")
            .append(
              $("<button></button>")
                .addClass("button")
                .text("Apply")
                .on("click", this._applyChanges.bind(this))
            )
            .append(
              $("<button></button>")
                .addClass("button")
                .text("Download")
                .on("click", this._downloadMetaData.bind(this))
            )
            .appendTo(this._panel)),
          this._handleProjectChange(i.GTranslation.Projects.Designer),
          this.open();
      }),
      (l.prototype.open = function () {
        this._dialog.gDialog("open", !1);
      }),
      (l.prototype._handleProjectChange = function (e) {
        this._translationManager.loadProjectTranslations(e),
          this._updateUIComponents(),
          this._handleLanguageChange(i.GLocaleLanguage.Default, !0);
      }),
      (l.prototype._applyChanges = function () {
        this._translationManager
          .applyTranslationPatch([this._translation])
          .then(() => {
            (this._hasUnappliedChanges = !1),
              (this._shouldDownloadMetaData = !0);
          });
      }),
      (l.prototype._toggleCurrentLanguageAvailability = function (e) {
        (this._translation.isAvailable = e), (this._hasUnappliedChanges = !0);
      }),
      (l.prototype._handleLanguageChange = function (e) {
        let t = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
        if (!t && parseInt(this._currentLanguage) === parseInt(e)) return;
        const n = () => {
          this._setLoadingStatus(!0),
            (this._currentLanguage = parseInt(e)),
            (this._hasUnappliedChanges = !1);
          let t = this._translationManager.isConsideringExtension();
          this._header.find(".language-chooser").val(this._currentLanguage),
            this._body.find(".translations-container").remove();
          var n = $("<div></div>")
            .addClass("translations-container")
            .toggleClass(
              "filter-by-temporary",
              this._header.find(".check-temporary").is(":checked")
            );
          (this._translation = this._translationManager.getTranslationCopy(
            this._currentLanguage
          )),
            this._header
              .find(".check-available")
              .prop("checked", this._translation.isAvailable),
            n.append(
              Object.keys(this._translation.translations).map((e) => {
                let n = $("<div></div>").addClass("path");
                return (
                  n.append($("<span></span>").addClass("description").text(e)),
                  n.append(
                    Object.keys(this._translation.translations[e]).map((o) => {
                      let i = $("<div></div>").addClass("row"),
                        a = this._translation.translations[e][o];
                      const r =
                        this._translation.translationsTemporary &&
                        this._translation.translationsTemporary[e] &&
                        this._translation.translationsTemporary[e][o];
                      let s = !(!r || (a && a.trim()));
                      if (
                        ((a = s ? r : a),
                        $("<input></input>")
                          .addClass("key")
                          .attr("disabled", !0)
                          .attr("placeholder", "Key")
                          .val(o)
                          .attr("data-title", a)
                          .appendTo(i),
                        s &&
                          i.append(
                            $("<span/>")
                              .addClass("gravit-icon-google-translate")
                              .attr(
                                "data-title",
                                "This is a temporary translation provided by Google Translator"
                              )
                          ),
                        $("<input></input>")
                          .addClass("value")
                          .data({
                            language: this._currentLanguage,
                            path: e,
                            key: o,
                            originalValue: this._translation.translations[e][o],
                          })
                          .on("change", (t) => {
                            (this._translation.translations[e][o] =
                              t.target.value),
                              (this._hasUnappliedChanges = !0);
                          })
                          .attr("placeholder", "Translation")
                          .val(a)
                          .appendTo(i),
                        t)
                      ) {
                        var l =
                          this._translation.translationsExtended &&
                          this._translation.translationsExtended[e] &&
                          this._translation.translationsExtended[e][o];
                        const t =
                          this._translation.translationsExtendedTemporary &&
                          this._translation.translationsExtendedTemporary[e] &&
                          this._translation.translationsExtendedTemporary[e][o];
                        (l = t || l),
                          (s = s || !!t),
                          t &&
                            i.append(
                              $("<span/>")
                                .addClass("gravit-icon-google-translate")
                                .attr(
                                  "data-title",
                                  "This is a temporary translation provided by Google Translator"
                                )
                            ),
                          $("<input></input>")
                            .addClass("value")
                            .data({
                              language: this._currentLanguage,
                              path: e,
                              key: o,
                              extension: !0,
                              originalValue: l,
                            })
                            .on("change", (t) => {
                              t.target.value.trim()
                                ? (this._translation.translationsExtended ||
                                    (this._translation.translationsExtended =
                                      {}),
                                  this._translation.translationsExtended[e] ||
                                    (this._translation.translationsExtended[e] =
                                      {}),
                                  (this._translation.translationsExtended[e][
                                    o
                                  ] = t.target.value))
                                : delete this._translation.translationsExtended[
                                    e
                                  ][o],
                                (this._hasUnappliedChanges = !0);
                            })
                            .attr("placeholder", "Extension")
                            .val(l || "")
                            .appendTo(i);
                      }
                      return (
                        s && (i.addClass("temporary"), n.addClass("temporary")),
                        i
                      );
                    })
                  ),
                  n
                );
              })
            ),
            n.appendTo(this._body),
            this._setLoadingStatus(!1);
        };
        this._hasUnappliedChanges
          ? r.default.confirm(
              "You have modified strings, you'll lose them if you don't apply them first, are you sure?",
              (e) => {
                e
                  ? n()
                  : this._header
                      .find(".language-chooser")
                      .val(this._currentLanguage);
              }
            )
          : n();
      }),
      (l.prototype.close = function () {
        this._hasUnappliedChanges || this._shouldDownloadMetaData
          ? this._shouldDownloadMetaData
            ? r.default.confirm(
                "You haven't downloaded the translations after applying changes, are you sure about closing?",
                (e) => {
                  e && this._close();
                }
              )
            : r.default.confirm(
                "You have modified strings, are you sure about closing?",
                (e) => {
                  e && this._close();
                }
              )
          : this._close();
      }),
      (l.prototype._close = function () {
        (this._hasUnappliedChanges = !1),
          (this._currentLanguage = null),
          (this._shouldDownloadMetaData = !1),
          this._dialog.gDialog("close", !1, 0);
      }),
      (l.prototype._downloadMetaData = async function () {
        var e = async () => {
          this._manageDownload(
            "translations_"
              .concat(this._translationManager.getActiveProject(), ".json")
              .toLowerCase(),
            await this._translationManager.getMetaData()
          ),
            (this._shouldDownloadMetaData = !1);
        };
        this._hasUnappliedChanges
          ? r.default.confirm(
              "You have modified strings, do you want to download before applying your changes?",
              (t) => {
                t && e();
              }
            )
          : e();
      }),
      (l.prototype._exportAsCSV = async function () {
        var e = Object.keys(i.GLocaleLanguage)[
          Object.values(i.GLocaleLanguage).indexOf(this._currentLanguage)
        ];
        this._manageDownload(
          "translations_"
            .concat(this._translationManager.getActiveProject(), "_")
            .concat(e, ".csv")
            .toLocaleLowerCase(),
          await this._translationManager.export(
            a.default.FormatTypes.CSV,
            this._currentLanguage,
            this._onlyExportEmptyStrings
          )
        );
      }),
      (l.prototype._handleCSVImport = async function () {
        try {
          this._setLoadingStatus(!0),
            gDesigner.getDefaultStorage().openPrompt(
              [{ ext: "csv", mime: "text/csv" }],
              (e) => {
                e &&
                  e.read((e) => {
                    var t = (0, s.decodeFromUTF8)(e);
                    this._translationManager
                      .import(t)
                      .then(() =>
                        this._handleLanguageChange(this._currentLanguage, !0)
                      )
                      .catch((e) => this._handleError(e));
                  });
              },
              !1
            );
        } catch (e) {
          this._handleError(e);
        } finally {
          this._setLoadingStatus(!1);
        }
      }),
      (l.prototype._manageDownload = function (e, t) {
        var n = document.createElement("a");
        n.setAttribute(
          "href",
          URL.createObjectURL(new Blob([t], { type: "text/plain" }))
        ),
          n.setAttribute("download", e),
          (n.style.display = "none"),
          document.body.appendChild(n),
          n.click(),
          document.body.removeChild(n);
      }),
      (l.prototype._handleError = function (e) {
        "string" != typeof e || r.default.alert(e);
      }),
      (l.prototype._setLoadingStatus = function (e) {
        var t = this._header.find(".loading-element");
        e ? t.addClass("visible") : t.removeClass("visible");
      }),
      (l.prototype._handleNewLanguage = function () {
        r.default.prompt("Please name the new language (English)!", (e) => {
          e
            ? r.default.prompt(
                "Please inform the real name of the language!",
                (t) => {
                  r.default.prompt(
                    "Please inform the ISO Language Code!",
                    (n) => {
                      this._translationManager
                        .createNewLanguage(e, t, n)
                        .then((e) => {
                          (this._shouldDownloadMetaData = !0),
                            this._updateUIComponents(),
                            this._handleLanguageChange(e.keyValue);
                        })
                        .catch((e) => this._handleError(e));
                    }
                  );
                }
              )
            : r.default.alert("Invalid value ('".concat(e, "') for language!"));
        });
      }),
      (l.prototype._updateUIComponents = function () {
        this._header
          .find(".project-chooser")
          .val(this._translationManager.getActiveProject());
        var e = this._header.find(".language-chooser");
        e.find("option").remove(),
          e.append(
            Object.keys(i.GLocaleLanguage)
              .filter((e) => "Default" !== e)
              .filter(
                (e) =>
                  !!this._translationManager.getTranslationByKey(
                    i.GLocaleLanguage[e]
                  )
              )
              .map((e) =>
                $("<option></option>")
                  .text(e)
                  .attr("value", i.GLocaleLanguage[e])
              )
          );
      }),
      (e.exports = l);
  }