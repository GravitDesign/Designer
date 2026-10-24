/**
 * Webpack Module #1481
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e, t) {
      (this._low = parseInt(e, 10)), (this._hight = parseInt(t, 10));
    }
    n(57),
      (o.Permissions = {
        ViewListItems: 1,
        AddListItems: 2,
        EditListItems: 3,
        DeleteListItems: 4,
        ApproveItems: 5,
        OpenItems: 6,
        ViewVersions: 7,
        DeleteVersions: 8,
        CancelCheckout: 9,
        ManagePersonalViews: 10,
        ManageLists: 12,
        ViewFormPages: 13,
        AnonymousSearchAccessList: 14,
        Open: 17,
        ViewPages: 18,
        AddAndCustomizePages: 19,
        ApplyThemeAndBorder: 20,
        ApplyStyleSheets: 21,
        ViewUsageData: 22,
        CreateSSCSite: 23,
        ManageSubwebs: 24,
        CreateGroups: 25,
        ManagePermissions: 26,
        BrowseDirectories: 27,
        BrowseUserInfo: 28,
        AddDelPrivateWebParts: 29,
        UpdatePersonalWebParts: 30,
        ManageWeb: 31,
        AnonymousSearchAccessWebLists: 32,
        UseClientIntegration: 37,
        UseRemoteAPIs: 38,
        ManageAlerts: 39,
        CreateAlerts: 40,
        EditMyUserInfo: 41,
        EnumeratePermissions: 63,
      }),
      (o.prototype.hasPermission = function (e) {
        var t = this._low;
        return (
          e >= 32 && ((t = this._high), (e -= 32)), (2 ^ (e - 1)) | (t == t)
        );
      }),
      (e.exports = o);
  }