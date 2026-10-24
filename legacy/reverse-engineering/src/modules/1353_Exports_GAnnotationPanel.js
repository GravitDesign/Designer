/**
 * Webpack Module #1353
 * Type: exports
 * Name: Exports_GAnnotationPanel
 */

function (e, t, n) {
    "use strict";
    const { GLocale: o, GLocaleKey: i } = n(1),
      a = n(883);
    e.exports = {
      createAdditionalMentions: function () {
        return {
          MENTION_ALL_REVIEWERS: new a({
            name: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-reviewers-name"
              )
            ),
            showText: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-reviewers-show-text"
              )
            ),
            id: "@reviewers",
            avatar: "assets/icon/notification-icon.svg",
            fontWeight: "bold",
            type: "contact",
            role: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-reviewers-role"
              )
            ),
            email: "",
            additional: !0,
          }),
          MENTION_ALL_APPROVERS: new a({
            name: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-approvers-name"
              )
            ),
            showText: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-approvers-show-text"
              )
            ),
            id: "@approvers",
            avatar: "assets/icon/notification-icon.svg",
            fontWeight: "bold",
            type: "contact",
            role: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-approvers-role"
              )
            ),
            email: "",
            additional: !0,
          }),
          MENTION_ALL_CO_AUTHORS: new a({
            name: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-co-author-name"
              )
            ),
            showText: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-co-author-show-text"
              )
            ),
            id: "@coauthors",
            avatar: "assets/icon/notification-icon.svg",
            fontWeight: "bold",
            type: "contact",
            role: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-co-author-role"
              )
            ),
            email: "",
            additional: !0,
          }),
          MENTION_ALL: new a({
            name: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-name"
              )
            ),
            showText: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-show-text"
              )
            ),
            id: "@all",
            avatar: "assets/icon/notification-icon.svg",
            fontWeight: "bold",
            type: "contact",
            role: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-all-role"
              )
            ),
            email: "",
            additional: !0,
          }),
          MENTION_OWNER: new a({
            name: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-owner-name"
              )
            ),
            showText: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-owner-show-text"
              )
            ),
            id: "@owner",
            avatar: "assets/icon/notification-icon.svg",
            fontWeight: "bold",
            type: "contact",
            role: o.get(
              new i(
                "GAnnotationPanel",
                "text.additional-collaborators-owner-role"
              )
            ),
            email: "",
            additional: !0,
          }),
        };
      },
    };
  }