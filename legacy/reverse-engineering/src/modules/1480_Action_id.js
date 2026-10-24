/**
 * Webpack Module #1480
 * Type: action
 * Name: Action_id
 */

function (e, t, n) {
    window,
      (e.exports = (function (e) {
        var t = {};
        function n(o) {
          if (t[o]) return t[o].exports;
          var i = (t[o] = { i: o, l: !1, exports: {} });
          return e[o].call(i.exports, i, i.exports, n), (i.l = !0), i.exports;
        }
        return (
          (n.m = e),
          (n.c = t),
          (n.d = function (e, t, o) {
            n.o(e, t) ||
              Object.defineProperty(e, t, { enumerable: !0, get: o });
          }),
          (n.r = function (e) {
            "undefined" != typeof Symbol &&
              Symbol.toStringTag &&
              Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }),
              Object.defineProperty(e, "__esModule", { value: !0 });
          }),
          (n.t = function (e, t) {
            if ((1 & t && (e = n(e)), 8 & t)) return e;
            if (4 & t && "object" == typeof e && e && e.__esModule) return e;
            var o = Object.create(null);
            if (
              (n.r(o),
              Object.defineProperty(o, "default", { enumerable: !0, value: e }),
              2 & t && "string" != typeof e)
            )
              for (var i in e)
                n.d(
                  o,
                  i,
                  function (t) {
                    return e[t];
                  }.bind(null, i)
                );
            return o;
          }),
          (n.n = function (e) {
            var t =
              e && e.__esModule
                ? function () {
                    return e.default;
                  }
                : function () {
                    return e;
                  };
            return n.d(t, "a", t), t;
          }),
          (n.o = function (e, t) {
            return Object.prototype.hasOwnProperty.call(e, t);
          }),
          (n.p = ""),
          n((n.s = 19))
        );
      })([
        function (e, t, n) {
          "use strict";
          var o =
            (this && this.__spreadArray) ||
            function (e, t, n) {
              if (n || 2 === arguments.length)
                for (var o, i = 0, a = t.length; i < a; i++)
                  (!o && i in t) ||
                    ((o = o || Array.prototype.slice.call(t, 0, i))[i] = t[i]);
              return e.concat(o || Array.prototype.slice.call(t));
            };
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.sendMessageEventToChild =
              t.waitForMessageQueue =
              t.sendMessageToParent =
              t.uninitializeCommunication =
              t.initializeCommunication =
              t.Communication =
                void 0);
          var i = n(4),
            a = n(7),
            r = n(3),
            s = function () {};
          t.Communication = s;
          var l = (function () {
            function e() {}
            return (
              (e.parentMessageQueue = []),
              (e.childMessageQueue = []),
              (e.nextMessageId = 0),
              (e.callbacks = {}),
              e
            );
          })();
          function c(e, t, n) {
            var o;
            t instanceof Function ? (n = t) : t instanceof Array && (o = t),
              (t = s.parentWindow),
              (e = (function (e, t) {
                return {
                  id: l.nextMessageId++,
                  func: e,
                  timestamp: Date.now(),
                  args: t || [],
                };
              })(e, o)),
              a.GlobalVars.isFramelessWindow
                ? s.currentWindow &&
                  s.currentWindow.nativeInterface &&
                  s.currentWindow.nativeInterface.framelessPostMessage(
                    JSON.stringify(e)
                  )
                : ((o = g(t)), t && o ? t.postMessage(e, o) : p(t).push(e)),
              n && (l.callbacks[e.id] = n);
          }
          function d(e) {
            var t, n;
            e &&
              e.data &&
              "object" == typeof e.data &&
              (function (e, t) {
                return (
                  (!s.currentWindow || e !== s.currentWindow) &&
                  ((s.currentWindow &&
                    s.currentWindow.location &&
                    t &&
                    t === s.currentWindow.location.origin) ||
                    !!(
                      i.validOriginRegExp.test(t.toLowerCase()) ||
                      (a.GlobalVars.additionalValidOriginsRegexp &&
                        a.GlobalVars.additionalValidOriginsRegexp.test(
                          t.toLowerCase()
                        ))
                    ))
                );
              })(
                (t = e.source || (e.originalEvent && e.originalEvent.source)),
                (n = e.origin || (e.originalEvent && e.originalEvent.origin))
              ) &&
              ((function (e, t) {
                a.GlobalVars.isFramelessWindow ||
                (s.parentWindow &&
                  !s.parentWindow.closed &&
                  e !== s.parentWindow)
                  ? (s.childWindow &&
                      !s.childWindow.closed &&
                      e !== s.childWindow) ||
                    ((s.childWindow = e), (s.childOrigin = t))
                  : ((s.parentWindow = e), (s.parentOrigin = t)),
                  s.parentWindow &&
                    s.parentWindow.closed &&
                    ((s.parentWindow = null), (s.parentOrigin = null)),
                  s.childWindow &&
                    s.childWindow.closed &&
                    ((s.childWindow = null), (s.childOrigin = null)),
                  h(s.parentWindow),
                  h(s.childWindow);
              })(t, n),
              t === s.parentWindow
                ? u(e)
                : t === s.childWindow &&
                  (function (e) {
                    var t, n;
                    "id" in e.data &&
                      "func" in e.data &&
                      ((t = e.data),
                      (e = (n = (0, r.callHandler)(t.func, t.args))[0]),
                      (n = n[1]),
                      e && void 0 !== n
                        ? f(t.id, Array.isArray(n) ? n : [n])
                        : c(t.func, t.args, function () {
                            for (
                              var e, n = [], o = 0;
                              o < arguments.length;
                              o++
                            )
                              n[o] = arguments[o];
                            s.childWindow && ((e = n.pop()), f(t.id, n, e));
                          }));
                  })(e));
          }
          function u(e) {
            var t, n;
            "id" in e.data && "number" == typeof e.data.id
              ? ((n = e.data),
                (t = l.callbacks[n.id]) &&
                  (t.apply(
                    null,
                    o(o([], n.args, !0), [n.isPartialResponse], !1)
                  ),
                  (function (e) {
                    return !0 === e.data.isPartialResponse;
                  })(e) || delete l.callbacks[n.id]))
              : "func" in e.data &&
                "string" == typeof e.data.func &&
                ((n = e.data), (0, r.callHandler)(n.func, n.args));
          }
          function p(e) {
            return e === s.parentWindow
              ? l.parentMessageQueue
              : e === s.childWindow
              ? l.childMessageQueue
              : [];
          }
          function g(e) {
            return e === s.parentWindow
              ? s.parentOrigin
              : e === s.childWindow
              ? s.childOrigin
              : null;
          }
          function h(e) {
            for (var t = g(e), n = p(e); e && t && 0 < n.length; )
              e.postMessage(n.shift(), t);
          }
          function f(e, t, n) {
            var o = s.childWindow;
            (t = (function (e, t, n) {
              return { id: e, args: t || [], isPartialResponse: n };
            })(e, t, n)),
              (n = g(o)),
              o && n && o.postMessage(t, n);
          }
          (t.initializeCommunication = function (e, t) {
            (l.messageListener = function (e) {
              return d(e);
            }),
              (s.currentWindow = s.currentWindow || window),
              (s.parentWindow =
                s.currentWindow.parent !== s.currentWindow.self
                  ? s.currentWindow.parent
                  : s.currentWindow.opener),
              (s.parentWindow || t) &&
                s.currentWindow.addEventListener(
                  "message",
                  l.messageListener,
                  !1
                ),
              s.parentWindow ||
                ((a.GlobalVars.isFramelessWindow = !0),
                (window.onNativeMessage = u));
            try {
              (s.parentOrigin = "*"), c("initialize", [i.version], e);
            } finally {
              s.parentOrigin = null;
            }
          }),
            (t.uninitializeCommunication = function () {
              s.currentWindow.removeEventListener(
                "message",
                l.messageListener,
                !1
              ),
                (s.parentWindow = null),
                (s.parentOrigin = null),
                (s.childWindow = null),
                (s.childOrigin = null),
                (l.parentMessageQueue = []),
                (l.childMessageQueue = []),
                (l.nextMessageId = 0),
                (l.callbacks = {});
            }),
            (t.sendMessageToParent = c),
            (t.waitForMessageQueue = function (e, t) {
              var n = s.currentWindow.setInterval(function () {
                0 === p(e).length && (clearInterval(n), t());
              }, 100);
            }),
            (t.sendMessageEventToChild = function (e, t) {
              var n = s.childWindow;
              (e = (function (e, t) {
                return { func: e, args: t || [] };
              })(e, t)),
                (t = g(n)),
                n && t ? n.postMessage(e, t) : p(n).push(e);
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.processAdditionalValidOrigins =
              t.isApiSupportedOnMobile =
              t.isHostClientMobile =
              t.isAPISupportedByPlatform =
              t.ensureInitialized =
                void 0);
          var o = n(2),
            i = n(6),
            a = n(4),
            r = n(7),
            s = n(5);
          function l(e) {
            return (
              void 0 === e && (e = a.defaultSDKVersionForCompatCheck),
              (e = (0, s.compareSDKVersions)(
                r.GlobalVars.clientSupportedSDKVersion,
                e
              )),
              !isNaN(e) && 0 <= e
            );
          }
          function c() {
            return (
              r.GlobalVars.hostClientType == o.HostClientType.android ||
              r.GlobalVars.hostClientType == o.HostClientType.ios
            );
          }
          (t.ensureInitialized = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            if (!r.GlobalVars.initializeCalled)
              throw new Error("The library has not yet been initialized");
            if (r.GlobalVars.frameContext && e && 0 < e.length) {
              for (var n = !1, o = 0; o < e.length; o++)
                if (e[o] === r.GlobalVars.frameContext) {
                  n = !0;
                  break;
                }
              if (!n)
                throw new Error(
                  "This call is not allowed in the '" +
                    r.GlobalVars.frameContext +
                    "' context"
                );
            }
          }),
            (t.isAPISupportedByPlatform = l),
            (t.isHostClientMobile = c),
            (t.isApiSupportedOnMobile = function (e) {
              return (
                void 0 === e && (e = a.defaultSDKVersionForCompatCheck),
                c()
                  ? l(e)
                    ? null
                    : { errorCode: i.ErrorCode.OLD_PLATFORM }
                  : { errorCode: i.ErrorCode.NOT_SUPPORTED_ON_PLATFORM }
              );
            }),
            (t.processAdditionalValidOrigins = function (e) {
              e = r.GlobalVars.additionalValidOrigins.concat(
                e.filter(function (e) {
                  return (
                    "string" == typeof e &&
                    a.userOriginUrlValidationRegExp.test(e)
                  );
                })
              );
              var t = {};
              (e = e.filter(function (e) {
                return !t[e] && (t[e] = !0);
              })),
                (r.GlobalVars.additionalValidOrigins = e),
                0 < r.GlobalVars.additionalValidOrigins.length
                  ? (r.GlobalVars.additionalValidOriginsRegexp = (0,
                    s.generateRegExpFromUrls)(
                      r.GlobalVars.additionalValidOrigins
                    ))
                  : (r.GlobalVars.additionalValidOriginsRegexp = null);
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.ChannelType =
              t.TaskModuleDimension =
              t.UserTeamRole =
              t.TeamType =
              t.FrameContexts =
              t.HostClientType =
                void 0),
            (function (e) {
              (e.desktop = "desktop"),
                (e.web = "web"),
                (e.android = "android"),
                (e.ios = "ios"),
                (e.ipados = "ipados"),
                (e.rigel = "rigel"),
                (e.surfaceHub = "surfaceHub"),
                (e.teamsRoomsWindows = "teamsRoomsWindows"),
                (e.teamsRoomsAndroid = "teamsRoomsAndroid"),
                (e.teamsPhones = "teamsPhones"),
                (e.teamsDisplays = "teamsDisplays");
            })(t.HostClientType || (t.HostClientType = {})),
            (function (e) {
              (e.settings = "settings"),
                (e.content = "content"),
                (e.authentication = "authentication"),
                (e.remove = "remove"),
                (e.task = "task"),
                (e.sidePanel = "sidePanel"),
                (e.stage = "stage"),
                (e.meetingStage = "meetingStage");
            })(t.FrameContexts || (t.FrameContexts = {})),
            (function (e) {
              (e[(e.Standard = 0)] = "Standard"),
                (e[(e.Edu = 1)] = "Edu"),
                (e[(e.Class = 2)] = "Class"),
                (e[(e.Plc = 3)] = "Plc"),
                (e[(e.Staff = 4)] = "Staff");
            })(t.TeamType || (t.TeamType = {})),
            (function (e) {
              (e[(e.Admin = 0)] = "Admin"),
                (e[(e.User = 1)] = "User"),
                (e[(e.Guest = 2)] = "Guest");
            })(t.UserTeamRole || (t.UserTeamRole = {})),
            (function (e) {
              (e.Large = "large"), (e.Medium = "medium"), (e.Small = "small");
            })(t.TaskModuleDimension || (t.TaskModuleDimension = {})),
            (function (e) {
              (e.Regular = "Regular"),
                (e.Private = "Private"),
                (e.Shared = "Shared");
            })(t.ChannelType || (t.ChannelType = {}));
        },
        function (e, t, n) {
          "use strict";
          var o =
            (this && this.__spreadArray) ||
            function (e, t, n) {
              if (n || 2 === arguments.length)
                for (var o, i = 0, a = t.length; i < a; i++)
                  (!o && i in t) ||
                    ((o = o || Array.prototype.slice.call(t, 0, i))[i] = t[i]);
              return e.concat(o || Array.prototype.slice.call(t));
            };
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.registerBeforeUnloadHandler =
              t.registerOnLoadHandler =
              t.registerFocusEnterHandler =
              t.registerBackButtonHandler =
              t.handleThemeChange =
              t.registerOnThemeChangeHandler =
              t.removeHandler =
              t.registerHandler =
              t.callHandler =
              t.initializeHandlers =
                void 0);
          var i = n(8),
            a = n(0),
            r = (function () {
              function e() {}
              return (e.handlers = {}), e;
            })();
          function s(e) {
            r.themeChangeHandler && r.themeChangeHandler(e),
              a.Communication.childWindow &&
                (0, a.sendMessageEventToChild)("themeChange", [e]);
          }
          function l() {
            (r.backButtonPressHandler && r.backButtonPressHandler()) ||
              (0, i.navigateBack)();
          }
          function c(e) {
            r.focusEnterHandler && r.focusEnterHandler(e);
          }
          function d(e) {
            r.loadHandler && r.loadHandler(e),
              a.Communication.childWindow &&
                (0, a.sendMessageEventToChild)("load", [e]);
          }
          function u() {
            function e() {
              (0, a.sendMessageToParent)("readyToUnload", []);
            }
            (r.beforeUnloadHandler && r.beforeUnloadHandler(e)) || e();
          }
          (t.initializeHandlers = function () {
            (r.handlers.themeChange = s),
              (r.handlers.backButtonPress = l),
              (r.handlers.load = d),
              (r.handlers.beforeUnload = u),
              (r.handlers.focusEnter = c);
          }),
            (t.callHandler = function (e, t) {
              return (e = r.handlers[e])
                ? [!0, e.apply(this, t)]
                : [!1, void 0];
            }),
            (t.registerHandler = function (e, t, n, i) {
              void 0 === n && (n = !0),
                void 0 === i && (i = []),
                t
                  ? ((r.handlers[e] = t),
                    n &&
                      (0, a.sendMessageToParent)(
                        "registerHandler",
                        o([e], i, !0)
                      ))
                  : delete r.handlers[e];
            }),
            (t.removeHandler = function (e) {
              delete r.handlers[e];
            }),
            (t.registerOnThemeChangeHandler = function (e) {
              (r.themeChangeHandler = e) &&
                (0, a.sendMessageToParent)("registerHandler", ["themeChange"]);
            }),
            (t.handleThemeChange = s),
            (t.registerBackButtonHandler = function (e) {
              (r.backButtonPressHandler = e) &&
                (0, a.sendMessageToParent)("registerHandler", ["backButton"]);
            }),
            (t.registerFocusEnterHandler = function (e) {
              (r.focusEnterHandler = e) &&
                (0, a.sendMessageToParent)("registerHandler", ["focusEnter"]);
            }),
            (t.registerOnLoadHandler = function (e) {
              (r.loadHandler = e) &&
                (0, a.sendMessageToParent)("registerHandler", ["load"]);
            }),
            (t.registerBeforeUnloadHandler = function (e) {
              (r.beforeUnloadHandler = e) &&
                (0, a.sendMessageToParent)("registerHandler", ["beforeUnload"]);
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.userOriginUrlValidationRegExp =
              t.validOriginRegExp =
              t.validOrigins =
              t.scanBarCodeAPIMobileSupportVersion =
              t.getMediaCallbackSupportVersion =
              t.mediaAPISupportVersion =
              t.captureImageMobileSupportVersion =
              t.peoplePickerRequiredVersion =
              t.locationAPIsRequiredVersion =
              t.getUserJoinedTeamsSupportedAndroidClientVersion =
              t.imageOutputFormatsAPISupportVersion =
              t.nonFullScreenVideoModeAPISupportVersion =
              t.videoAndImageMediaAPISupportVersion =
              t.defaultSDKVersionForCompatCheck =
              t.version =
                void 0),
            (n = n(5)),
            (t.version = "1.13.1"),
            (t.defaultSDKVersionForCompatCheck = "2.0.1"),
            (t.videoAndImageMediaAPISupportVersion = "2.0.2"),
            (t.nonFullScreenVideoModeAPISupportVersion = "2.0.3"),
            (t.imageOutputFormatsAPISupportVersion = "2.0.4"),
            (t.getUserJoinedTeamsSupportedAndroidClientVersion = "2.0.1"),
            (t.locationAPIsRequiredVersion = "1.9.0"),
            (t.peoplePickerRequiredVersion = "2.0.0"),
            (t.captureImageMobileSupportVersion = "1.7.0"),
            (t.mediaAPISupportVersion = "1.8.0"),
            (t.getMediaCallbackSupportVersion = "2.0.0"),
            (t.scanBarCodeAPIMobileSupportVersion = "1.9.0"),
            (t.validOrigins = [
              "https://teams.microsoft.com",
              "https://teams.microsoft.us",
              "https://gov.teams.microsoft.us",
              "https://dod.teams.microsoft.us",
              "https://int.teams.microsoft.com",
              "https://teams.live.com",
              "https://devspaces.skype.com",
              "https://ssauth.skype.com",
              "https://local.teams.live.com",
              "https://local.teams.live.com:8080",
              "https://local.teams.office.com",
              "https://local.teams.office.com:8080",
              "https://outlook.office.com",
              "https://outlook-sdf.office.com",
              "https://*.teams.microsoft.com",
              "https://www.office.com",
              "https://word.office.com",
              "https://excel.office.com",
              "https://powerpoint.office.com",
              "https://www.officeppe.com",
              "https://*.www.office.com",
            ]),
            (t.validOriginRegExp = (0, n.generateRegExpFromUrls)(
              t.validOrigins
            )),
            (t.userOriginUrlValidationRegExp = /^https\:\/\//);
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.generateGUID =
              t.compareSDKVersions =
              t.getGenericOnCompleteHandler =
              t.generateRegExpFromUrls =
                void 0);
          var o = n(22);
          function i(e) {
            for (var t = "^", n = e.split("."), o = 0; o < n.length; o++)
              t += (0 < o ? "[.]" : "") + n[o].replace("*", "[^/^.]+");
            return t + "$";
          }
          (t.generateRegExpFromUrls = function (e) {
            for (var t = "", n = 0; n < e.length; n++)
              t += (0 === n ? "" : "|") + i(e[n]);
            return new RegExp(t);
          }),
            (t.getGenericOnCompleteHandler = function (e) {
              return function (t, n) {
                if (!t) throw new Error(e || n);
              };
            }),
            (t.compareSDKVersions = function (e, t) {
              if ("string" != typeof e || "string" != typeof t) return NaN;
              var n = e.split("."),
                o = t.split(".");
              function i(e) {
                return /^\d+$/.test(e);
              }
              if (!n.every(i) || !o.every(i)) return NaN;
              for (; n.length < o.length; ) n.push("0");
              for (; o.length < n.length; ) o.push("0");
              for (var a = 0; a < n.length; ++a)
                if (Number(n[a]) != Number(o[a]))
                  return Number(n[a]) > Number(o[a]) ? 1 : -1;
              return 0;
            }),
            (t.generateGUID = function () {
              return o.v4();
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.ErrorCode = t.FileOpenPreference = void 0),
            (function (e) {
              (e.Inline = "inline"), (e.Desktop = "desktop"), (e.Web = "web");
            })(t.FileOpenPreference || (t.FileOpenPreference = {})),
            (function (e) {
              (e[(e.NOT_SUPPORTED_ON_PLATFORM = 100)] =
                "NOT_SUPPORTED_ON_PLATFORM"),
                (e[(e.INTERNAL_ERROR = 500)] = "INTERNAL_ERROR"),
                (e[(e.NOT_SUPPORTED_IN_CURRENT_CONTEXT = 501)] =
                  "NOT_SUPPORTED_IN_CURRENT_CONTEXT"),
                (e[(e.PERMISSION_DENIED = 1e3)] = "PERMISSION_DENIED"),
                (e[(e.NETWORK_ERROR = 2e3)] = "NETWORK_ERROR"),
                (e[(e.NO_HW_SUPPORT = 3e3)] = "NO_HW_SUPPORT"),
                (e[(e.INVALID_ARGUMENTS = 4e3)] = "INVALID_ARGUMENTS"),
                (e[(e.UNAUTHORIZED_USER_OPERATION = 5e3)] =
                  "UNAUTHORIZED_USER_OPERATION"),
                (e[(e.INSUFFICIENT_RESOURCES = 6e3)] =
                  "INSUFFICIENT_RESOURCES"),
                (e[(e.THROTTLE = 7e3)] = "THROTTLE"),
                (e[(e.USER_ABORT = 8e3)] = "USER_ABORT"),
                (e[(e.OPERATION_TIMED_OUT = 8001)] = "OPERATION_TIMED_OUT"),
                (e[(e.OLD_PLATFORM = 9e3)] = "OLD_PLATFORM"),
                (e[(e.FILE_NOT_FOUND = 404)] = "FILE_NOT_FOUND"),
                (e[(e.SIZE_EXCEEDED = 1e4)] = "SIZE_EXCEEDED");
            })(t.ErrorCode || (t.ErrorCode = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.GlobalVars = void 0);
          var o = (function () {
            function e() {}
            return (
              (e.initializeCalled = !1),
              (e.initializeCompleted = !1),
              (e.additionalValidOrigins = []),
              (e.additionalValidOriginsRegexp = null),
              (e.initializeCallbacks = []),
              (e.isFramelessWindow = !1),
              (e.printCapabilityEnabled = !1),
              e
            );
          })();
          t.GlobalVars = o;
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.stageView =
              t.sharing =
              t.video =
              t.people =
              t.monetization =
              t.meeting =
              t.location =
              t.media =
              t.menus =
              t.ParentAppWindow =
              t.ChildAppWindow =
              t.tasks =
              t.settings =
              t.navigateToTab =
              t.navigateCrossDomain =
              t.navigateBack =
              t.returnFocus =
              t.shareDeepLink =
              t.setFrameContext =
              t.registerAppButtonHoverLeaveHandler =
              t.registerAppButtonHoverEnterHandler =
              t.registerAppButtonClickHandler =
              t.registerOnThemeChangeHandler =
              t.registerOnLoadHandler =
              t.registerFullScreenHandler =
              t.registerChangeSettingsHandler =
              t.registerFocusEnterHandler =
              t.registerBeforeUnloadHandler =
              t.registerBackButtonHandler =
              t.print =
              t.initializeWithFrameContext =
              t.initialize =
              t.getTabInstances =
              t.getMruTabInstances =
              t.getContext =
              t.executeDeepLink =
              t.enablePrintCapability =
              t.FileOpenPreference =
              t.ErrorCode =
              t.ChannelType =
              t.UserTeamRole =
              t.TeamType =
              t.TaskModuleDimension =
              t.HostClientType =
              t.FrameContexts =
              t.authentication =
              t.appInitialization =
                void 0);
          var o = n(25);
          Object.defineProperty(t, "appInitialization", {
            enumerable: !0,
            get: function () {
              return o.appInitialization;
            },
          });
          var i = n(11);
          Object.defineProperty(t, "authentication", {
            enumerable: !0,
            get: function () {
              return i.authentication;
            },
          });
          var a = n(2);
          Object.defineProperty(t, "FrameContexts", {
            enumerable: !0,
            get: function () {
              return a.FrameContexts;
            },
          }),
            Object.defineProperty(t, "HostClientType", {
              enumerable: !0,
              get: function () {
                return a.HostClientType;
              },
            }),
            Object.defineProperty(t, "TaskModuleDimension", {
              enumerable: !0,
              get: function () {
                return a.TaskModuleDimension;
              },
            }),
            Object.defineProperty(t, "TeamType", {
              enumerable: !0,
              get: function () {
                return a.TeamType;
              },
            }),
            Object.defineProperty(t, "UserTeamRole", {
              enumerable: !0,
              get: function () {
                return a.UserTeamRole;
              },
            }),
            Object.defineProperty(t, "ChannelType", {
              enumerable: !0,
              get: function () {
                return a.ChannelType;
              },
            });
          var r = n(6);
          Object.defineProperty(t, "ErrorCode", {
            enumerable: !0,
            get: function () {
              return r.ErrorCode;
            },
          }),
            Object.defineProperty(t, "FileOpenPreference", {
              enumerable: !0,
              get: function () {
                return r.FileOpenPreference;
              },
            });
          var s = n(26);
          Object.defineProperty(t, "enablePrintCapability", {
            enumerable: !0,
            get: function () {
              return s.enablePrintCapability;
            },
          }),
            Object.defineProperty(t, "executeDeepLink", {
              enumerable: !0,
              get: function () {
                return s.executeDeepLink;
              },
            }),
            Object.defineProperty(t, "getContext", {
              enumerable: !0,
              get: function () {
                return s.getContext;
              },
            }),
            Object.defineProperty(t, "getMruTabInstances", {
              enumerable: !0,
              get: function () {
                return s.getMruTabInstances;
              },
            }),
            Object.defineProperty(t, "getTabInstances", {
              enumerable: !0,
              get: function () {
                return s.getTabInstances;
              },
            }),
            Object.defineProperty(t, "initialize", {
              enumerable: !0,
              get: function () {
                return s.initialize;
              },
            }),
            Object.defineProperty(t, "initializeWithFrameContext", {
              enumerable: !0,
              get: function () {
                return s.initializeWithFrameContext;
              },
            }),
            Object.defineProperty(t, "print", {
              enumerable: !0,
              get: function () {
                return s.print;
              },
            }),
            Object.defineProperty(t, "registerBackButtonHandler", {
              enumerable: !0,
              get: function () {
                return s.registerBackButtonHandler;
              },
            }),
            Object.defineProperty(t, "registerBeforeUnloadHandler", {
              enumerable: !0,
              get: function () {
                return s.registerBeforeUnloadHandler;
              },
            }),
            Object.defineProperty(t, "registerFocusEnterHandler", {
              enumerable: !0,
              get: function () {
                return s.registerFocusEnterHandler;
              },
            }),
            Object.defineProperty(t, "registerChangeSettingsHandler", {
              enumerable: !0,
              get: function () {
                return s.registerChangeSettingsHandler;
              },
            }),
            Object.defineProperty(t, "registerFullScreenHandler", {
              enumerable: !0,
              get: function () {
                return s.registerFullScreenHandler;
              },
            }),
            Object.defineProperty(t, "registerOnLoadHandler", {
              enumerable: !0,
              get: function () {
                return s.registerOnLoadHandler;
              },
            }),
            Object.defineProperty(t, "registerOnThemeChangeHandler", {
              enumerable: !0,
              get: function () {
                return s.registerOnThemeChangeHandler;
              },
            }),
            Object.defineProperty(t, "registerAppButtonClickHandler", {
              enumerable: !0,
              get: function () {
                return s.registerAppButtonClickHandler;
              },
            }),
            Object.defineProperty(t, "registerAppButtonHoverEnterHandler", {
              enumerable: !0,
              get: function () {
                return s.registerAppButtonHoverEnterHandler;
              },
            }),
            Object.defineProperty(t, "registerAppButtonHoverLeaveHandler", {
              enumerable: !0,
              get: function () {
                return s.registerAppButtonHoverLeaveHandler;
              },
            }),
            Object.defineProperty(t, "setFrameContext", {
              enumerable: !0,
              get: function () {
                return s.setFrameContext;
              },
            }),
            Object.defineProperty(t, "shareDeepLink", {
              enumerable: !0,
              get: function () {
                return s.shareDeepLink;
              },
            });
          var l = n(27);
          Object.defineProperty(t, "returnFocus", {
            enumerable: !0,
            get: function () {
              return l.returnFocus;
            },
          }),
            Object.defineProperty(t, "navigateBack", {
              enumerable: !0,
              get: function () {
                return l.navigateBack;
              },
            }),
            Object.defineProperty(t, "navigateCrossDomain", {
              enumerable: !0,
              get: function () {
                return l.navigateCrossDomain;
              },
            }),
            Object.defineProperty(t, "navigateToTab", {
              enumerable: !0,
              get: function () {
                return l.navigateToTab;
              },
            });
          var c = n(12);
          Object.defineProperty(t, "settings", {
            enumerable: !0,
            get: function () {
              return c.settings;
            },
          });
          var d = n(28);
          Object.defineProperty(t, "tasks", {
            enumerable: !0,
            get: function () {
              return d.tasks;
            },
          });
          var u = n(16);
          Object.defineProperty(t, "ChildAppWindow", {
            enumerable: !0,
            get: function () {
              return u.ChildAppWindow;
            },
          }),
            Object.defineProperty(t, "ParentAppWindow", {
              enumerable: !0,
              get: function () {
                return u.ParentAppWindow;
              },
            });
          var p = n(15);
          Object.defineProperty(t, "menus", {
            enumerable: !0,
            get: function () {
              return p.menus;
            },
          });
          var g = n(17);
          Object.defineProperty(t, "media", {
            enumerable: !0,
            get: function () {
              return g.media;
            },
          });
          var h = n(29);
          Object.defineProperty(t, "location", {
            enumerable: !0,
            get: function () {
              return h.location;
            },
          });
          var f = n(30);
          Object.defineProperty(t, "meeting", {
            enumerable: !0,
            get: function () {
              return f.meeting;
            },
          });
          var m = n(31);
          Object.defineProperty(t, "monetization", {
            enumerable: !0,
            get: function () {
              return m.monetization;
            },
          });
          var y = n(32);
          Object.defineProperty(t, "people", {
            enumerable: !0,
            get: function () {
              return y.people;
            },
          });
          var v = n(33);
          Object.defineProperty(t, "video", {
            enumerable: !0,
            get: function () {
              return v.video;
            },
          });
          var _ = n(34);
          Object.defineProperty(t, "sharing", {
            enumerable: !0,
            get: function () {
              return _.sharing;
            },
          });
          var b = n(35);
          Object.defineProperty(t, "stageView", {
            enumerable: !0,
            get: function () {
              return b.stageView;
            },
          });
        },
        function (e, t) {
          var n,
            o,
            i =
              ("undefined" != typeof crypto &&
                crypto.getRandomValues &&
                crypto.getRandomValues.bind(crypto)) ||
              ("undefined" != typeof msCrypto &&
                "function" == typeof window.msCrypto.getRandomValues &&
                msCrypto.getRandomValues.bind(msCrypto));
          i
            ? ((n = new Uint8Array(16)),
              (e.exports = function () {
                return i(n), n;
              }))
            : ((o = new Array(16)),
              (e.exports = function () {
                for (var e, t = 0; t < 16; t++)
                  0 == (3 & t) && (e = 4294967296 * Math.random()),
                    (o[t] = (e >>> ((3 & t) << 3)) & 255);
                return o;
              }));
        },
        function (e, t) {
          for (var n = [], o = 0; o < 256; ++o)
            n[o] = (o + 256).toString(16).substr(1);
          e.exports = function (e, t) {
            var o = t || 0;
            return [
              (t = n)[e[o++]],
              t[e[o++]],
              t[e[o++]],
              t[e[o++]],
              "-",
              t[e[o++]],
              t[e[o++]],
              "-",
              t[e[o++]],
              t[e[o++]],
              "-",
              t[e[o++]],
              t[e[o++]],
              "-",
              t[e[o++]],
              t[e[o++]],
              t[e[o++]],
              t[e[o++]],
              t[e[o++]],
              t[e[+o]],
            ].join("");
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.authentication = void 0);
          var o = n(1),
            i = n(7),
            a = n(2),
            r = n(0),
            s = n(3);
          !(function (e) {
            var t, n;
            function l() {
              c();
              try {
                r.Communication.childWindow &&
                  r.Communication.childWindow.close();
              } finally {
                (r.Communication.childWindow = null),
                  (r.Communication.childOrigin = null);
              }
            }
            function c() {
              n && (clearInterval(n), (n = 0)),
                (0, s.removeHandler)("initialize"),
                (0, s.removeHandler)("navigateCrossDomain");
            }
            function d() {
              c(),
                (n = r.Communication.currentWindow.setInterval(function () {
                  if (
                    !r.Communication.childWindow ||
                    r.Communication.childWindow.closed
                  )
                    p("CancelledByUser");
                  else {
                    var e = r.Communication.childOrigin;
                    try {
                      (r.Communication.childOrigin = "*"),
                        (0, r.sendMessageEventToChild)("ping");
                    } finally {
                      r.Communication.childOrigin = e;
                    }
                  }
                }, 100)),
                (0, s.registerHandler)("initialize", function () {
                  return [
                    a.FrameContexts.authentication,
                    i.GlobalVars.hostClientType,
                  ];
                }),
                (0, s.registerHandler)("navigateCrossDomain", function () {
                  return !1;
                });
            }
            function u(e) {
              try {
                t && t.successCallback && t.successCallback(e);
              } finally {
                (t = null), l();
              }
            }
            function p(e) {
              try {
                t && t.failureCallback && t.failureCallback(e);
              } finally {
                (t = null), l();
              }
            }
            function g(e, t, n) {
              var o;
              e &&
                (((o = document.createElement("a")).href =
                  decodeURIComponent(e)),
                o.host &&
                  o.host !== window.location.host &&
                  "outlook.office.com" === o.host &&
                  -1 < o.search.indexOf("client_type=Win32_Outlook") &&
                  (t &&
                    "result" === t &&
                    (n && (o.href = h(o.href, "result", n)),
                    r.Communication.currentWindow.location.assign(
                      h(o.href, "authSuccess", "")
                    )),
                  t &&
                    "reason" === t &&
                    (n && (o.href = h(o.href, "reason", n)),
                    r.Communication.currentWindow.location.assign(
                      h(o.href, "authFailure", "")
                    ))));
            }
            function h(e, t, n) {
              var o = e.indexOf("#"),
                i =
                  (i = -1 === o ? "#" : e.substr(o)) +
                  "&" +
                  t +
                  ("" !== n ? "=" + n : "");
              return (e = -1 === o ? e : e.substr(0, o)) + i;
            }
            (e.initialize = function () {
              (0, s.registerHandler)(
                "authentication.authenticate.success",
                u,
                !1
              ),
                (0, s.registerHandler)(
                  "authentication.authenticate.failure",
                  p,
                  !1
                );
            }),
              (e.registerAuthenticationHandlers = function (e) {
                t = e;
              }),
              (e.authenticate = function (e) {
                var n = void 0 !== e ? e : t;
                (0, o.ensureInitialized)(
                  a.FrameContexts.content,
                  a.FrameContexts.sidePanel,
                  a.FrameContexts.settings,
                  a.FrameContexts.remove,
                  a.FrameContexts.task,
                  a.FrameContexts.stage,
                  a.FrameContexts.meetingStage
                ),
                  i.GlobalVars.hostClientType === a.HostClientType.desktop ||
                  i.GlobalVars.hostClientType === a.HostClientType.android ||
                  i.GlobalVars.hostClientType === a.HostClientType.ios ||
                  i.GlobalVars.hostClientType === a.HostClientType.rigel ||
                  i.GlobalVars.hostClientType ===
                    a.HostClientType.teamsRoomsWindows ||
                  i.GlobalVars.hostClientType ===
                    a.HostClientType.teamsRoomsAndroid ||
                  i.GlobalVars.hostClientType ===
                    a.HostClientType.teamsPhones ||
                  i.GlobalVars.hostClientType === a.HostClientType.teamsDisplays
                    ? (((e = document.createElement("a")).href = n.url),
                      (0, r.sendMessageToParent)(
                        "authentication.authenticate",
                        [e.href, n.width, n.height, n.isExternal],
                        function (e, t) {
                          e ? n.successCallback(t) : n.failureCallback(t);
                        }
                      ))
                    : (function (e) {
                        (t = e), l();
                        var n = t.width || 600,
                          o = t.height || 400,
                          i =
                            ((n = Math.min(
                              n,
                              r.Communication.currentWindow.outerWidth - 400
                            )),
                            (o = Math.min(
                              o,
                              r.Communication.currentWindow.outerHeight - 200
                            )),
                            document.createElement("a"));
                        i.href = t.url.replace("{oauthRedirectMethod}", "web");
                        var a =
                          void 0 !== r.Communication.currentWindow.screenLeft
                            ? r.Communication.currentWindow.screenLeft
                            : r.Communication.currentWindow.screenX;
                        (e =
                          void 0 !== r.Communication.currentWindow.screenTop
                            ? r.Communication.currentWindow.screenTop
                            : r.Communication.currentWindow.screenY),
                          (a +=
                            r.Communication.currentWindow.outerWidth / 2 -
                            n / 2),
                          (e +=
                            r.Communication.currentWindow.outerHeight / 2 -
                            o / 2),
                          (r.Communication.childWindow =
                            r.Communication.currentWindow.open(
                              i.href,
                              "_blank",
                              "toolbar=no, location=yes, status=no, menubar=no, scrollbars=yes, top=" +
                                e +
                                ", left=" +
                                a +
                                ", width=" +
                                n +
                                ", height=" +
                                o
                            )),
                          r.Communication.childWindow
                            ? d()
                            : p("FailedToOpenWindow");
                      })(n);
              }),
              (e.getAuthToken = function (e) {
                (0, o.ensureInitialized)(),
                  (0, r.sendMessageToParent)(
                    "authentication.getAuthToken",
                    [e.resources, e.claims, e.silent],
                    function (t, n) {
                      t ? e.successCallback(n) : e.failureCallback(n);
                    }
                  );
              }),
              (e.getUser = function (e) {
                (0, o.ensureInitialized)(),
                  (0, r.sendMessageToParent)(
                    "authentication.getUser",
                    function (t, n) {
                      t ? e.successCallback(n) : e.failureCallback(n);
                    }
                  );
              }),
              (e.notifySuccess = function (e, t) {
                g(t, "result", e),
                  (0, o.ensureInitialized)(a.FrameContexts.authentication),
                  (0, r.sendMessageToParent)(
                    "authentication.authenticate.success",
                    [e]
                  ),
                  (0, r.waitForMessageQueue)(
                    r.Communication.parentWindow,
                    function () {
                      return setTimeout(function () {
                        return r.Communication.currentWindow.close();
                      }, 200);
                    }
                  );
              }),
              (e.notifyFailure = function (e, t) {
                g(t, "reason", e),
                  (0, o.ensureInitialized)(a.FrameContexts.authentication),
                  (0, r.sendMessageToParent)(
                    "authentication.authenticate.failure",
                    [e]
                  ),
                  (0, r.waitForMessageQueue)(
                    r.Communication.parentWindow,
                    function () {
                      return setTimeout(function () {
                        return r.Communication.currentWindow.close();
                      }, 200);
                    }
                  );
              });
          })(t.authentication || (t.authentication = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.settings = void 0);
          var o = n(1),
            i = n(2),
            a = n(5),
            r = n(0),
            s = n(3);
          !(function (e) {
            var t, n;
            function l(e) {
              (e = new c(e)), t ? t(e) : e.notifySuccess();
            }
            (e.initialize = function () {
              (0, s.registerHandler)("settings.save", l, !1),
                (0, s.registerHandler)("settings.remove", d, !1);
            }),
              (e.setValidityState = function (e) {
                (0, o.ensureInitialized)(
                  i.FrameContexts.settings,
                  i.FrameContexts.remove
                ),
                  (0, r.sendMessageToParent)("settings.setValidityState", [e]);
              }),
              (e.getSettings = function (e) {
                (0, o.ensureInitialized)(
                  i.FrameContexts.content,
                  i.FrameContexts.settings,
                  i.FrameContexts.remove,
                  i.FrameContexts.sidePanel
                ),
                  (0, r.sendMessageToParent)("settings.getSettings", e);
              }),
              (e.setSettings = function (e, t) {
                (0, o.ensureInitialized)(
                  i.FrameContexts.content,
                  i.FrameContexts.settings,
                  i.FrameContexts.sidePanel
                ),
                  (0, r.sendMessageToParent)(
                    "settings.setSettings",
                    [e],
                    t || (0, a.getGenericOnCompleteHandler)()
                  );
              }),
              (e.registerOnSaveHandler = function (e) {
                (0, o.ensureInitialized)(i.FrameContexts.settings),
                  (t = e) &&
                    (0, r.sendMessageToParent)("registerHandler", ["save"]);
              }),
              (e.registerOnRemoveHandler = function (e) {
                (0, o.ensureInitialized)(
                  i.FrameContexts.remove,
                  i.FrameContexts.settings
                ),
                  (n = e) &&
                    (0, r.sendMessageToParent)("registerHandler", ["remove"]);
              });
            var c = (function () {
              function e(e) {
                (this.notified = !1), (this.result = e || {});
              }
              return (
                (e.prototype.notifySuccess = function () {
                  this.ensureNotNotified(),
                    (0, r.sendMessageToParent)("settings.save.success"),
                    (this.notified = !0);
                }),
                (e.prototype.notifyFailure = function (e) {
                  this.ensureNotNotified(),
                    (0, r.sendMessageToParent)("settings.save.failure", [e]),
                    (this.notified = !0);
                }),
                (e.prototype.ensureNotNotified = function () {
                  if (this.notified)
                    throw new Error(
                      "The SaveEvent may only notify success or failure once."
                    );
                }),
                e
              );
            })();
            function d() {
              var e = new u();
              n ? n(e) : e.notifySuccess();
            }
            var u = (function () {
              function e() {
                this.notified = !1;
              }
              return (
                (e.prototype.notifySuccess = function () {
                  this.ensureNotNotified(),
                    (0, r.sendMessageToParent)("settings.remove.success"),
                    (this.notified = !0);
                }),
                (e.prototype.notifyFailure = function (e) {
                  this.ensureNotNotified(),
                    (0, r.sendMessageToParent)("settings.remove.failure", [e]),
                    (this.notified = !0);
                }),
                (e.prototype.ensureNotNotified = function () {
                  if (this.notified)
                    throw new Error(
                      "The removeEvent may only notify success or failure once."
                    );
                }),
                e
              );
            })();
          })(t.settings || (t.settings = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.logs = void 0);
          var o = n(1),
            i = n(0),
            a = n(3);
          (t.logs || (t.logs = {})).registerGetLogHandler = function (e) {
            (0, o.ensureInitialized)(),
              e
                ? (0, a.registerHandler)("log.request", function () {
                    var t = e();
                    (0, i.sendMessageToParent)("log.receive", [t]);
                  })
                : (0, a.removeHandler)("log.request");
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.registerUserSettingsChangeHandler =
              t.getConfigSetting =
              t.getChatMembers =
              t.registerCustomHandler =
              t.sendCustomEvent =
              t.sendCustomMessage =
              t.uploadCustomApp =
              t.showNotification =
              t.openFilePreview =
              t.exitFullscreen =
              t.enterFullscreen =
              t.getUserJoinedTeams =
              t.initializePrivateApis =
                void 0);
          var o = n(1),
            i = n(2),
            a = n(5),
            r = n(0),
            s = n(3),
            l = n(7),
            c = n(6),
            d = n(4);
          (t.initializePrivateApis = function () {}),
            (t.getUserJoinedTeams = function (e, t) {
              if (
                ((0, o.ensureInitialized)(),
                (l.GlobalVars.hostClientType === i.HostClientType.android ||
                  l.GlobalVars.hostClientType ===
                    i.HostClientType.teamsRoomsAndroid ||
                  l.GlobalVars.hostClientType ===
                    i.HostClientType.teamsPhones ||
                  l.GlobalVars.hostClientType ===
                    i.HostClientType.teamsDisplays) &&
                  !(0, o.isAPISupportedByPlatform)(
                    d.getUserJoinedTeamsSupportedAndroidClientVersion
                  ))
              ) {
                var n = { errorCode: c.ErrorCode.OLD_PLATFORM };
                throw new Error(JSON.stringify(n));
              }
              (0, r.sendMessageToParent)("getUserJoinedTeams", [t], e);
            }),
            (t.enterFullscreen = function () {
              (0, o.ensureInitialized)(i.FrameContexts.content),
                (0, r.sendMessageToParent)("enterFullscreen", []);
            }),
            (t.exitFullscreen = function () {
              (0, o.ensureInitialized)(i.FrameContexts.content),
                (0, r.sendMessageToParent)("exitFullscreen", []);
            }),
            (t.openFilePreview = function (e) {
              (0, o.ensureInitialized)(
                i.FrameContexts.content,
                i.FrameContexts.task
              ),
                (e = [
                  e.entityId,
                  e.title,
                  e.description,
                  e.type,
                  e.objectUrl,
                  e.downloadUrl,
                  e.webPreviewUrl,
                  e.webEditUrl,
                  e.baseUrl,
                  e.editFile,
                  e.subEntityId,
                  e.viewerAction,
                  e.fileOpenPreference,
                  e.conversationId,
                ]),
                (0, r.sendMessageToParent)("openFilePreview", e);
            }),
            (t.showNotification = function (e) {
              (0, o.ensureInitialized)(i.FrameContexts.content),
                (e = [e.message, e.notificationType]),
                (0, r.sendMessageToParent)("showNotification", e);
            }),
            (t.uploadCustomApp = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, r.sendMessageToParent)(
                  "uploadCustomApp",
                  [e],
                  t || (0, a.getGenericOnCompleteHandler)()
                );
            }),
            (t.sendCustomMessage = function (e, t, n) {
              (0, o.ensureInitialized)(), (0, r.sendMessageToParent)(e, t, n);
            }),
            (t.sendCustomEvent = function (e, t) {
              if (((0, o.ensureInitialized)(), !r.Communication.childWindow))
                throw new Error(
                  "The child window has not yet been initialized or is not present"
                );
              (0, r.sendMessageEventToChild)(e, t);
            }),
            (t.registerCustomHandler = function (e, t) {
              var n = this;
              (0, o.ensureInitialized)(),
                (0, s.registerHandler)(e, function () {
                  for (var e = [], o = 0; o < arguments.length; o++)
                    e[o] = arguments[o];
                  return t.apply(n, e);
                });
            }),
            (t.getChatMembers = function (e) {
              (0, o.ensureInitialized)(),
                (0, r.sendMessageToParent)("getChatMembers", e);
            }),
            (t.getConfigSetting = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, r.sendMessageToParent)("getConfigSetting", [t], e);
            }),
            (t.registerUserSettingsChangeHandler = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, s.registerHandler)("userSettingsChange", t, !0, [e]);
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.menus = void 0);
          var o = n(1),
            i = n(0),
            a = n(3);
          !(function (e) {
            !(function (e) {
              (e[(e.ifRoom = 0)] = "ifRoom"),
                (e[(e.overflowOnly = 1)] = "overflowOnly");
            })(e.DisplayMode || (e.DisplayMode = {}));
            var t,
              n,
              r,
              s = function () {
                (this.enabled = !0), (this.selected = !1);
              };
            function l(e) {
              (r && r(e)) ||
                ((0, o.ensureInitialized)(),
                (0, i.sendMessageToParent)("viewConfigItemPress", [e]));
            }
            function c(e) {
              (t && t(e)) ||
                ((0, o.ensureInitialized)(),
                (0, i.sendMessageToParent)("handleNavBarMenuItemPress", [e]));
            }
            function d(e) {
              (n && n(e)) ||
                ((0, o.ensureInitialized)(),
                (0, i.sendMessageToParent)("handleActionMenuItemPress", [e]));
            }
            (e.MenuItem = s),
              (function (e) {
                (e.dropDown = "dropDown"), (e.popOver = "popOver");
              })(e.MenuListType || (e.MenuListType = {})),
              (e.initialize = function () {
                (0, a.registerHandler)("navBarMenuItemPress", c, !1),
                  (0, a.registerHandler)("actionMenuItemPress", d, !1),
                  (0, a.registerHandler)("setModuleView", l, !1);
              }),
              (e.setUpViews = function (e, t) {
                (0, o.ensureInitialized)(),
                  (r = t),
                  (0, i.sendMessageToParent)("setUpViews", [e]);
              }),
              (e.setNavBarMenu = function (e, n) {
                (0, o.ensureInitialized)(),
                  (t = n),
                  (0, i.sendMessageToParent)("setNavBarMenu", [e]);
              }),
              (e.showActionMenu = function (e, t) {
                (0, o.ensureInitialized)(),
                  (n = t),
                  (0, i.sendMessageToParent)("showActionMenu", [e]);
              });
          })(t.menus || (t.menus = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.ParentAppWindow = t.ChildAppWindow = void 0);
          var o = n(1),
            i = n(2),
            a = n(5),
            r = n(0),
            s = n(3);
          (n = (function () {
            function e() {}
            return (
              (e.prototype.postMessage = function (e, t) {
                (0, o.ensureInitialized)(),
                  (0, r.sendMessageToParent)(
                    "messageForChild",
                    [e],
                    t || (0, a.getGenericOnCompleteHandler)()
                  );
              }),
              (e.prototype.addEventListener = function (e, t) {
                "message" === e &&
                  (0, s.registerHandler)("messageForParent", t);
              }),
              e
            );
          })()),
            (t.ChildAppWindow = n),
            (n = (function () {
              function e() {}
              return (
                Object.defineProperty(e, "Instance", {
                  get: function () {
                    return this._instance || (this._instance = new this());
                  },
                  enumerable: !1,
                  configurable: !0,
                }),
                (e.prototype.postMessage = function (e, t) {
                  (0, o.ensureInitialized)(i.FrameContexts.task),
                    (0, r.sendMessageToParent)(
                      "messageForParent",
                      [e],
                      t || (0, a.getGenericOnCompleteHandler)()
                    );
                }),
                (e.prototype.addEventListener = function (e, t) {
                  "message" === e &&
                    (0, s.registerHandler)("messageForChild", t);
                }),
                e
              );
            })()),
            (t.ParentAppWindow = n);
        },
        function (e, t, n) {
          "use strict";
          var o,
            i =
              (this && this.__extends) ||
              ((o = function (e, t) {
                return (o =
                  Object.setPrototypeOf ||
                  ({ __proto__: [] } instanceof Array &&
                    function (e, t) {
                      e.__proto__ = t;
                    }) ||
                  function (e, t) {
                    for (var n in t)
                      Object.prototype.hasOwnProperty.call(t, n) &&
                        (e[n] = t[n]);
                  })(e, t);
              }),
              function (e, t) {
                if ("function" != typeof t && null !== t)
                  throw new TypeError(
                    "Class extends value " +
                      String(t) +
                      " is not a constructor or null"
                  );
                function n() {
                  this.constructor = e;
                }
                o(e, t),
                  (e.prototype =
                    null === t
                      ? Object.create(t)
                      : ((n.prototype = t.prototype), new n()));
              });
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.media = void 0);
          var a = n(7),
            r = n(6),
            s = n(1),
            l = n(2),
            c = n(5),
            d = n(18),
            u = n(0),
            p = n(3),
            g = n(4);
          !(function (e) {
            !(function (e) {
              (e.Base64 = "base64"), (e.ID = "id");
            })(e.FileFormat || (e.FileFormat = {}));
            var t = function () {};
            (e.File = t),
              (e.captureImage = function (e) {
                if (!e)
                  throw new Error("[captureImage] Callback cannot be null");
                (0, s.ensureInitialized)(
                  l.FrameContexts.content,
                  l.FrameContexts.task
                ),
                  a.GlobalVars.isFramelessWindow
                    ? (0, s.isAPISupportedByPlatform)(
                        g.captureImageMobileSupportVersion
                      )
                      ? (0, u.sendMessageToParent)("captureImage", e)
                      : e({ errorCode: r.ErrorCode.OLD_PLATFORM }, void 0)
                    : e(
                        { errorCode: r.ErrorCode.NOT_SUPPORTED_ON_PLATFORM },
                        void 0
                      );
              });
            var n,
              o,
              h = (function (e) {
                function t(t) {
                  void 0 === t && (t = null);
                  var n = e.call(this) || this;
                  return (
                    t &&
                      ((n.content = t.content),
                      (n.format = t.format),
                      (n.mimeType = t.mimeType),
                      (n.name = t.name),
                      (n.preview = t.preview),
                      (n.size = t.size)),
                    n
                  );
                }
                return (
                  i(t, e),
                  (t.prototype.getMedia = function (e) {
                    if (!e)
                      throw new Error("[get Media] Callback cannot be null");
                    (0, s.ensureInitialized)(
                      l.FrameContexts.content,
                      l.FrameContexts.task
                    ),
                      (0, s.isAPISupportedByPlatform)(g.mediaAPISupportVersion)
                        ? (0, d.validateGetMediaInputs)(
                            this.mimeType,
                            this.format,
                            this.content
                          )
                          ? (0, s.isAPISupportedByPlatform)(
                              g.getMediaCallbackSupportVersion
                            )
                            ? this.getMediaViaCallback(e)
                            : this.getMediaViaHandler(e)
                          : e(
                              { errorCode: r.ErrorCode.INVALID_ARGUMENTS },
                              null
                            )
                        : e({ errorCode: r.ErrorCode.OLD_PLATFORM }, null);
                  }),
                  (t.prototype.getMediaViaCallback = function (e) {
                    var t = {
                        mediaMimeType: this.mimeType,
                        assembleAttachment: [],
                      },
                      n = [this.content];
                    (0, u.sendMessageToParent)("getMedia", n, function (n) {
                      var o;
                      e &&
                        (n && n.error
                          ? e(n.error, null)
                          : n && n.mediaChunk
                          ? n.mediaChunk.chunkSequence <= 0
                            ? ((o = (0, d.createFile)(
                                t.assembleAttachment,
                                t.mediaMimeType
                              )),
                              e(n.error, o))
                            : ((n = (0, d.decodeAttachment)(
                                n.mediaChunk,
                                t.mediaMimeType
                              )),
                              t.assembleAttachment.push(n))
                          : e(
                              {
                                errorCode: r.ErrorCode.INTERNAL_ERROR,
                                message: "data received is null",
                              },
                              null
                            ));
                    });
                  }),
                  (t.prototype.getMediaViaHandler = function (e) {
                    var t = (0, c.generateGUID)(),
                      n = {
                        mediaMimeType: this.mimeType,
                        assembleAttachment: [],
                      },
                      o = [t, this.content];
                    this.content &&
                      e &&
                      (0, u.sendMessageToParent)("getMedia", o),
                      (0, p.registerHandler)("getMedia" + t, function (o) {
                        var i;
                        e &&
                          ((i = JSON.parse(o)).error
                            ? (e(i.error, null),
                              (0, p.removeHandler)("getMedia" + t))
                            : i.mediaChunk
                            ? i.mediaChunk.chunkSequence <= 0
                              ? ((o = (0, d.createFile)(
                                  n.assembleAttachment,
                                  n.mediaMimeType
                                )),
                                e(i.error, o),
                                (0, p.removeHandler)("getMedia" + t))
                              : ((i = (0, d.decodeAttachment)(
                                  i.mediaChunk,
                                  n.mediaMimeType
                                )),
                                n.assembleAttachment.push(i))
                            : (e(
                                {
                                  errorCode: r.ErrorCode.INTERNAL_ERROR,
                                  message: "data received is null",
                                },
                                null
                              ),
                              (0, p.removeHandler)("getMedia" + t)));
                      });
                  }),
                  t
                );
              })(t);
            (e.Media = h),
              (t = (function (e) {
                function t() {
                  return (null !== e && e.apply(this, arguments)) || this;
                }
                return (
                  i(t, e),
                  (t.prototype.getMediaType = function () {
                    return o.Video;
                  }),
                  (t.prototype.notifyEventToApp = function (e) {
                    if (this.controllerCallback)
                      switch (e) {
                        case n.StartRecording:
                          if (this.controllerCallback.onRecordingStarted) {
                            this.controllerCallback.onRecordingStarted();
                            break;
                          }
                      }
                  }),
                  t
                );
              })(
                (function () {
                  function e(e) {
                    this.controllerCallback = e;
                  }
                  return (
                    (e.prototype.notifyEventToHost = function (e, t) {
                      (0, s.ensureInitialized)(
                        l.FrameContexts.content,
                        l.FrameContexts.task
                      );
                      var n = (0, s.isApiSupportedOnMobile)(
                        g.nonFullScreenVideoModeAPISupportVersion
                      );
                      n
                        ? t && t(n)
                        : ((e = {
                            mediaType: this.getMediaType(),
                            mediaControllerEvent: e,
                          }),
                          (0, u.sendMessageToParent)(
                            "media.controller",
                            [e],
                            function (e) {
                              t && t(e);
                            }
                          ));
                    }),
                    (e.prototype.stop = function (e) {
                      this.notifyEventToHost(n.StopRecording, e);
                    }),
                    e
                  );
                })()
              )),
              (e.VideoController = t),
              (function (e) {
                (e[(e.StartRecording = 1)] = "StartRecording"),
                  (e[(e.StopRecording = 2)] = "StopRecording");
              })((n = n || {})),
              (function (e) {
                (e[(e.Photo = 1)] = "Photo"),
                  (e[(e.Document = 2)] = "Document"),
                  (e[(e.Whiteboard = 3)] = "Whiteboard"),
                  (e[(e.BusinessCard = 4)] = "BusinessCard");
              })(e.CameraStartMode || (e.CameraStartMode = {})),
              (function (e) {
                (e[(e.Camera = 1)] = "Camera"),
                  (e[(e.Gallery = 2)] = "Gallery");
              })(e.Source || (e.Source = {})),
              (function (e) {
                (e[(e.Image = 1)] = "Image"),
                  (e[(e.Video = 2)] = "Video"),
                  (e[(e.VideoAndImage = 3)] = "VideoAndImage"),
                  (e[(e.Audio = 4)] = "Audio");
              })((o = e.MediaType || (e.MediaType = {}))),
              (function (e) {
                (e[(e.ID = 1)] = "ID"), (e[(e.URL = 2)] = "URL");
              })(e.ImageUriType || (e.ImageUriType = {})),
              (function (e) {
                (e[(e.IMAGE = 1)] = "IMAGE"), (e[(e.PDF = 2)] = "PDF");
              })(e.ImageOutputFormats || (e.ImageOutputFormats = {})),
              (e.selectMedia = function (e, t) {
                if (!t)
                  throw new Error("[select Media] Callback cannot be null");
                var n, o;
                (0, s.ensureInitialized)(
                  l.FrameContexts.content,
                  l.FrameContexts.task
                ),
                  (0, s.isAPISupportedByPlatform)(g.mediaAPISupportVersion)
                    ? (n = (0, d.isMediaCallSupportedOnMobile)(e))
                      ? t(n, null)
                      : (0, d.validateSelectMediaInputs)(e)
                      ? (0, u.sendMessageToParent)(
                          "selectMedia",
                          [e],
                          function (n, o, i) {
                            if (i)
                              (0, d.isVideoControllerRegistered)(e) &&
                                e.videoProps.videoController.notifyEventToApp(
                                  i
                                );
                            else if (o) {
                              for (
                                var a = [], r = 0, s = o;
                                r < s.length;
                                r++
                              ) {
                                var l = s[r];
                                a.push(new h(l));
                              }
                              t(n, a);
                            } else t(n, null);
                          }
                        )
                      : ((o = { errorCode: r.ErrorCode.INVALID_ARGUMENTS }),
                        t(o, null))
                    : ((o = { errorCode: r.ErrorCode.OLD_PLATFORM }),
                      t(o, null));
              }),
              (e.viewImages = function (e, t) {
                if (!t)
                  throw new Error("[view images] Callback cannot be null");
                (0, s.ensureInitialized)(
                  l.FrameContexts.content,
                  l.FrameContexts.task
                ),
                  (0, s.isAPISupportedByPlatform)(g.mediaAPISupportVersion)
                    ? (0, d.validateViewImagesInput)(e)
                      ? (0, u.sendMessageToParent)("viewImages", [e], t)
                      : t({ errorCode: r.ErrorCode.INVALID_ARGUMENTS })
                    : t({ errorCode: r.ErrorCode.OLD_PLATFORM });
              }),
              (e.scanBarCode = function (e, t) {
                if (!e)
                  throw new Error(
                    "[media.scanBarCode] Callback cannot be null"
                  );
                (0, s.ensureInitialized)(
                  l.FrameContexts.content,
                  l.FrameContexts.task
                ),
                  a.GlobalVars.hostClientType !== l.HostClientType.desktop &&
                  a.GlobalVars.hostClientType !== l.HostClientType.web &&
                  a.GlobalVars.hostClientType !== l.HostClientType.rigel &&
                  a.GlobalVars.hostClientType !==
                    l.HostClientType.teamsRoomsWindows &&
                  a.GlobalVars.hostClientType !==
                    l.HostClientType.teamsRoomsAndroid &&
                  a.GlobalVars.hostClientType !==
                    l.HostClientType.teamsPhones &&
                  a.GlobalVars.hostClientType !== l.HostClientType.teamsDisplays
                    ? (0, s.isAPISupportedByPlatform)(
                        g.scanBarCodeAPIMobileSupportVersion
                      )
                      ? (0, d.validateScanBarCodeInput)(t)
                        ? (0, u.sendMessageToParent)(
                            "media.scanBarCode",
                            [t],
                            e
                          )
                        : e({ errorCode: r.ErrorCode.INVALID_ARGUMENTS }, null)
                      : e({ errorCode: r.ErrorCode.OLD_PLATFORM }, null)
                    : e(
                        { errorCode: r.ErrorCode.NOT_SUPPORTED_ON_PLATFORM },
                        null
                      );
              });
          })(t.media || (t.media = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.validatePeoplePickerInput =
              t.validateScanBarCodeInput =
              t.validateViewImagesInput =
              t.validateGetMediaInputs =
              t.isMediaCallForNonFullScreenVideoMode =
              t.isMediaCallForVideoAndImageInputs =
              t.isMediaCallForImageOutputFormats =
              t.validateSelectMediaInputs =
              t.isVideoControllerRegistered =
              t.isMediaCallSupportedOnMobile =
              t.decodeAttachment =
              t.createFile =
                void 0);
          var o = n(17),
            i = n(4),
            a = n(1);
          function r(e) {
            var t;
            return !(
              (null == e ? void 0 : e.mediaType) != o.media.MediaType.Image ||
              null === (t = null == e ? void 0 : e.imageProps) ||
              void 0 === t ||
              !t.imageOutputFormats
            );
          }
          function s(e) {
            return !(
              !e ||
              (e.mediaType != o.media.MediaType.VideoAndImage &&
                !e.videoAndImageProps)
            );
          }
          function l(e) {
            return !(
              !e ||
              e.mediaType != o.media.MediaType.Video ||
              !e.videoProps ||
              e.videoProps.isFullScreenMode
            );
          }
          (t.createFile = function (e, t) {
            if (null == e || null == t || e.length <= 0) return null;
            var n,
              o = 1;
            return (
              e.sort(function (e, t) {
                return e.sequence > t.sequence ? 1 : -1;
              }),
              e.forEach(function (e) {
                e.sequence == o &&
                  ((n = n
                    ? new Blob([n, e.file], { type: t })
                    : new Blob([e.file], { type: t })),
                  o++);
              }),
              n
            );
          }),
            (t.decodeAttachment = function (e, t) {
              if (null == e || null == t) return null;
              for (
                var n = atob(e.chunk), o = new Array(n.length), i = 0;
                i < n.length;
                i++
              )
                o[i] = n.charCodeAt(i);
              var a = new Uint8Array(o);
              return (
                (t = new Blob([a], { type: t })),
                { sequence: e.chunkSequence, file: t }
              );
            }),
            (t.isMediaCallSupportedOnMobile = function (e) {
              return s(e)
                ? (0, a.isApiSupportedOnMobile)(
                    i.videoAndImageMediaAPISupportVersion
                  )
                : l(e)
                ? (0, a.isApiSupportedOnMobile)(
                    i.nonFullScreenVideoModeAPISupportVersion
                  )
                : r(e)
                ? (0, a.isApiSupportedOnMobile)(
                    i.imageOutputFormatsAPISupportVersion
                  )
                : null;
            }),
            (t.isVideoControllerRegistered = function (e) {
              return !(
                e.mediaType != o.media.MediaType.Video ||
                !e.videoProps ||
                !e.videoProps.videoController
              );
            }),
            (t.validateSelectMediaInputs = function (e) {
              return !(null == e || 10 < e.maxMediaCount);
            }),
            (t.isMediaCallForImageOutputFormats = r),
            (t.isMediaCallForVideoAndImageInputs = s),
            (t.isMediaCallForNonFullScreenVideoMode = l),
            (t.validateGetMediaInputs = function (e, t, n) {
              return (
                null != e &&
                null != t &&
                t == o.media.FileFormat.ID &&
                null != n
              );
            }),
            (t.validateViewImagesInput = function (e) {
              return !(null == e || e.length <= 0 || 10 < e.length);
            }),
            (t.validateScanBarCodeInput = function (e) {
              return (
                !e ||
                !(
                  null === e.timeOutIntervalInSec ||
                  e.timeOutIntervalInSec <= 0 ||
                  60 < e.timeOutIntervalInSec
                )
              );
            }),
            (t.validatePeoplePickerInput = function (e) {
              if (e) {
                if (e.title && "string" != typeof e.title) return !1;
                if (e.setSelected && "object" != typeof e.setSelected)
                  return !1;
                if (
                  e.openOrgWideSearchInChatOrChannel &&
                  "boolean" != typeof e.openOrgWideSearchInChatOrChannel
                )
                  return !1;
                if (e.singleSelect && "boolean" != typeof e.singleSelect)
                  return !1;
              }
              return !0;
            });
        },
        function (e, t, n) {
          "use strict";
          var o =
              (this && this.__createBinding) ||
              (Object.create
                ? function (e, t, n, o) {
                    void 0 === o && (o = n),
                      Object.defineProperty(e, o, {
                        enumerable: !0,
                        get: function () {
                          return t[n];
                        },
                      });
                  }
                : function (e, t, n, o) {
                    e[(o = void 0 === o ? n : o)] = t[n];
                  }),
            i =
              (this && this.__exportStar) ||
              function (e, t) {
                for (var n in e)
                  "default" === n ||
                    Object.prototype.hasOwnProperty.call(t, n) ||
                    o(t, e, n);
              };
          Object.defineProperty(t, "__esModule", { value: !0 }),
            i(n(20), t),
            i(n(8), t);
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.teams =
              t.appEntity =
              t.files =
              t.remoteCamera =
              t.meetingRoom =
              t.conversations =
              t.registerUserSettingsChangeHandler =
              t.uploadCustomApp =
              t.registerCustomHandler =
              t.sendCustomEvent =
              t.showNotification =
              t.sendCustomMessage =
              t.openFilePreview =
              t.getUserJoinedTeams =
              t.getConfigSetting =
              t.getChatMembers =
              t.exitFullscreen =
              t.enterFullscreen =
              t.UserSettingTypes =
              t.ViewerActionTypes =
              t.NotificationTypes =
              t.logs =
              t.bot =
                void 0);
          var o = n(21);
          Object.defineProperty(t, "bot", {
            enumerable: !0,
            get: function () {
              return o.bot;
            },
          });
          var i = n(13);
          Object.defineProperty(t, "logs", {
            enumerable: !0,
            get: function () {
              return i.logs;
            },
          });
          var a = n(36);
          Object.defineProperty(t, "NotificationTypes", {
            enumerable: !0,
            get: function () {
              return a.NotificationTypes;
            },
          }),
            Object.defineProperty(t, "ViewerActionTypes", {
              enumerable: !0,
              get: function () {
                return a.ViewerActionTypes;
              },
            }),
            Object.defineProperty(t, "UserSettingTypes", {
              enumerable: !0,
              get: function () {
                return a.UserSettingTypes;
              },
            });
          var r = n(14);
          Object.defineProperty(t, "enterFullscreen", {
            enumerable: !0,
            get: function () {
              return r.enterFullscreen;
            },
          }),
            Object.defineProperty(t, "exitFullscreen", {
              enumerable: !0,
              get: function () {
                return r.exitFullscreen;
              },
            }),
            Object.defineProperty(t, "getChatMembers", {
              enumerable: !0,
              get: function () {
                return r.getChatMembers;
              },
            }),
            Object.defineProperty(t, "getConfigSetting", {
              enumerable: !0,
              get: function () {
                return r.getConfigSetting;
              },
            }),
            Object.defineProperty(t, "getUserJoinedTeams", {
              enumerable: !0,
              get: function () {
                return r.getUserJoinedTeams;
              },
            }),
            Object.defineProperty(t, "openFilePreview", {
              enumerable: !0,
              get: function () {
                return r.openFilePreview;
              },
            }),
            Object.defineProperty(t, "sendCustomMessage", {
              enumerable: !0,
              get: function () {
                return r.sendCustomMessage;
              },
            }),
            Object.defineProperty(t, "showNotification", {
              enumerable: !0,
              get: function () {
                return r.showNotification;
              },
            }),
            Object.defineProperty(t, "sendCustomEvent", {
              enumerable: !0,
              get: function () {
                return r.sendCustomEvent;
              },
            }),
            Object.defineProperty(t, "registerCustomHandler", {
              enumerable: !0,
              get: function () {
                return r.registerCustomHandler;
              },
            }),
            Object.defineProperty(t, "uploadCustomApp", {
              enumerable: !0,
              get: function () {
                return r.uploadCustomApp;
              },
            }),
            Object.defineProperty(t, "registerUserSettingsChangeHandler", {
              enumerable: !0,
              get: function () {
                return r.registerUserSettingsChangeHandler;
              },
            });
          var s = n(37);
          Object.defineProperty(t, "conversations", {
            enumerable: !0,
            get: function () {
              return s.conversations;
            },
          });
          var l = n(38);
          Object.defineProperty(t, "meetingRoom", {
            enumerable: !0,
            get: function () {
              return l.meetingRoom;
            },
          });
          var c = n(39);
          Object.defineProperty(t, "remoteCamera", {
            enumerable: !0,
            get: function () {
              return c.remoteCamera;
            },
          });
          var d = n(40);
          Object.defineProperty(t, "files", {
            enumerable: !0,
            get: function () {
              return d.files;
            },
          });
          var u = n(41);
          Object.defineProperty(t, "appEntity", {
            enumerable: !0,
            get: function () {
              return u.appEntity;
            },
          });
          var p = n(42);
          Object.defineProperty(t, "teams", {
            enumerable: !0,
            get: function () {
              return p.teams;
            },
          });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.bot = void 0);
          var o = n(0),
            i = n(1);
          !(function (e) {
            (e.sendQuery = function (e, t, n) {
              (0, i.ensureInitialized)(),
                (0, o.sendMessageToParent)(
                  "bot.executeQuery",
                  [e],
                  function (e, o) {
                    (e ? t : n)(o);
                  }
                );
            }),
              (e.getSupportedCommands = function (e, t) {
                (0, i.ensureInitialized)(),
                  (0, o.sendMessageToParent)(
                    "bot.getSupportedCommands",
                    function (n, o) {
                      (n ? e : t)(o);
                    }
                  );
              }),
              (e.authenticate = function (e, t, n) {
                (0, i.ensureInitialized)(),
                  (0, o.sendMessageToParent)(
                    "bot.authenticate",
                    [e],
                    function (e, o) {
                      (e ? t : n)(o);
                    }
                  );
              }),
              (function (e) {
                (e.Results = "Results"), (e.Auth = "Auth");
              })(e.ResponseType || (e.ResponseType = {}));
          })(t.bot || (t.bot = {}));
        },
        function (e, t, n) {
          var o = n(23),
            i = n(24);
          ((n = i).v1 = o), (n.v4 = i), (e.exports = n);
        },
        function (e, t, n) {
          var o,
            i,
            a = n(9),
            r = n(10),
            s = 0,
            l = 0;
          e.exports = function (e, t, n) {
            var c = (t && n) || 0,
              d = t || [],
              u = (e = e || {}).node || o,
              p = void 0 !== e.clockseq ? e.clockseq : i;
            (null != u && null != p) ||
              ((h = a()),
              null == u && (u = o = [1 | h[0], h[1], h[2], h[3], h[4], h[5]]),
              null == p && (p = i = 16383 & ((h[6] << 8) | h[7])));
            var g = void 0 !== e.msecs ? e.msecs : new Date().getTime(),
              h =
                ((n = void 0 !== e.nsecs ? e.nsecs : l + 1),
                g - s + (n - l) / 1e4);
            if (
              (h < 0 && void 0 === e.clockseq && (p = (p + 1) & 16383),
              1e4 <= (n = (h < 0 || s < g) && void 0 === e.nsecs ? 0 : n))
            )
              throw new Error(
                "uuid.v1(): Can't create more than 10M uuids/sec"
              );
            (s = g),
              (i = p),
              (n =
                (1e4 * (268435455 & (g += 122192928e5)) + (l = n)) %
                4294967296),
              (d[c++] = (n >>> 24) & 255),
              (d[c++] = (n >>> 16) & 255),
              (d[c++] = (n >>> 8) & 255),
              (d[c++] = 255 & n),
              (g = ((g / 4294967296) * 1e4) & 268435455),
              (d[c++] = (g >>> 8) & 255),
              (d[c++] = 255 & g),
              (d[c++] = ((g >>> 24) & 15) | 16),
              (d[c++] = (g >>> 16) & 255),
              (d[c++] = (p >>> 8) | 128),
              (d[c++] = 255 & p);
            for (var f = 0; f < 6; ++f) d[c + f] = u[f];
            return t || r(d);
          };
        },
        function (e, t, n) {
          var o = n(9),
            i = n(10);
          e.exports = function (e, t, n) {
            var a = (t && n) || 0;
            "string" == typeof e &&
              ((t = "binary" === e ? new Array(16) : null), (e = null));
            var r = (e = e || {}).random || (e.rng || o)();
            if (((r[6] = (15 & r[6]) | 64), (r[8] = (63 & r[8]) | 128), t))
              for (var s = 0; s < 16; ++s) t[a + s] = r[s];
            return t || i(r);
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.appInitialization = void 0);
          var o = n(1),
            i = n(4),
            a = n(0);
          !(function (e) {
            (e.Messages = {
              AppLoaded: "appInitialization.appLoaded",
              Success: "appInitialization.success",
              Failure: "appInitialization.failure",
              ExpectedFailure: "appInitialization.expectedFailure",
            }),
              (function (e) {
                (e.AuthFailed = "AuthFailed"),
                  (e.Timeout = "Timeout"),
                  (e.Other = "Other");
              })(e.FailedReason || (e.FailedReason = {})),
              (function (e) {
                (e.PermissionError = "PermissionError"),
                  (e.NotFound = "NotFound"),
                  (e.Throttling = "Throttling"),
                  (e.Offline = "Offline"),
                  (e.Other = "Other");
              })(e.ExpectedFailureReason || (e.ExpectedFailureReason = {})),
              (e.notifyAppLoaded = function () {
                (0, o.ensureInitialized)(),
                  (0, a.sendMessageToParent)(e.Messages.AppLoaded, [i.version]);
              }),
              (e.notifySuccess = function () {
                (0, o.ensureInitialized)(),
                  (0, a.sendMessageToParent)(e.Messages.Success, [i.version]);
              }),
              (e.notifyFailure = function (t) {
                (0, o.ensureInitialized)(),
                  (0, a.sendMessageToParent)(e.Messages.Failure, [
                    t.reason,
                    t.message,
                  ]);
              }),
              (e.notifyExpectedFailure = function (t) {
                (0, o.ensureInitialized)(),
                  (0, a.sendMessageToParent)(e.Messages.ExpectedFailure, [
                    t.reason,
                    t.message,
                  ]);
              });
          })(t.appInitialization || (t.appInitialization = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.initializeWithFrameContext =
              t.setFrameContext =
              t.executeDeepLink =
              t.shareDeepLink =
              t.getMruTabInstances =
              t.getTabInstances =
              t.registerChangeSettingsHandler =
              t.registerFocusEnterHandler =
              t.registerBeforeUnloadHandler =
              t.registerOnLoadHandler =
              t.registerBackButtonHandler =
              t.registerAppButtonHoverLeaveHandler =
              t.registerAppButtonHoverEnterHandler =
              t.registerAppButtonClickHandler =
              t.registerFullScreenHandler =
              t.registerOnThemeChangeHandler =
              t.getContext =
              t.print =
              t.enablePrintCapability =
              t._uninitialize =
              t._initialize =
              t.initialize =
                void 0);
          var o = n(1),
            i = n(7),
            a = n(4),
            r = n(12),
            s = n(5),
            l = n(13),
            c = n(2),
            d = n(0),
            u = n(11),
            p = n(14),
            g = n(15),
            h = n(3);
          function f(e, t) {
            i.GlobalVars.initializeCalled ||
              ((i.GlobalVars.initializeCalled = !0),
              h.initializeHandlers(),
              (0, d.initializeCommunication)(function (e, t, n) {
                void 0 === n && (n = a.defaultSDKVersionForCompatCheck),
                  (i.GlobalVars.frameContext = e),
                  (i.GlobalVars.hostClientType = t),
                  (i.GlobalVars.clientSupportedSDKVersion = n),
                  i.GlobalVars.initializeCallbacks.forEach(function (e) {
                    return e();
                  }),
                  (i.GlobalVars.initializeCallbacks = []),
                  (i.GlobalVars.initializeCompleted = !0);
              }, t),
              u.authentication.initialize(),
              r.settings.initialize(),
              g.menus.initialize(),
              (0, p.initializePrivateApis)()),
              Array.isArray(t) && (0, o.processAdditionalValidOrigins)(t),
              e &&
                (i.GlobalVars.initializeCompleted
                  ? e()
                  : i.GlobalVars.initializeCallbacks.push(e));
          }
          function m() {
            window.print();
          }
          function y(e) {
            (0, o.ensureInitialized)(), h.registerOnThemeChangeHandler(e);
          }
          function v(e) {
            (0, o.ensureInitialized)(),
              h.registerHandler("fullScreenChange", e);
          }
          function _(e) {
            (0, o.ensureInitialized)(), h.registerBackButtonHandler(e);
          }
          function b(e) {
            (0, o.ensureInitialized)(), h.registerOnLoadHandler(e);
          }
          function w(e) {
            (0, o.ensureInitialized)(), h.registerBeforeUnloadHandler(e);
          }
          function C(e) {
            (0, o.ensureInitialized)(), h.registerFocusEnterHandler(e);
          }
          function x(e) {
            (0, o.ensureInitialized)(c.FrameContexts.content),
              (0, d.sendMessageToParent)("setFrameContext", [e]);
          }
          (t.initialize = f),
            (t._initialize = function (e) {
              d.Communication.currentWindow = e;
            }),
            (t._uninitialize = function () {
              i.GlobalVars.initializeCalled &&
                (i.GlobalVars.frameContext &&
                  (y(null),
                  v(null),
                  _(null),
                  w(null),
                  C(null),
                  b(null),
                  l.logs.registerGetLogHandler(null)),
                i.GlobalVars.frameContext === c.FrameContexts.settings &&
                  r.settings.registerOnSaveHandler(null),
                i.GlobalVars.frameContext === c.FrameContexts.remove &&
                  r.settings.registerOnRemoveHandler(null),
                (i.GlobalVars.initializeCalled = !1),
                (i.GlobalVars.initializeCompleted = !1),
                (i.GlobalVars.initializeCallbacks = []),
                (i.GlobalVars.additionalValidOrigins = []),
                (i.GlobalVars.frameContext = null),
                (i.GlobalVars.hostClientType = null),
                ((i.GlobalVars.isFramelessWindow = !1),
                d.uninitializeCommunication)());
            }),
            (t.enablePrintCapability = function () {
              i.GlobalVars.printCapabilityEnabled ||
                ((i.GlobalVars.printCapabilityEnabled = !0),
                (0, o.ensureInitialized)(),
                document.addEventListener("keydown", function (e) {
                  (e.ctrlKey || e.metaKey) &&
                    80 === e.keyCode &&
                    (m(),
                    (e.cancelBubble = !0),
                    e.preventDefault(),
                    e.stopImmediatePropagation());
                }));
            }),
            (t.print = m),
            (t.getContext = function (e) {
              (0, o.ensureInitialized)(),
                (0, d.sendMessageToParent)("getContext", function (t) {
                  t.frameContext ||
                    (t.frameContext = i.GlobalVars.frameContext),
                    e(t);
                });
            }),
            (t.registerOnThemeChangeHandler = y),
            (t.registerFullScreenHandler = v),
            (t.registerAppButtonClickHandler = function (e) {
              (0, o.ensureInitialized)(c.FrameContexts.content),
                h.registerHandler("appButtonClick", e);
            }),
            (t.registerAppButtonHoverEnterHandler = function (e) {
              (0, o.ensureInitialized)(c.FrameContexts.content),
                h.registerHandler("appButtonHoverEnter", e);
            }),
            (t.registerAppButtonHoverLeaveHandler = function (e) {
              (0, o.ensureInitialized)(c.FrameContexts.content),
                h.registerHandler("appButtonHoverLeave", e);
            }),
            (t.registerBackButtonHandler = _),
            (t.registerOnLoadHandler = b),
            (t.registerBeforeUnloadHandler = w),
            (t.registerFocusEnterHandler = C),
            (t.registerChangeSettingsHandler = function (e) {
              (0, o.ensureInitialized)(c.FrameContexts.content),
                h.registerHandler("changeSettings", e);
            }),
            (t.getTabInstances = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, d.sendMessageToParent)("getTabInstances", [t], e);
            }),
            (t.getMruTabInstances = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, d.sendMessageToParent)("getMruTabInstances", [t], e);
            }),
            (t.shareDeepLink = function (e) {
              (0, o.ensureInitialized)(
                c.FrameContexts.content,
                c.FrameContexts.sidePanel,
                c.FrameContexts.meetingStage
              ),
                (0, d.sendMessageToParent)("shareDeepLink", [
                  e.subEntityId,
                  e.subEntityLabel,
                  e.subEntityWebUrl,
                ]);
            }),
            (t.executeDeepLink = function (e, t) {
              (0, o.ensureInitialized)(
                c.FrameContexts.content,
                c.FrameContexts.sidePanel,
                c.FrameContexts.settings,
                c.FrameContexts.task,
                c.FrameContexts.stage,
                c.FrameContexts.meetingStage
              ),
                (0, d.sendMessageToParent)(
                  "executeDeepLink",
                  [e],
                  t || (0, s.getGenericOnCompleteHandler)()
                );
            }),
            (t.setFrameContext = x),
            (t.initializeWithFrameContext = function (e, t, n) {
              f(t, n), x(e);
            });
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.navigateBack =
              t.navigateCrossDomain =
              t.navigateToTab =
              t.returnFocus =
                void 0);
          var o = n(1),
            i = n(5),
            a = n(2),
            r = n(0);
          (t.returnFocus = function (e) {
            (0, o.ensureInitialized)(),
              (0, r.sendMessageToParent)("returnFocus", [e]);
          }),
            (t.navigateToTab = function (e, t) {
              (0, o.ensureInitialized)(),
                (0, r.sendMessageToParent)(
                  "navigateToTab",
                  [e],
                  t ||
                    (0, i.getGenericOnCompleteHandler)(
                      "Invalid internalTabInstanceId and/or channelId were/was provided"
                    )
                );
            }),
            (t.navigateCrossDomain = function (e, t) {
              (0, o.ensureInitialized)(
                a.FrameContexts.content,
                a.FrameContexts.sidePanel,
                a.FrameContexts.settings,
                a.FrameContexts.remove,
                a.FrameContexts.task,
                a.FrameContexts.stage,
                a.FrameContexts.meetingStage
              ),
                (0, r.sendMessageToParent)(
                  "navigateCrossDomain",
                  [e],
                  t ||
                    (0, i.getGenericOnCompleteHandler)(
                      "Cross-origin navigation is only supported for URLs matching the pattern registered in the manifest."
                    )
                );
            }),
            (t.navigateBack = function (e) {
              (0, o.ensureInitialized)(),
                (0, r.sendMessageToParent)(
                  "navigateBack",
                  [],
                  e ||
                    (0, i.getGenericOnCompleteHandler)(
                      "Back navigation is not supported in the current client or context."
                    )
                );
            });
        },
        function (e, t, n) {
          "use strict";
          var o =
            (this && this.__rest) ||
            function (e, t) {
              var n = {};
              for (i in e)
                Object.prototype.hasOwnProperty.call(e, i) &&
                  t.indexOf(i) < 0 &&
                  (n[i] = e[i]);
              if (
                null != e &&
                "function" == typeof Object.getOwnPropertySymbols
              )
                for (
                  var o = 0, i = Object.getOwnPropertySymbols(e);
                  o < i.length;
                  o++
                )
                  t.indexOf(i[o]) < 0 &&
                    Object.prototype.propertyIsEnumerable.call(e, i[o]) &&
                    (n[i[o]] = e[i[o]]);
              return n;
            };
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.tasks = void 0);
          var i = n(2),
            a = n(16),
            r = n(0),
            s = n(1);
          !(function (e) {
            (e.startTask = function (e, t) {
              return (
                (0, s.ensureInitialized)(
                  i.FrameContexts.content,
                  i.FrameContexts.sidePanel,
                  i.FrameContexts.meetingStage
                ),
                (0, r.sendMessageToParent)("tasks.startTask", [e], t),
                new a.ChildAppWindow()
              );
            }),
              (e.updateTask = function (e) {
                (0, s.ensureInitialized)(
                  i.FrameContexts.content,
                  i.FrameContexts.sidePanel,
                  i.FrameContexts.task,
                  i.FrameContexts.meetingStage
                ),
                  e.width,
                  e.height;
                var t = o(e, ["width", "height"]);
                if (Object.keys(t).length)
                  throw new Error(
                    "updateTask requires a taskInfo argument containing only width and height"
                  );
                (0, r.sendMessageToParent)("tasks.updateTask", [e]);
              }),
              (e.submitTask = function (e, t) {
                (0, s.ensureInitialized)(
                  i.FrameContexts.content,
                  i.FrameContexts.sidePanel,
                  i.FrameContexts.task,
                  i.FrameContexts.meetingStage
                ),
                  (0, r.sendMessageToParent)("tasks.completeTask", [
                    e,
                    Array.isArray(t) ? t : [t],
                  ]);
              });
          })(t.tasks || (t.tasks = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.location = void 0);
          var o = n(6),
            i = n(1),
            a = n(2),
            r = n(0),
            s = n(4);
          !(function (e) {
            (e.getLocation = function (e, t) {
              if (!t)
                throw new Error(
                  "[location.getLocation] Callback cannot be null"
                );
              (0, i.ensureInitialized)(
                a.FrameContexts.content,
                a.FrameContexts.task
              ),
                (0, i.isAPISupportedByPlatform)(s.locationAPIsRequiredVersion)
                  ? e
                    ? (0, r.sendMessageToParent)("location.getLocation", [e], t)
                    : t({ errorCode: o.ErrorCode.INVALID_ARGUMENTS }, void 0)
                  : t({ errorCode: o.ErrorCode.OLD_PLATFORM }, void 0);
            }),
              (e.showLocation = function (e, t) {
                if (!t)
                  throw new Error(
                    "[location.showLocation] Callback cannot be null"
                  );
                (0, i.ensureInitialized)(
                  a.FrameContexts.content,
                  a.FrameContexts.task
                ),
                  (0, i.isAPISupportedByPlatform)(s.locationAPIsRequiredVersion)
                    ? e
                      ? (0, r.sendMessageToParent)(
                          "location.showLocation",
                          [e],
                          t
                        )
                      : t({ errorCode: o.ErrorCode.INVALID_ARGUMENTS }, void 0)
                    : t({ errorCode: o.ErrorCode.OLD_PLATFORM }, void 0);
              });
          })(t.location || (t.location = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.meeting = void 0);
          var o = n(0),
            i = n(3),
            a = n(1),
            r = n(2);
          !(function (e) {
            !(function (e) {
              (e.Unknown = "Unknown"),
                (e.Adhoc = "Adhoc"),
                (e.Scheduled = "Scheduled"),
                (e.Recurring = "Recurring"),
                (e.Broadcast = "Broadcast"),
                (e.MeetNow = "MeetNow");
            })(e.MeetingType || (e.MeetingType = {})),
              (function (e) {
                (e.OneOnOneCall = "oneOnOneCall"), (e.GroupCall = "groupCall");
              })(e.CallType || (e.CallType = {})),
              (e.getIncomingClientAudioState = function (e) {
                if (!e)
                  throw new Error(
                    "[get incoming client audio state] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)("getIncomingClientAudioState", e);
              }),
              (e.toggleIncomingClientAudio = function (e) {
                if (!e)
                  throw new Error(
                    "[toggle incoming client audio] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)("toggleIncomingClientAudio", e);
              }),
              (e.getMeetingDetails = function (e) {
                if (!e)
                  throw new Error(
                    "[get meeting details] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage,
                  r.FrameContexts.settings,
                  r.FrameContexts.content
                ),
                  (0, o.sendMessageToParent)("meeting.getMeetingDetails", e);
              }),
              (e.getAuthenticationTokenForAnonymousUser = function (e) {
                if (!e)
                  throw new Error(
                    "[get Authentication Token For AnonymousUser] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)(
                    "meeting.getAuthenticationTokenForAnonymousUser",
                    e
                  );
              }),
              (e.getLiveStreamState = function (e) {
                if (!e)
                  throw new Error(
                    "[get live stream state] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(r.FrameContexts.sidePanel),
                  (0, o.sendMessageToParent)("meeting.getLiveStreamState", e);
              }),
              (e.requestStartLiveStreaming = function (e, t, n) {
                if (!e)
                  throw new Error(
                    "[request start live streaming] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(r.FrameContexts.sidePanel),
                  (0, o.sendMessageToParent)(
                    "meeting.requestStartLiveStreaming",
                    [t, n],
                    e
                  );
              }),
              (e.requestStopLiveStreaming = function (e) {
                if (!e)
                  throw new Error(
                    "[request stop live streaming] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(r.FrameContexts.sidePanel),
                  (0, o.sendMessageToParent)(
                    "meeting.requestStopLiveStreaming",
                    e
                  );
              }),
              (e.registerLiveStreamChangedHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[register live stream changed handler] Handler cannot be null"
                  );
                (0, a.ensureInitialized)(r.FrameContexts.sidePanel),
                  (0, i.registerHandler)("meeting.liveStreamChanged", e);
              }),
              (e.shareAppContentToStage = function (e, t) {
                if (!e)
                  throw new Error(
                    "[share app content to stage] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)(
                    "meeting.shareAppContentToStage",
                    [t],
                    e
                  );
              }),
              (e.getAppContentStageSharingCapabilities = function (e) {
                if (!e)
                  throw new Error(
                    "[get app content stage sharing capabilities] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)(
                    "meeting.getAppContentStageSharingCapabilities",
                    e
                  );
              }),
              (e.stopSharingAppContentToStage = function (e) {
                if (!e)
                  throw new Error(
                    "[stop sharing app content to stage] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)(
                    "meeting.stopSharingAppContentToStage",
                    e
                  );
              }),
              (e.getAppContentStageSharingState = function (e) {
                if (!e)
                  throw new Error(
                    "[get app content stage sharing state] Callback cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, o.sendMessageToParent)(
                    "meeting.getAppContentStageSharingState",
                    e
                  );
              }),
              (e.registerSpeakingStateChangeHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[registerSpeakingStateChangeHandler] Handler cannot be null"
                  );
                (0, a.ensureInitialized)(
                  r.FrameContexts.sidePanel,
                  r.FrameContexts.meetingStage
                ),
                  (0, i.registerHandler)("meeting.speakingStateChanged", e);
              });
          })(t.meeting || (t.meeting = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.monetization = void 0);
          var o = n(0),
            i = n(1),
            a = n(2);
          (t.monetization || (t.monetization = {})).openPurchaseExperience =
            function (e, t) {
              if (!e)
                throw new Error(
                  "[open purchase experience] Callback cannot be null"
                );
              (0, i.ensureInitialized)(a.FrameContexts.content),
                (0, o.sendMessageToParent)(
                  "monetization.openPurchaseExperience",
                  [t],
                  e
                );
            };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.people = void 0);
          var o = n(1),
            i = n(2),
            a = n(6),
            r = n(18),
            s = n(0),
            l = n(4);
          (t.people || (t.people = {})).selectPeople = function (e, t) {
            if (!e) throw new Error("[people picker] Callback cannot be null");
            (0, o.ensureInitialized)(
              i.FrameContexts.content,
              i.FrameContexts.task,
              i.FrameContexts.settings
            ),
              (0, o.isAPISupportedByPlatform)(l.peoplePickerRequiredVersion)
                ? (0, r.validatePeoplePickerInput)(t)
                  ? (0, s.sendMessageToParent)("people.selectPeople", [t], e)
                  : e({ errorCode: a.ErrorCode.INVALID_ARGUMENTS }, null)
                : e({ errorCode: a.ErrorCode.OLD_PLATFORM }, void 0);
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.video = void 0);
          var o = n(0),
            i = n(1),
            a = n(2),
            r = n(3);
          !(function (e) {
            function t() {
              (0, o.sendMessageToParent)("video.videoFrameProcessed");
            }
            function n(e) {
              (0, o.sendMessageToParent)("video.notifyError", [e]);
            }
            !(function (e) {
              e[(e.NV12 = 0)] = "NV12";
            })(e.VideoFrameFormat || (e.VideoFrameFormat = {})),
              (function (e) {
                (e[(e.EffectChanged = 0)] = "EffectChanged"),
                  (e[(e.EffectDisabled = 1)] = "EffectDisabled");
              })(e.EffectChangeType || (e.EffectChangeType = {})),
              (e.registerForVideoFrame = function (e, s) {
                (0, i.ensureInitialized)(a.FrameContexts.sidePanel),
                  (0, r.registerHandler)("video.newVideoFrame", function (o) {
                    void 0 !== o && e(o, t, n);
                  }),
                  (0, o.sendMessageToParent)("video.registerForVideoFrame", [
                    s,
                  ]);
              }),
              (e.notifySelectedVideoEffectChanged = function (e, t) {
                (0, i.ensureInitialized)(a.FrameContexts.sidePanel),
                  (0, o.sendMessageToParent)("video.videoEffectChanged", [
                    e,
                    t,
                  ]);
              }),
              (e.registerForVideoEffect = function (e) {
                (0, i.ensureInitialized)(a.FrameContexts.sidePanel),
                  (0, r.registerHandler)("video.effectParameterChange", e);
              });
          })(t.video || (t.video = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.sharing = void 0);
          var o = n(1),
            i = n(0),
            a = n(6),
            r = n(2);
          !(function (e) {
            (e.SharingAPIMessages = {
              shareWebContent: "sharing.shareWebContent",
            }),
              (e.shareWebContent = function (t, n) {
                (function (e, t) {
                  if (e && e.content && e.content.length) return 1;
                  t &&
                    t({
                      errorCode: a.ErrorCode.INVALID_ARGUMENTS,
                      message: "Shared content is missing",
                    });
                })(t, n) &&
                  (function (e, t) {
                    if (
                      e.content.some(function (e) {
                        return !e.type;
                      })
                    )
                      t &&
                        t({
                          errorCode: a.ErrorCode.INVALID_ARGUMENTS,
                          message: "Shared content type cannot be undefined",
                        });
                    else {
                      if (
                        !e.content.some(function (t) {
                          return t.type !== e.content[0].type;
                        })
                      )
                        return 1;
                      t &&
                        t({
                          errorCode: a.ErrorCode.INVALID_ARGUMENTS,
                          message: "Shared content must be of the same type",
                        });
                    }
                  })(t, n) &&
                  (function (e, t) {
                    if ("URL" === e.content[0].type) {
                      if (
                        !e.content.some(function (e) {
                          return !e.url;
                        })
                      )
                        return 1;
                      t &&
                        t({
                          errorCode: a.ErrorCode.INVALID_ARGUMENTS,
                          message: "URLs are required for URL content types",
                        });
                    } else
                      t &&
                        t({
                          errorCode: a.ErrorCode.INVALID_ARGUMENTS,
                          message: "Content type is unsupported",
                        });
                  })(t, n) &&
                  ((0, o.ensureInitialized)(
                    r.FrameContexts.content,
                    r.FrameContexts.sidePanel,
                    r.FrameContexts.task,
                    r.FrameContexts.stage,
                    r.FrameContexts.meetingStage
                  ),
                  (0, i.sendMessageToParent)(
                    e.SharingAPIMessages.shareWebContent,
                    [t],
                    n
                  ));
              });
          })(t.sharing || (t.sharing = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.stageView = void 0);
          var o = n(0),
            i = n(1),
            a = n(2);
          (t.stageView || (t.stageView = {})).open = function (e, t) {
            if (((0, i.ensureInitialized)(a.FrameContexts.content), !e))
              throw new Error(
                "[stageView.open] Stage view params cannot be null"
              );
            (0, o.sendMessageToParent)("stageView.open", [e], t);
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.UserSettingTypes =
              t.ViewerActionTypes =
              t.NotificationTypes =
                void 0),
            (function (e) {
              (e.fileDownloadStart = "fileDownloadStart"),
                (e.fileDownloadComplete = "fileDownloadComplete");
            })(t.NotificationTypes || (t.NotificationTypes = {})),
            (function (e) {
              (e.view = "view"), (e.edit = "edit"), (e.editNew = "editNew");
            })(t.ViewerActionTypes || (t.ViewerActionTypes = {})),
            (function (e) {
              (e.fileOpenPreference = "fileOpenPreference"),
                (e.theme = "theme");
            })(t.UserSettingTypes || (t.UserSettingTypes = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.conversations = void 0);
          var o = n(1),
            i = n(2),
            a = n(0),
            r = n(3);
          !(function (e) {
            (e.openConversation = function (e) {
              (0, o.ensureInitialized)(i.FrameContexts.content),
                (0, a.sendMessageToParent)(
                  "conversations.openConversation",
                  [
                    {
                      title: e.title,
                      subEntityId: e.subEntityId,
                      conversationId: e.conversationId,
                      channelId: e.channelId,
                      entityId: e.entityId,
                    },
                  ],
                  function (e, t) {
                    if (!e) throw new Error(t);
                  }
                ),
                e.onStartConversation &&
                  (0, r.registerHandler)(
                    "startConversation",
                    function (t, n, o, i) {
                      return e.onStartConversation({
                        subEntityId: t,
                        conversationId: n,
                        channelId: o,
                        entityId: i,
                      });
                    }
                  ),
                e.onCloseConversation &&
                  (0, r.registerHandler)(
                    "closeConversation",
                    function (t, n, o, i) {
                      return e.onCloseConversation({
                        subEntityId: t,
                        conversationId: n,
                        channelId: o,
                        entityId: i,
                      });
                    }
                  );
            }),
              (e.closeConversation = function () {
                (0, o.ensureInitialized)(i.FrameContexts.content),
                  (0, a.sendMessageToParent)("conversations.closeConversation"),
                  (0, r.removeHandler)("startConversation"),
                  (0, r.removeHandler)("closeConversation");
              });
          })(t.conversations || (t.conversations = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.meetingRoom = void 0);
          var o = n(1),
            i = n(0),
            a = n(3);
          !(function (e) {
            !(function (e) {
              (e.toggleMute = "toggleMute"),
                (e.toggleCamera = "toggleCamera"),
                (e.toggleCaptions = "toggleCaptions"),
                (e.volume = "volume"),
                (e.showVideoGallery = "showVideoGallery"),
                (e.showContent = "showContent"),
                (e.showVideoGalleryAndContent = "showVideoGalleryAndContent"),
                (e.showLargeGallery = "showLargeGallery"),
                (e.showTogether = "showTogether"),
                (e.leaveMeeting = "leaveMeeting");
            })(e.Capability || (e.Capability = {})),
              (e.getPairedMeetingRoomInfo = function (e) {
                (0, o.ensureInitialized)(),
                  (0, i.sendMessageToParent)(
                    "meetingRoom.getPairedMeetingRoomInfo",
                    e
                  );
              }),
              (e.sendCommandToPairedMeetingRoom = function (e, t) {
                if (!e || 0 == e.length)
                  throw new Error(
                    "[meetingRoom.sendCommandToPairedMeetingRoom] Command name cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[meetingRoom.sendCommandToPairedMeetingRoom] Callback cannot be null"
                  );
                (0, o.ensureInitialized)(),
                  (0, i.sendMessageToParent)(
                    "meetingRoom.sendCommandToPairedMeetingRoom",
                    [e],
                    t
                  );
              }),
              (e.registerMeetingRoomCapabilitiesUpdateHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[meetingRoom.registerMeetingRoomCapabilitiesUpdateHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(),
                  (0, a.registerHandler)(
                    "meetingRoom.meetingRoomCapabilitiesUpdate",
                    function (t) {
                      (0, o.ensureInitialized)(), e(t);
                    }
                  );
              }),
              (e.registerMeetingRoomStatesUpdateHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[meetingRoom.registerMeetingRoomStatesUpdateHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(),
                  (0, a.registerHandler)(
                    "meetingRoom.meetingRoomStatesUpdate",
                    function (t) {
                      (0, o.ensureInitialized)(), e(t);
                    }
                  );
              });
          })(t.meetingRoom || (t.meetingRoom = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.remoteCamera = void 0);
          var o = n(1),
            i = n(2),
            a = n(0),
            r = n(3);
          !(function (e) {
            !(function (e) {
              (e.Reset = "Reset"),
                (e.ZoomIn = "ZoomIn"),
                (e.ZoomOut = "ZoomOut"),
                (e.PanLeft = "PanLeft"),
                (e.PanRight = "PanRight"),
                (e.TiltUp = "TiltUp"),
                (e.TiltDown = "TiltDown");
            })(e.ControlCommand || (e.ControlCommand = {})),
              (function (e) {
                (e[(e.CommandResetError = 0)] = "CommandResetError"),
                  (e[(e.CommandZoomInError = 1)] = "CommandZoomInError"),
                  (e[(e.CommandZoomOutError = 2)] = "CommandZoomOutError"),
                  (e[(e.CommandPanLeftError = 3)] = "CommandPanLeftError"),
                  (e[(e.CommandPanRightError = 4)] = "CommandPanRightError"),
                  (e[(e.CommandTiltUpError = 5)] = "CommandTiltUpError"),
                  (e[(e.CommandTiltDownError = 6)] = "CommandTiltDownError"),
                  (e[(e.SendDataError = 7)] = "SendDataError");
              })(e.ErrorReason || (e.ErrorReason = {})),
              (function (e) {
                (e[(e.None = 0)] = "None"),
                  (e[(e.ControlDenied = 1)] = "ControlDenied"),
                  (e[(e.ControlNoResponse = 2)] = "ControlNoResponse"),
                  (e[(e.ControlBusy = 3)] = "ControlBusy"),
                  (e[(e.AckTimeout = 4)] = "AckTimeout"),
                  (e[(e.ControlTerminated = 5)] = "ControlTerminated"),
                  (e[(e.ControllerTerminated = 6)] = "ControllerTerminated"),
                  (e[(e.DataChannelError = 7)] = "DataChannelError"),
                  (e[(e.ControllerCancelled = 8)] = "ControllerCancelled"),
                  (e[(e.ControlDisabled = 9)] = "ControlDisabled"),
                  (e[(e.ControlTerminatedToAllowOtherController = 10)] =
                    "ControlTerminatedToAllowOtherController");
              })(e.SessionTerminatedReason || (e.SessionTerminatedReason = {})),
              (e.getCapableParticipants = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.getCapableParticipants] Callback cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, a.sendMessageToParent)(
                    "remoteCamera.getCapableParticipants",
                    e
                  );
              }),
              (e.requestControl = function (e, t) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.requestControl] Participant cannot be null"
                  );
                if (!t)
                  throw new Error(
                    "[remoteCamera.requestControl] Callback cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, a.sendMessageToParent)(
                    "remoteCamera.requestControl",
                    [e],
                    t
                  );
              }),
              (e.sendControlCommand = function (e, t) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.sendControlCommand] ControlCommand cannot be null"
                  );
                if (!t)
                  throw new Error(
                    "[remoteCamera.sendControlCommand] Callback cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, a.sendMessageToParent)(
                    "remoteCamera.sendControlCommand",
                    [e],
                    t
                  );
              }),
              (e.terminateSession = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.terminateSession] Callback cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, a.sendMessageToParent)(
                    "remoteCamera.terminateSession",
                    e
                  );
              }),
              (e.registerOnCapableParticipantsChangeHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.registerOnCapableParticipantsChangeHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, r.registerHandler)(
                    "remoteCamera.capableParticipantsChange",
                    e
                  );
              }),
              (e.registerOnErrorHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.registerOnErrorHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, r.registerHandler)("remoteCamera.handlerError", e);
              }),
              (e.registerOnDeviceStateChangeHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.registerOnDeviceStateChangeHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, r.registerHandler)("remoteCamera.deviceStateChange", e);
              }),
              (e.registerOnSessionStatusChangeHandler = function (e) {
                if (!e)
                  throw new Error(
                    "[remoteCamera.registerOnSessionStatusChangeHandler] Handler cannot be null"
                  );
                (0, o.ensureInitialized)(i.FrameContexts.sidePanel),
                  (0, r.registerHandler)("remoteCamera.sessionStatusChange", e);
              });
          })(t.remoteCamera || (t.remoteCamera = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.files = void 0);
          var o = n(0),
            i = n(1),
            a = n(8);
          !(function (e) {
            !(function (e) {
              (e.Dropbox = "DROPBOX"),
                (e.Box = "BOX"),
                (e.Sharefile = "SHAREFILE"),
                (e.GoogleDrive = "GOOGLEDRIVE"),
                (e.Egnyte = "EGNYTE"),
                (e.SharePoint = "SharePoint");
            })(e.CloudStorageProvider || (e.CloudStorageProvider = {})),
              (function (e) {
                (e[(e.Sharepoint = 0)] = "Sharepoint"),
                  (e[(e.WopiIntegration = 1)] = "WopiIntegration"),
                  (e[(e.Google = 2)] = "Google"),
                  (e[(e.OneDrive = 3)] = "OneDrive"),
                  (e[(e.Recent = 4)] = "Recent"),
                  (e[(e.Aggregate = 5)] = "Aggregate"),
                  (e[(e.FileSystem = 6)] = "FileSystem"),
                  (e[(e.Search = 7)] = "Search"),
                  (e[(e.AllFiles = 8)] = "AllFiles"),
                  (e[(e.SharedWithMe = 9)] = "SharedWithMe");
              })(
                e.CloudStorageProviderType || (e.CloudStorageProviderType = {})
              ),
              ((
                e.SpecialDocumentLibraryType ||
                (e.SpecialDocumentLibraryType = {})
              ).ClassMaterials = "classMaterials"),
              ((
                e.DocumentLibraryAccessType ||
                (e.DocumentLibraryAccessType = {})
              ).Readonly = "readonly"),
              (function (e) {
                (e.Downloaded = "Downloaded"),
                  (e.Downloading = "Downloading"),
                  (e.Failed = "Failed");
              })(e.FileDownloadStatus || (e.FileDownloadStatus = {})),
              (e.getCloudStorageFolders = function (e, t) {
                if (
                  ((0, i.ensureInitialized)(a.FrameContexts.content),
                  !e || 0 === e.length)
                )
                  throw new Error(
                    "[files.getCloudStorageFolders] channelId name cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[files.getCloudStorageFolders] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)(
                  "files.getCloudStorageFolders",
                  [e],
                  t
                );
              }),
              (e.addCloudStorageFolder = function (e, t) {
                if (
                  ((0, i.ensureInitialized)(a.FrameContexts.content),
                  !e || 0 === e.length)
                )
                  throw new Error(
                    "[files.addCloudStorageFolder] channelId name cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[files.addCloudStorageFolder] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)(
                  "files.addCloudStorageFolder",
                  [e],
                  t
                );
              }),
              (e.deleteCloudStorageFolder = function (e, t, n) {
                if (((0, i.ensureInitialized)(a.FrameContexts.content), !e))
                  throw new Error(
                    "[files.deleteCloudStorageFolder] channelId name cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[files.deleteCloudStorageFolder] folderToDelete cannot be null or empty"
                  );
                if (!n)
                  throw new Error(
                    "[files.deleteCloudStorageFolder] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)(
                  "files.deleteCloudStorageFolder",
                  [e, t],
                  n
                );
              }),
              (e.getCloudStorageFolderContents = function (e, t, n) {
                if (
                  ((0, i.ensureInitialized)(a.FrameContexts.content), !e || !t)
                )
                  throw new Error(
                    "[files.getCloudStorageFolderContents] folder/providerCode name cannot be null or empty"
                  );
                if (!n)
                  throw new Error(
                    "[files.getCloudStorageFolderContents] Callback cannot be null"
                  );
                if ("isSubdirectory" in e && !e.isSubdirectory)
                  throw new Error(
                    "[files.getCloudStorageFolderContents] provided folder is not a subDirectory"
                  );
                (0, o.sendMessageToParent)(
                  "files.getCloudStorageFolderContents",
                  [e, t],
                  n
                );
              }),
              (e.openCloudStorageFile = function (e, t, n) {
                if (
                  ((0, i.ensureInitialized)(a.FrameContexts.content), !e || !t)
                )
                  throw new Error(
                    "[files.openCloudStorageFile] file/providerCode cannot be null or empty"
                  );
                if (e.isSubdirectory)
                  throw new Error(
                    "[files.openCloudStorageFile] provided file is a subDirectory"
                  );
                (0, o.sendMessageToParent)("files.openCloudStorageFile", [
                  e,
                  t,
                  n,
                ]);
              }),
              (e.getExternalProviders = function (e, t) {
                if (
                  (void 0 === e && (e = !1),
                  (0, i.ensureInitialized)(a.FrameContexts.content),
                  !t)
                )
                  throw new Error(
                    "[files.getExternalProviders] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)(
                  "files.getExternalProviders",
                  [e],
                  t
                );
              }),
              (e.copyMoveFiles = function (e, t, n, r, s, l) {
                if (
                  (void 0 === s && (s = !1),
                  (0, i.ensureInitialized)(a.FrameContexts.content),
                  !e || 0 === e.length)
                )
                  throw new Error(
                    "[files.copyMoveFiles] selectedFiles cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[files.copyMoveFiles] providerCode cannot be null or empty"
                  );
                if (!n)
                  throw new Error(
                    "[files.copyMoveFiles] destinationFolder cannot be null or empty"
                  );
                if (!r)
                  throw new Error(
                    "[files.copyMoveFiles] destinationProviderCode cannot be null or empty"
                  );
                if (!l)
                  throw new Error(
                    "[files.copyMoveFiles] callback cannot be null"
                  );
                (0, o.sendMessageToParent)(
                  "files.copyMoveFiles",
                  [e, t, n, r, s],
                  l
                );
              }),
              (e.getFileDownloads = function (e) {
                if (((0, i.ensureInitialized)(a.FrameContexts.content), !e))
                  throw new Error(
                    "[files.getFileDownloads] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)("files.getFileDownloads", [], e);
              }),
              (e.openDownloadFolder = function (e, t) {
                if (
                  (void 0 === e && (e = void 0),
                  (0, i.ensureInitialized)(a.FrameContexts.content),
                  !t)
                )
                  throw new Error(
                    "[files.openDownloadFolder] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)("files.openDownloadFolder", [e], t);
              });
          })(t.files || (t.files = {}));
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.appEntity = void 0);
          var o = n(0),
            i = n(1),
            a = n(8);
          (t.appEntity || (t.appEntity = {})).selectAppEntity = function (
            e,
            t,
            n,
            r
          ) {
            if (
              ((0, i.ensureInitialized)(a.FrameContexts.content),
              !e || 0 == e.length)
            )
              throw new Error(
                "[appEntity.selectAppEntity] threadId name cannot be null or empty"
              );
            if (!r)
              throw new Error(
                "[appEntity.selectAppEntity] Callback cannot be null"
              );
            (0, o.sendMessageToParent)(
              "appEntity.selectAppEntity",
              [e, t, n],
              r
            );
          };
        },
        function (e, t, n) {
          "use strict";
          Object.defineProperty(t, "__esModule", { value: !0 }),
            (t.teams = void 0);
          var o = n(0),
            i = n(1),
            a = n(8);
          !(function (e) {
            !(function (e) {
              (e[(e.Regular = 0)] = "Regular"),
                (e[(e.Private = 1)] = "Private"),
                (e[(e.Shared = 2)] = "Shared");
            })(e.ChannelType || (e.ChannelType = {})),
              (e.getTeamChannels = function (e, t) {
                if (((0, i.ensureInitialized)(a.FrameContexts.content), !e))
                  throw new Error(
                    "[teams.getTeamChannels] groupId cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[teams.getTeamChannels] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)("teams.getTeamChannels", [e], t);
              }),
              (e.refreshSiteUrl = function (e, t) {
                if (((0, i.ensureInitialized)(), !e))
                  throw new Error(
                    "[teams.refreshSiteUrl] threadId cannot be null or empty"
                  );
                if (!t)
                  throw new Error(
                    "[teams.refreshSiteUrl] Callback cannot be null"
                  );
                (0, o.sendMessageToParent)("teams.refreshSiteUrl", [e], t);
              });
          })(t.teams || (t.teams = {}));
        },
      ]));
  }