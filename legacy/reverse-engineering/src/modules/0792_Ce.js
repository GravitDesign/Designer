/**
 * Webpack Module #792
 * Type: class
 * Name: Ce
 */

function (e, t, n) {
    (function (t, o, i) {
      var a;
      (a = function () {
        return (function (e) {
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
                Object.defineProperty(e, Symbol.toStringTag, {
                  value: "Module",
                }),
                Object.defineProperty(e, "__esModule", { value: !0 });
            }),
            (n.t = function (e, t) {
              if ((1 & t && (e = n(e)), 8 & t)) return e;
              if (4 & t && "object" == typeof e && e && e.__esModule) return e;
              var o = Object.create(null);
              if (
                (n.r(o),
                Object.defineProperty(o, "default", {
                  enumerable: !0,
                  value: e,
                }),
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
            n((n.s = 0))
          );
        })([
          function (e, t, n) {
            "use strict";
            var o = n(1),
              i = n(146),
              a = n(162),
              r = n(163),
              s = n(151),
              l = n(164),
              c = n(154),
              d = n(155),
              u = n(156),
              p = n(153);
            if (n(4)()) {
              var g = n(165).PDFNodeStream;
              i.setPDFNetworkStreamFactory(function (e) {
                return new g(e);
              });
            } else if (
              "undefined" != typeof Response &&
              "body" in Response.prototype &&
              "undefined" != typeof ReadableStream
            ) {
              var h = n(168).PDFFetchStream;
              i.setPDFNetworkStreamFactory(function (e) {
                return new h(e);
              });
            } else {
              var f = n(169).PDFNetworkStream;
              i.setPDFNetworkStreamFactory(function (e) {
                return new f(e);
              });
            }
            (t.build = i.build),
              (t.version = i.version),
              (t.getDocument = i.getDocument),
              (t.LoopbackPort = i.LoopbackPort),
              (t.PDFDataRangeTransport = i.PDFDataRangeTransport),
              (t.PDFWorker = i.PDFWorker),
              (t.renderTextLayer = a.renderTextLayer),
              (t.AnnotationLayer = r.AnnotationLayer),
              (t.createPromiseCapability = o.createPromiseCapability),
              (t.PasswordResponses = o.PasswordResponses),
              (t.InvalidPDFException = o.InvalidPDFException),
              (t.MissingPDFException = o.MissingPDFException),
              (t.SVGGraphics = l.SVGGraphics),
              (t.CanvasGraphics = c.CanvasGraphics),
              (t.TilingPattern = d.TilingPattern),
              (t.getShadingPatternFromIR = d.getShadingPatternFromIR),
              (t.NativeImageDecoding = o.NativeImageDecoding),
              (t.CMapCompressionType = o.CMapCompressionType),
              (t.PermissionFlag = o.PermissionFlag),
              (t.UnexpectedResponseException = o.UnexpectedResponseException),
              (t.OPS = o.OPS),
              (t.VerbosityLevel = o.VerbosityLevel),
              (t.UNSUPPORTED_FEATURES = o.UNSUPPORTED_FEATURES),
              (t.createValidAbsoluteUrl = o.createValidAbsoluteUrl),
              (t.createObjectURL = o.createObjectURL),
              (t.removeNullCharacters = o.removeNullCharacters),
              (t.shadow = o.shadow),
              (t.Util = o.Util),
              (t.ReadableStream = o.ReadableStream),
              (t.URL = o.URL),
              (t.RenderingCancelledException = s.RenderingCancelledException),
              (t.getFilenameFromUrl = s.getFilenameFromUrl),
              (t.LinkTarget = s.LinkTarget),
              (t.addLinkAttributes = s.addLinkAttributes),
              (t.loadScript = s.loadScript),
              (t.GlobalWorkerOptions = u.GlobalWorkerOptions),
              (t.apiCompatibilityParams = p.apiCompatibilityParams);
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.toRomanNumerals = function (e) {
                var t =
                  arguments.length > 1 &&
                  void 0 !== arguments[1] &&
                  arguments[1];
                d(
                  Number.isInteger(e) && e > 0,
                  "The number should be a positive integer."
                );
                for (var n, o = []; e >= 1e3; ) (e -= 1e3), o.push("M");
                (n = (e / 100) | 0),
                  (e %= 100),
                  o.push(A[n]),
                  (n = (e / 10) | 0),
                  (e %= 10),
                  o.push(A[10 + n]),
                  o.push(A[20 + e]);
                var i = o.join("");
                return t ? i.toLowerCase() : i;
              }),
              (t.arrayByteLength = x),
              (t.arraysToBytes = function (e) {
                if (1 === e.length && e[0] instanceof Uint8Array) return e[0];
                var t,
                  n,
                  o,
                  i = 0,
                  a = e.length;
                for (t = 0; t < a; t++) (n = e[t]), (o = x(n)), (i += o);
                var r = 0,
                  s = new Uint8Array(i);
                for (t = 0; t < a; t++)
                  (n = e[t]) instanceof Uint8Array ||
                    (n = "string" == typeof n ? C(n) : new Uint8Array(n)),
                    (o = n.byteLength),
                    s.set(n, r),
                    (r += o);
                return s;
              }),
              (t.assert = d),
              (t.bytesToString = function (e) {
                d(
                  null !== e && "object" === a(e) && void 0 !== e.length,
                  "Invalid argument for bytesToString"
                );
                var t = e.length;
                if (t < 8192) return String.fromCharCode.apply(null, e);
                for (var n = [], o = 0; o < t; o += 8192) {
                  var i = Math.min(o + 8192, t),
                    r = e.subarray(o, i);
                  n.push(String.fromCharCode.apply(null, r));
                }
                return n.join("");
              }),
              (t.createPromiseCapability = function () {
                var e = Object.create(null),
                  t = !1;
                return (
                  Object.defineProperty(e, "settled", {
                    get: function () {
                      return t;
                    },
                  }),
                  (e.promise = new Promise(function (n, o) {
                    (e.resolve = function (e) {
                      (t = !0), n(e);
                    }),
                      (e.reject = function (e) {
                        (t = !0), o(e);
                      });
                  })),
                  e
                );
              }),
              (t.deprecated = function (e) {
                console.log("Deprecated API usage: " + e);
              }),
              (t.getInheritableProperty = function (e) {
                for (
                  var t,
                    n = e.dict,
                    o = e.key,
                    i = e.getArray,
                    a = void 0 !== i && i,
                    r = e.stopWhenFound,
                    s = void 0 === r || r,
                    c = 0;
                  n;

                ) {
                  var d = a ? n.getArray(o) : n.get(o);
                  if (void 0 !== d) {
                    if (s) return d;
                    t || (t = []), t.push(d);
                  }
                  if (++c > 100) {
                    l(
                      'getInheritableProperty: maximum loop count exceeded for "'.concat(
                        o,
                        '"'
                      )
                    );
                    break;
                  }
                  n = n.get("Parent");
                }
                return t;
              }),
              (t.getLookupTableFactory = function (e) {
                var t;
                return function () {
                  return e && ((t = Object.create(null)), e(t), (e = null)), t;
                };
              }),
              (t.getVerbosityLevel = function () {
                return s;
              }),
              (t.info = function (e) {
                s >= r.INFOS && console.log("Info: " + e);
              }),
              (t.isArrayBuffer = function (e) {
                return (
                  "object" === a(e) && null !== e && void 0 !== e.byteLength
                );
              }),
              (t.isBool = function (e) {
                return "boolean" == typeof e;
              }),
              (t.isEmptyObj = function (e) {
                for (var t in e) return !1;
                return !0;
              }),
              (t.isNum = function (e) {
                return "number" == typeof e;
              }),
              (t.isString = function (e) {
                return "string" == typeof e;
              }),
              (t.isSpace = function (e) {
                return 32 === e || 9 === e || 13 === e || 10 === e;
              }),
              (t.isSameOrigin = function (e, t) {
                try {
                  var n = new i.URL(e);
                  if (!n.origin || "null" === n.origin) return !1;
                } catch (e) {
                  return !1;
                }
                var o = new i.URL(t, n);
                return n.origin === o.origin;
              }),
              (t.createValidAbsoluteUrl = function (e, t) {
                if (!e) return null;
                try {
                  var n = t ? new i.URL(e, t) : new i.URL(e);
                  if (
                    (function (e) {
                      if (!e) return !1;
                      switch (e.protocol) {
                        case "http:":
                        case "https:":
                        case "ftp:":
                        case "mailto:":
                        case "tel:":
                          return !0;
                        default:
                          return !1;
                      }
                    })(n)
                  )
                    return n;
                } catch (e) {}
                return null;
              }),
              (t.isLittleEndian = function () {
                var e = new Uint8Array(4);
                return (e[0] = 1), 1 === new Uint32Array(e.buffer, 0, 1)[0];
              }),
              (t.isEvalSupported = function () {
                try {
                  return new Function(""), !0;
                } catch (e) {
                  return !1;
                }
              }),
              (t.log2 = function (e) {
                return e <= 0 ? 0 : Math.ceil(Math.log2(e));
              }),
              (t.readInt8 = function (e, t) {
                return (e[t] << 24) >> 24;
              }),
              (t.readUint16 = function (e, t) {
                return (e[t] << 8) | e[t + 1];
              }),
              (t.readUint32 = function (e, t) {
                return (
                  ((e[t] << 24) |
                    (e[t + 1] << 16) |
                    (e[t + 2] << 8) |
                    e[t + 3]) >>>
                  0
                );
              }),
              (t.removeNullCharacters = function (e) {
                return "string" != typeof e
                  ? (l(
                      "The argument for removeNullCharacters must be a string."
                    ),
                    e)
                  : e.replace(w, "");
              }),
              (t.setVerbosityLevel = function (e) {
                Number.isInteger(e) && (s = e);
              }),
              (t.shadow = function (e, t, n) {
                return (
                  Object.defineProperty(e, t, {
                    value: n,
                    enumerable: !0,
                    configurable: !0,
                    writable: !1,
                  }),
                  n
                );
              }),
              (t.string32 = function (e) {
                return String.fromCharCode(
                  (e >> 24) & 255,
                  (e >> 16) & 255,
                  (e >> 8) & 255,
                  255 & e
                );
              }),
              (t.stringToBytes = C),
              (t.stringToPDFString = function (e) {
                var t,
                  n = e.length,
                  o = [];
                if ("þ" === e[0] && "ÿ" === e[1])
                  for (t = 2; t < n; t += 2)
                    o.push(
                      String.fromCharCode(
                        (e.charCodeAt(t) << 8) | e.charCodeAt(t + 1)
                      )
                    );
                else
                  for (t = 0; t < n; ++t) {
                    var i = T[e.charCodeAt(t)];
                    o.push(i ? String.fromCharCode(i) : e.charAt(t));
                  }
                return o.join("");
              }),
              (t.stringToUTF8String = function (e) {
                return decodeURIComponent(escape(e));
              }),
              (t.utf8StringToString = function (e) {
                return unescape(encodeURIComponent(e));
              }),
              (t.warn = l),
              (t.unreachable = c),
              Object.defineProperty(t, "ReadableStream", {
                enumerable: !0,
                get: function () {
                  return o.ReadableStream;
                },
              }),
              Object.defineProperty(t, "URL", {
                enumerable: !0,
                get: function () {
                  return i.URL;
                },
              }),
              (t.createObjectURL =
                t.FormatError =
                t.XRefParseException =
                t.XRefEntryException =
                t.Util =
                t.UnknownErrorException =
                t.UnexpectedResponseException =
                t.TextRenderingMode =
                t.StreamType =
                t.PermissionFlag =
                t.PasswordResponses =
                t.PasswordException =
                t.NativeImageDecoding =
                t.MissingPDFException =
                t.MissingDataException =
                t.InvalidPDFException =
                t.AbortException =
                t.CMapCompressionType =
                t.ImageKind =
                t.FontType =
                t.AnnotationType =
                t.AnnotationFlag =
                t.AnnotationFieldFlag =
                t.AnnotationBorderStyleType =
                t.UNSUPPORTED_FEATURES =
                t.VerbosityLevel =
                t.OPS =
                t.IDENTITY_MATRIX =
                t.FONT_IDENTITY_MATRIX =
                  void 0),
              n(2);
            var o = n(142),
              i = n(144);
            function a(e) {
              return (a =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            (t.IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0]),
              (t.FONT_IDENTITY_MATRIX = [0.001, 0, 0, 0.001, 0, 0]),
              (t.NativeImageDecoding = {
                NONE: "none",
                DECODE: "decode",
                DISPLAY: "display",
              }),
              (t.PermissionFlag = {
                PRINT: 4,
                MODIFY_CONTENTS: 8,
                COPY: 16,
                MODIFY_ANNOTATIONS: 32,
                FILL_INTERACTIVE_FORMS: 256,
                COPY_FOR_ACCESSIBILITY: 512,
                ASSEMBLE: 1024,
                PRINT_HIGH_QUALITY: 2048,
              }),
              (t.TextRenderingMode = {
                FILL: 0,
                STROKE: 1,
                FILL_STROKE: 2,
                INVISIBLE: 3,
                FILL_ADD_TO_PATH: 4,
                STROKE_ADD_TO_PATH: 5,
                FILL_STROKE_ADD_TO_PATH: 6,
                ADD_TO_PATH: 7,
                FILL_STROKE_MASK: 3,
                ADD_TO_PATH_FLAG: 4,
              }),
              (t.ImageKind = {
                GRAYSCALE_1BPP: 1,
                RGB_24BPP: 2,
                RGBA_32BPP: 3,
              }),
              (t.AnnotationType = {
                TEXT: 1,
                LINK: 2,
                FREETEXT: 3,
                LINE: 4,
                SQUARE: 5,
                CIRCLE: 6,
                POLYGON: 7,
                POLYLINE: 8,
                HIGHLIGHT: 9,
                UNDERLINE: 10,
                SQUIGGLY: 11,
                STRIKEOUT: 12,
                STAMP: 13,
                CARET: 14,
                INK: 15,
                POPUP: 16,
                FILEATTACHMENT: 17,
                SOUND: 18,
                MOVIE: 19,
                WIDGET: 20,
                SCREEN: 21,
                PRINTERMARK: 22,
                TRAPNET: 23,
                WATERMARK: 24,
                THREED: 25,
                REDACT: 26,
              }),
              (t.AnnotationFlag = {
                INVISIBLE: 1,
                HIDDEN: 2,
                PRINT: 4,
                NOZOOM: 8,
                NOROTATE: 16,
                NOVIEW: 32,
                READONLY: 64,
                LOCKED: 128,
                TOGGLENOVIEW: 256,
                LOCKEDCONTENTS: 512,
              }),
              (t.AnnotationFieldFlag = {
                READONLY: 1,
                REQUIRED: 2,
                NOEXPORT: 4,
                MULTILINE: 4096,
                PASSWORD: 8192,
                NOTOGGLETOOFF: 16384,
                RADIO: 32768,
                PUSHBUTTON: 65536,
                COMBO: 131072,
                EDIT: 262144,
                SORT: 524288,
                FILESELECT: 1048576,
                MULTISELECT: 2097152,
                DONOTSPELLCHECK: 4194304,
                DONOTSCROLL: 8388608,
                COMB: 16777216,
                RICHTEXT: 33554432,
                RADIOSINUNISON: 33554432,
                COMMITONSELCHANGE: 67108864,
              }),
              (t.AnnotationBorderStyleType = {
                SOLID: 1,
                DASHED: 2,
                BEVELED: 3,
                INSET: 4,
                UNDERLINE: 5,
              }),
              (t.StreamType = {
                UNKNOWN: 0,
                FLATE: 1,
                LZW: 2,
                DCT: 3,
                JPX: 4,
                JBIG: 5,
                A85: 6,
                AHX: 7,
                CCF: 8,
                RL: 9,
              }),
              (t.FontType = {
                UNKNOWN: 0,
                TYPE1: 1,
                TYPE1C: 2,
                CIDFONTTYPE0: 3,
                CIDFONTTYPE0C: 4,
                TRUETYPE: 5,
                CIDFONTTYPE2: 6,
                TYPE3: 7,
                OPENTYPE: 8,
                TYPE0: 9,
                MMTYPE1: 10,
              });
            var r = { ERRORS: 0, WARNINGS: 1, INFOS: 5 };
            (t.VerbosityLevel = r),
              (t.CMapCompressionType = { NONE: 0, BINARY: 1, STREAM: 2 }),
              (t.OPS = {
                dependency: 1,
                setLineWidth: 2,
                setLineCap: 3,
                setLineJoin: 4,
                setMiterLimit: 5,
                setDash: 6,
                setRenderingIntent: 7,
                setFlatness: 8,
                setGState: 9,
                save: 10,
                restore: 11,
                transform: 12,
                moveTo: 13,
                lineTo: 14,
                curveTo: 15,
                curveTo2: 16,
                curveTo3: 17,
                closePath: 18,
                rectangle: 19,
                stroke: 20,
                closeStroke: 21,
                fill: 22,
                eoFill: 23,
                fillStroke: 24,
                eoFillStroke: 25,
                closeFillStroke: 26,
                closeEOFillStroke: 27,
                endPath: 28,
                clip: 29,
                eoClip: 30,
                beginText: 31,
                endText: 32,
                setCharSpacing: 33,
                setWordSpacing: 34,
                setHScale: 35,
                setLeading: 36,
                setFont: 37,
                setTextRenderingMode: 38,
                setTextRise: 39,
                moveText: 40,
                setLeadingMoveText: 41,
                setTextMatrix: 42,
                nextLine: 43,
                showText: 44,
                showSpacedText: 45,
                nextLineShowText: 46,
                nextLineSetSpacingShowText: 47,
                setCharWidth: 48,
                setCharWidthAndBounds: 49,
                setStrokeColorSpace: 50,
                setFillColorSpace: 51,
                setStrokeColor: 52,
                setStrokeColorN: 53,
                setFillColor: 54,
                setFillColorN: 55,
                setStrokeGray: 56,
                setFillGray: 57,
                setStrokeRGBColor: 58,
                setFillRGBColor: 59,
                setStrokeCMYKColor: 60,
                setFillCMYKColor: 61,
                shadingFill: 62,
                beginInlineImage: 63,
                beginImageData: 64,
                endInlineImage: 65,
                paintXObject: 66,
                markPoint: 67,
                markPointProps: 68,
                beginMarkedContent: 69,
                beginMarkedContentProps: 70,
                endMarkedContent: 71,
                beginCompat: 72,
                endCompat: 73,
                paintFormXObjectBegin: 74,
                paintFormXObjectEnd: 75,
                beginGroup: 76,
                endGroup: 77,
                beginAnnotations: 78,
                endAnnotations: 79,
                beginAnnotation: 80,
                endAnnotation: 81,
                paintJpegXObject: 82,
                paintImageMaskXObject: 83,
                paintImageMaskXObjectGroup: 84,
                paintImageXObject: 85,
                paintInlineImageXObject: 86,
                paintInlineImageXObjectGroup: 87,
                paintImageXObjectRepeat: 88,
                paintImageMaskXObjectRepeat: 89,
                paintSolidColorImageMask: 90,
                constructPath: 91,
              }),
              (t.UNSUPPORTED_FEATURES = {
                unknown: "unknown",
                forms: "forms",
                javaScript: "javaScript",
                smask: "smask",
                shadingPattern: "shadingPattern",
                font: "font",
              }),
              (t.PasswordResponses = {
                NEED_PASSWORD: 1,
                INCORRECT_PASSWORD: 2,
              });
            var s = r.WARNINGS;
            function l(e) {
              s >= r.WARNINGS && console.log("Warning: " + e);
            }
            function c(e) {
              throw new Error(e);
            }
            function d(e, t) {
              e || c(t);
            }
            var u = (function () {
              function e(e, t) {
                (this.name = "PasswordException"),
                  (this.message = e),
                  (this.code = t);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.PasswordException = u;
            var p = (function () {
              function e(e, t) {
                (this.name = "UnknownErrorException"),
                  (this.message = e),
                  (this.details = t);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.UnknownErrorException = p;
            var g = (function () {
              function e(e) {
                (this.name = "InvalidPDFException"), (this.message = e);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.InvalidPDFException = g;
            var h = (function () {
              function e(e) {
                (this.name = "MissingPDFException"), (this.message = e);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.MissingPDFException = h;
            var f = (function () {
              function e(e, t) {
                (this.name = "UnexpectedResponseException"),
                  (this.message = e),
                  (this.status = t);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.UnexpectedResponseException = f;
            var m = (function () {
              function e(e, t) {
                (this.begin = e),
                  (this.end = t),
                  (this.message = "Missing data [" + e + ", " + t + ")");
              }
              return (
                (e.prototype = new Error()),
                (e.prototype.name = "MissingDataException"),
                (e.constructor = e),
                e
              );
            })();
            t.MissingDataException = m;
            var y = (function () {
              function e(e) {
                this.message = e;
              }
              return (
                (e.prototype = new Error()),
                (e.prototype.name = "XRefEntryException"),
                (e.constructor = e),
                e
              );
            })();
            t.XRefEntryException = y;
            var v = (function () {
              function e(e) {
                this.message = e;
              }
              return (
                (e.prototype = new Error()),
                (e.prototype.name = "XRefParseException"),
                (e.constructor = e),
                e
              );
            })();
            t.XRefParseException = v;
            var _ = (function () {
              function e(e) {
                this.message = e;
              }
              return (
                (e.prototype = new Error()),
                (e.prototype.name = "FormatError"),
                (e.constructor = e),
                e
              );
            })();
            t.FormatError = _;
            var b = (function () {
              function e(e) {
                (this.name = "AbortException"), (this.message = e);
              }
              return (e.prototype = new Error()), (e.constructor = e), e;
            })();
            t.AbortException = b;
            var w = /\x00/g;
            function C(e) {
              d("string" == typeof e, "Invalid argument for stringToBytes");
              for (var t = e.length, n = new Uint8Array(t), o = 0; o < t; ++o)
                n[o] = 255 & e.charCodeAt(o);
              return n;
            }
            function x(e) {
              return void 0 !== e.length
                ? e.length
                : (d(void 0 !== e.byteLength), e.byteLength);
            }
            var S = (function () {
              function e() {}
              var t = ["rgb(", 0, ",", 0, ",", 0, ")"],
                n = ["cmyk(", 0, "%,", 0, "%,", 0, "%,", 0, "%)"];
              return (
                (e.makeCssRgb = function (e, n, o) {
                  return (t[1] = e), (t[3] = n), (t[5] = o), t.join("");
                }),
                (e.makeCssCMYK = function (e, t, o, i) {
                  return (
                    (n[1] = e), (n[3] = t), (n[5] = o), (n[7] = i), n.join("")
                  );
                }),
                (e.transform = function (e, t) {
                  return [
                    e[0] * t[0] + e[2] * t[1],
                    e[1] * t[0] + e[3] * t[1],
                    e[0] * t[2] + e[2] * t[3],
                    e[1] * t[2] + e[3] * t[3],
                    e[0] * t[4] + e[2] * t[5] + e[4],
                    e[1] * t[4] + e[3] * t[5] + e[5],
                  ];
                }),
                (e.applyTransform = function (e, t) {
                  return [
                    e[0] * t[0] + e[1] * t[2] + t[4],
                    e[0] * t[1] + e[1] * t[3] + t[5],
                  ];
                }),
                (e.applyInverseTransform = function (e, t) {
                  var n = t[0] * t[3] - t[1] * t[2];
                  return [
                    (e[0] * t[3] - e[1] * t[2] + t[2] * t[5] - t[4] * t[3]) / n,
                    (-e[0] * t[1] + e[1] * t[0] + t[4] * t[1] - t[5] * t[0]) /
                      n,
                  ];
                }),
                (e.getAxialAlignedBoundingBox = function (t, n) {
                  var o = e.applyTransform(t, n),
                    i = e.applyTransform(t.slice(2, 4), n),
                    a = e.applyTransform([t[0], t[3]], n),
                    r = e.applyTransform([t[2], t[1]], n);
                  return [
                    Math.min(o[0], i[0], a[0], r[0]),
                    Math.min(o[1], i[1], a[1], r[1]),
                    Math.max(o[0], i[0], a[0], r[0]),
                    Math.max(o[1], i[1], a[1], r[1]),
                  ];
                }),
                (e.inverseTransform = function (e) {
                  var t = e[0] * e[3] - e[1] * e[2];
                  return [
                    e[3] / t,
                    -e[1] / t,
                    -e[2] / t,
                    e[0] / t,
                    (e[2] * e[5] - e[4] * e[3]) / t,
                    (e[4] * e[1] - e[5] * e[0]) / t,
                  ];
                }),
                (e.apply3dTransform = function (e, t) {
                  return [
                    e[0] * t[0] + e[1] * t[1] + e[2] * t[2],
                    e[3] * t[0] + e[4] * t[1] + e[5] * t[2],
                    e[6] * t[0] + e[7] * t[1] + e[8] * t[2],
                  ];
                }),
                (e.singularValueDecompose2dScale = function (e) {
                  var t = [e[0], e[2], e[1], e[3]],
                    n = e[0] * t[0] + e[1] * t[2],
                    o = e[0] * t[1] + e[1] * t[3],
                    i = e[2] * t[0] + e[3] * t[2],
                    a = e[2] * t[1] + e[3] * t[3],
                    r = (n + a) / 2,
                    s = Math.sqrt((n + a) * (n + a) - 4 * (n * a - i * o)) / 2,
                    l = r + s || 1,
                    c = r - s || 1;
                  return [Math.sqrt(l), Math.sqrt(c)];
                }),
                (e.normalizeRect = function (e) {
                  var t = e.slice(0);
                  return (
                    e[0] > e[2] && ((t[0] = e[2]), (t[2] = e[0])),
                    e[1] > e[3] && ((t[1] = e[3]), (t[3] = e[1])),
                    t
                  );
                }),
                (e.intersect = function (t, n) {
                  function o(e, t) {
                    return e - t;
                  }
                  var i = [t[0], t[2], n[0], n[2]].sort(o),
                    a = [t[1], t[3], n[1], n[3]].sort(o),
                    r = [];
                  return (
                    (t = e.normalizeRect(t)),
                    (n = e.normalizeRect(n)),
                    ((i[0] === t[0] && i[1] === n[0]) ||
                      (i[0] === n[0] && i[1] === t[0])) &&
                      ((r[0] = i[1]),
                      (r[2] = i[2]),
                      ((a[0] === t[1] && a[1] === n[1]) ||
                        (a[0] === n[1] && a[1] === t[1])) &&
                        ((r[1] = a[1]), (r[3] = a[2]), r))
                  );
                }),
                e
              );
            })();
            t.Util = S;
            var E,
              A = [
                "",
                "C",
                "CC",
                "CCC",
                "CD",
                "D",
                "DC",
                "DCC",
                "DCCC",
                "CM",
                "",
                "X",
                "XX",
                "XXX",
                "XL",
                "L",
                "LX",
                "LXX",
                "LXXX",
                "XC",
                "",
                "I",
                "II",
                "III",
                "IV",
                "V",
                "VI",
                "VII",
                "VIII",
                "IX",
              ],
              T = [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 728, 711, 710, 729, 733, 731, 730, 732, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 8226, 8224, 8225, 8230, 8212, 8211, 402,
                8260, 8249, 8250, 8722, 8240, 8222, 8220, 8221, 8216, 8217,
                8218, 8482, 64257, 64258, 321, 338, 352, 376, 381, 305, 322,
                339, 353, 382, 0, 8364,
              ],
              G =
                ((E =
                  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="),
                function (e, t) {
                  var n =
                    arguments.length > 2 &&
                    void 0 !== arguments[2] &&
                    arguments[2];
                  if (!n && i.URL.createObjectURL) {
                    var o = new Blob([e], { type: t });
                    return i.URL.createObjectURL(o);
                  }
                  for (
                    var a = "data:" + t + ";base64,", r = 0, s = e.length;
                    r < s;
                    r += 3
                  ) {
                    var l = 255 & e[r],
                      c = 255 & e[r + 1],
                      d = 255 & e[r + 2],
                      u = l >> 2,
                      p = ((3 & l) << 4) | (c >> 4),
                      g = r + 1 < s ? ((15 & c) << 2) | (d >> 6) : 64,
                      h = r + 2 < s ? 63 & d : 64;
                    a += E[u] + E[p] + E[g] + E[h];
                  }
                  return a;
                });
            t.createObjectURL = G;
          },
          function (e, n, o) {
            "use strict";
            function i(e) {
              return (i =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var a = o(3);
            if (!a._pdfjsCompatibilityChecked) {
              a._pdfjsCompatibilityChecked = !0;
              var r = o(4),
                s =
                  "object" ===
                    ("undefined" == typeof window ? "undefined" : i(window)) &&
                  "object" ===
                    ("undefined" == typeof document
                      ? "undefined"
                      : i(document));
              !a.btoa &&
                r() &&
                (a.btoa = function (e) {
                  return t.from(e, "binary").toString("base64");
                }),
                !a.atob &&
                  r() &&
                  (a.atob = function (e) {
                    return t.from(e, "base64").toString("binary");
                  }),
                s &&
                  void 0 === Element.prototype.remove &&
                  (Element.prototype.remove = function () {
                    this.parentNode && this.parentNode.removeChild(this);
                  }),
                (function () {
                  if (s && !r()) {
                    var e = document.createElement("div");
                    if (
                      (e.classList.add("testOne", "testTwo"),
                      !0 !== e.classList.contains("testOne") ||
                        !0 !== e.classList.contains("testTwo"))
                    ) {
                      var t = DOMTokenList.prototype.add,
                        n = DOMTokenList.prototype.remove;
                      (DOMTokenList.prototype.add = function () {
                        for (
                          var e = arguments.length, n = new Array(e), o = 0;
                          o < e;
                          o++
                        )
                          n[o] = arguments[o];
                        for (var i = 0; i < n.length; i++) {
                          var a = n[i];
                          t.call(this, a);
                        }
                      }),
                        (DOMTokenList.prototype.remove = function () {
                          for (
                            var e = arguments.length, t = new Array(e), o = 0;
                            o < e;
                            o++
                          )
                            t[o] = arguments[o];
                          for (var i = 0; i < t.length; i++) {
                            var a = t[i];
                            n.call(this, a);
                          }
                        });
                    }
                  }
                })(),
                s &&
                  !r() &&
                  !1 !==
                    document.createElement("div").classList.toggle("test", 0) &&
                  (DOMTokenList.prototype.toggle = function (e) {
                    var t =
                      arguments.length > 1 ? !!arguments[1] : !this.contains(e);
                    return this[t ? "add" : "remove"](e), t;
                  }),
                String.prototype.startsWith || o(5),
                String.prototype.endsWith || o(35),
                String.prototype.includes || o(37),
                Array.prototype.includes || o(39),
                Array.from || o(46),
                Object.assign || o(69),
                Math.log2 || (Math.log2 = o(74)),
                Number.isNaN || (Number.isNaN = o(76)),
                Number.isInteger || (Number.isInteger = o(78)),
                (a.Promise &&
                  a.Promise.prototype &&
                  a.Promise.prototype.finally) ||
                  (a.Promise = o(81)),
                a.WeakMap || (a.WeakMap = o(101)),
                a.WeakSet || (a.WeakSet = o(118)),
                String.codePointAt || (String.codePointAt = o(122)),
                String.fromCodePoint || (String.fromCodePoint = o(124)),
                a.Symbol || o(126),
                String.prototype.padStart || o(133),
                String.prototype.padEnd || o(137),
                Object.values || (Object.values = o(139));
            }
          },
          function (e, t, n) {
            "use strict";
            e.exports =
              "undefined" != typeof window && window.Math === Math
                ? window
                : void 0 !== o && o.Math === Math
                ? o
                : "undefined" != typeof self && self.Math === Math
                ? self
                : {};
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            e.exports = function () {
              return (
                "object" === (void 0 === i ? "undefined" : o(i)) &&
                i + "" == "[object process]" &&
                !i.versions.nw
              );
            };
          },
          function (e, t, n) {
            "use strict";
            n(6), (e.exports = n(9).String.startsWith);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(25),
              a = n(27),
              r = "".startsWith;
            o(o.P + o.F * n(34)("startsWith"), "String", {
              startsWith: function (e) {
                var t = a(this, e, "startsWith"),
                  n = i(
                    Math.min(
                      arguments.length > 1 ? arguments[1] : void 0,
                      t.length
                    )
                  ),
                  o = String(e);
                return r ? r.call(t, o, n) : t.slice(n, n + o.length) === o;
              },
            });
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(9),
              a = n(10),
              r = n(20),
              s = n(23),
              l = function e(t, n, l) {
                var c,
                  d,
                  u,
                  p,
                  g = t & e.F,
                  h = t & e.G,
                  f = t & e.P,
                  m = t & e.B,
                  y = h
                    ? o
                    : t & e.S
                    ? o[n] || (o[n] = {})
                    : (o[n] || {}).prototype,
                  v = h ? i : i[n] || (i[n] = {}),
                  _ = v.prototype || (v.prototype = {});
                for (c in (h && (l = n), l))
                  (u = ((d = !g && y && void 0 !== y[c]) ? y : l)[c]),
                    (p =
                      m && d
                        ? s(u, o)
                        : f && "function" == typeof u
                        ? s(Function.call, u)
                        : u),
                    y && r(y, c, u, t & e.U),
                    v[c] != u && a(v, c, p),
                    f && _[c] != u && (_[c] = u);
              };
            (o.core = i),
              (l.F = 1),
              (l.G = 2),
              (l.S = 4),
              (l.P = 8),
              (l.B = 16),
              (l.W = 32),
              (l.U = 64),
              (l.R = 128),
              (e.exports = l);
          },
          function (e, t, n) {
            "use strict";
            var o = (e.exports =
              "undefined" != typeof window && window.Math == Math
                ? window
                : "undefined" != typeof self && self.Math == Math
                ? self
                : Function("return this")());
            "number" == typeof __g && (__g = o);
          },
          function (e, t, n) {
            "use strict";
            var o = (e.exports = { version: "2.6.2" });
            "number" == typeof __e && (__e = o);
          },
          function (e, t, n) {
            "use strict";
            var o = n(11),
              i = n(19);
            e.exports = n(15)
              ? function (e, t, n) {
                  return o.f(e, t, i(1, n));
                }
              : function (e, t, n) {
                  return (e[t] = n), e;
                };
          },
          function (e, t, n) {
            "use strict";
            var o = n(12),
              i = n(14),
              a = n(18),
              r = Object.defineProperty;
            t.f = n(15)
              ? Object.defineProperty
              : function (e, t, n) {
                  if ((o(e), (t = a(t, !0)), o(n), i))
                    try {
                      return r(e, t, n);
                    } catch (e) {}
                  if ("get" in n || "set" in n)
                    throw TypeError("Accessors not supported!");
                  return "value" in n && (e[t] = n.value), e;
                };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13);
            e.exports = function (e) {
              if (!o(e)) throw TypeError(e + " is not an object!");
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            e.exports = function (e) {
              return "object" === o(e) ? null !== e : "function" == typeof e;
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports =
              !n(15) &&
              !n(16)(function () {
                return (
                  7 !=
                  Object.defineProperty(n(17)("div"), "a", {
                    get: function () {
                      return 7;
                    },
                  }).a
                );
              });
          },
          function (e, t, n) {
            "use strict";
            e.exports = !n(16)(function () {
              return (
                7 !=
                Object.defineProperty({}, "a", {
                  get: function () {
                    return 7;
                  },
                }).a
              );
            });
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e) {
              try {
                return !!e();
              } catch (e) {
                return !0;
              }
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = n(8).document,
              a = o(i) && o(i.createElement);
            e.exports = function (e) {
              return a ? i.createElement(e) : {};
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13);
            e.exports = function (e, t) {
              if (!o(e)) return e;
              var n, i;
              if (
                t &&
                "function" == typeof (n = e.toString) &&
                !o((i = n.call(e)))
              )
                return i;
              if ("function" == typeof (n = e.valueOf) && !o((i = n.call(e))))
                return i;
              if (
                !t &&
                "function" == typeof (n = e.toString) &&
                !o((i = n.call(e)))
              )
                return i;
              throw TypeError("Can't convert object to primitive value");
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e, t) {
              return {
                enumerable: !(1 & e),
                configurable: !(2 & e),
                writable: !(4 & e),
                value: t,
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(10),
              a = n(21),
              r = n(22)("src"),
              s = Function.toString,
              l = ("" + s).split("toString");
            (n(9).inspectSource = function (e) {
              return s.call(e);
            }),
              (e.exports = function (e, t, n, s) {
                var c = "function" == typeof n;
                c && (a(n, "name") || i(n, "name", t)),
                  e[t] !== n &&
                    (c &&
                      (a(n, r) ||
                        i(n, r, e[t] ? "" + e[t] : l.join(String(t)))),
                    e === o
                      ? (e[t] = n)
                      : s
                      ? e[t]
                        ? (e[t] = n)
                        : i(e, t, n)
                      : (delete e[t], i(e, t, n)));
              })(Function.prototype, "toString", function () {
                return ("function" == typeof this && this[r]) || s.call(this);
              });
          },
          function (e, t, n) {
            "use strict";
            var o = {}.hasOwnProperty;
            e.exports = function (e, t) {
              return o.call(e, t);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = 0,
              i = Math.random();
            e.exports = function (e) {
              return "Symbol(".concat(
                void 0 === e ? "" : e,
                ")_",
                (++o + i).toString(36)
              );
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(24);
            e.exports = function (e, t, n) {
              if ((o(e), void 0 === t)) return e;
              switch (n) {
                case 1:
                  return function (n) {
                    return e.call(t, n);
                  };
                case 2:
                  return function (n, o) {
                    return e.call(t, n, o);
                  };
                case 3:
                  return function (n, o, i) {
                    return e.call(t, n, o, i);
                  };
              }
              return function () {
                return e.apply(t, arguments);
              };
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e) {
              if ("function" != typeof e)
                throw TypeError(e + " is not a function!");
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(26),
              i = Math.min;
            e.exports = function (e) {
              return e > 0 ? i(o(e), 9007199254740991) : 0;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = Math.ceil,
              i = Math.floor;
            e.exports = function (e) {
              return isNaN((e = +e)) ? 0 : (e > 0 ? i : o)(e);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(28),
              i = n(33);
            e.exports = function (e, t, n) {
              if (o(t))
                throw TypeError("String#" + n + " doesn't accept regex!");
              return String(i(e));
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = n(29),
              a = n(30)("match");
            e.exports = function (e) {
              var t;
              return o(e) && (void 0 !== (t = e[a]) ? !!t : "RegExp" == i(e));
            };
          },
          function (e, t, n) {
            "use strict";
            var o = {}.toString;
            e.exports = function (e) {
              return o.call(e).slice(8, -1);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(31)("wks"),
              i = n(22),
              a = n(8).Symbol,
              r = "function" == typeof a;
            (e.exports = function (e) {
              return o[e] || (o[e] = (r && a[e]) || (r ? a : i)("Symbol." + e));
            }).store = o;
          },
          function (e, t, n) {
            "use strict";
            var o = n(9),
              i = n(8),
              a = i["__core-js_shared__"] || (i["__core-js_shared__"] = {});
            (e.exports = function (e, t) {
              return a[e] || (a[e] = void 0 !== t ? t : {});
            })("versions", []).push({
              version: o.version,
              mode: n(32) ? "pure" : "global",
              copyright: "© 2019 Denis Pushkarev (zloirock.ru)",
            });
          },
          function (e, t, n) {
            "use strict";
            e.exports = !1;
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e) {
              if (null == e) throw TypeError("Can't call method on  " + e);
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(30)("match");
            e.exports = function (e) {
              var t = /./;
              try {
                "/./"[e](t);
              } catch (n) {
                try {
                  return (t[o] = !1), !"/./"[e](t);
                } catch (e) {}
              }
              return !0;
            };
          },
          function (e, t, n) {
            "use strict";
            n(36), (e.exports = n(9).String.endsWith);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(25),
              a = n(27),
              r = "".endsWith;
            o(o.P + o.F * n(34)("endsWith"), "String", {
              endsWith: function (e) {
                var t = a(this, e, "endsWith"),
                  n = arguments.length > 1 ? arguments[1] : void 0,
                  o = i(t.length),
                  s = void 0 === n ? o : Math.min(i(n), o),
                  l = String(e);
                return r ? r.call(t, l, s) : t.slice(s - l.length, s) === l;
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(38), (e.exports = n(9).String.includes);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(27);
            o(o.P + o.F * n(34)("includes"), "String", {
              includes: function (e) {
                return !!~i(this, e, "includes").indexOf(
                  e,
                  arguments.length > 1 ? arguments[1] : void 0
                );
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(40), (e.exports = n(9).Array.includes);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(41)(!0);
            o(o.P, "Array", {
              includes: function (e) {
                return i(this, e, arguments.length > 1 ? arguments[1] : void 0);
              },
            }),
              n(45)("includes");
          },
          function (e, t, n) {
            "use strict";
            var o = n(42),
              i = n(25),
              a = n(44);
            e.exports = function (e) {
              return function (t, n, r) {
                var s,
                  l = o(t),
                  c = i(l.length),
                  d = a(r, c);
                if (e && n != n) {
                  for (; c > d; ) if ((s = l[d++]) != s) return !0;
                } else
                  for (; c > d; d++)
                    if ((e || d in l) && l[d] === n) return e || d || 0;
                return !e && -1;
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(43),
              i = n(33);
            e.exports = function (e) {
              return o(i(e));
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(29);
            e.exports = Object("z").propertyIsEnumerable(0)
              ? Object
              : function (e) {
                  return "String" == o(e) ? e.split("") : Object(e);
                };
          },
          function (e, t, n) {
            "use strict";
            var o = n(26),
              i = Math.max,
              a = Math.min;
            e.exports = function (e, t) {
              return (e = o(e)) < 0 ? i(e + t, 0) : a(e, t);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(30)("unscopables"),
              i = Array.prototype;
            null == i[o] && n(10)(i, o, {}),
              (e.exports = function (e) {
                i[o][e] = !0;
              });
          },
          function (e, t, n) {
            "use strict";
            n(47), n(62), (e.exports = n(9).Array.from);
          },
          function (e, t, n) {
            "use strict";
            var o = n(48)(!0);
            n(49)(
              String,
              "String",
              function (e) {
                (this._t = String(e)), (this._i = 0);
              },
              function () {
                var e,
                  t = this._t,
                  n = this._i;
                return n >= t.length
                  ? { value: void 0, done: !0 }
                  : ((e = o(t, n)),
                    (this._i += e.length),
                    { value: e, done: !1 });
              }
            );
          },
          function (e, t, n) {
            "use strict";
            var o = n(26),
              i = n(33);
            e.exports = function (e) {
              return function (t, n) {
                var a,
                  r,
                  s = String(i(t)),
                  l = o(n),
                  c = s.length;
                return l < 0 || l >= c
                  ? e
                    ? ""
                    : void 0
                  : (a = s.charCodeAt(l)) < 55296 ||
                    a > 56319 ||
                    l + 1 === c ||
                    (r = s.charCodeAt(l + 1)) < 56320 ||
                    r > 57343
                  ? e
                    ? s.charAt(l)
                    : a
                  : e
                  ? s.slice(l, l + 2)
                  : r - 56320 + ((a - 55296) << 10) + 65536;
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(32),
              i = n(7),
              a = n(20),
              r = n(10),
              s = n(50),
              l = n(51),
              c = n(59),
              d = n(60),
              u = n(30)("iterator"),
              p = !([].keys && "next" in [].keys()),
              g = function () {
                return this;
              };
            e.exports = function (e, t, n, h, f, m, y) {
              l(n, t, h);
              var v,
                _,
                b,
                w = function (e) {
                  if (!p && e in E) return E[e];
                  switch (e) {
                    case "keys":
                    case "values":
                      return function () {
                        return new n(this, e);
                      };
                  }
                  return function () {
                    return new n(this, e);
                  };
                },
                C = t + " Iterator",
                x = "values" == f,
                S = !1,
                E = e.prototype,
                A = E[u] || E["@@iterator"] || (f && E[f]),
                T = A || w(f),
                G = f ? (x ? w("entries") : T) : void 0,
                P = ("Array" == t && E.entries) || A;
              if (
                (P &&
                  (b = d(P.call(new e()))) !== Object.prototype &&
                  b.next &&
                  (c(b, C, !0), o || "function" == typeof b[u] || r(b, u, g)),
                x &&
                  A &&
                  "values" !== A.name &&
                  ((S = !0),
                  (T = function () {
                    return A.call(this);
                  })),
                (o && !y) || (!p && !S && E[u]) || r(E, u, T),
                (s[t] = T),
                (s[C] = g),
                f)
              )
                if (
                  ((v = {
                    values: x ? T : w("values"),
                    keys: m ? T : w("keys"),
                    entries: G,
                  }),
                  y)
                )
                  for (_ in v) _ in E || a(E, _, v[_]);
                else i(i.P + i.F * (p || S), t, v);
              return v;
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports = {};
          },
          function (e, t, n) {
            "use strict";
            var o = n(52),
              i = n(19),
              a = n(59),
              r = {};
            n(10)(r, n(30)("iterator"), function () {
              return this;
            }),
              (e.exports = function (e, t, n) {
                (e.prototype = o(r, { next: i(1, n) })), a(e, t + " Iterator");
              });
          },
          function (e, t, n) {
            "use strict";
            var o = n(12),
              i = n(53),
              a = n(57),
              r = n(56)("IE_PROTO"),
              s = function () {},
              l = function () {
                var e,
                  t = n(17)("iframe"),
                  o = a.length;
                for (
                  t.style.display = "none",
                    n(58).appendChild(t),
                    t.src = "javascript:",
                    (e = t.contentWindow.document).open(),
                    e.write("<script>document.F=Object</script>"),
                    e.close(),
                    l = e.F;
                  o--;

                )
                  delete l.prototype[a[o]];
                return l();
              };
            e.exports =
              Object.create ||
              function (e, t) {
                var n;
                return (
                  null !== e
                    ? ((s.prototype = o(e)),
                      (n = new s()),
                      (s.prototype = null),
                      (n[r] = e))
                    : (n = l()),
                  void 0 === t ? n : i(n, t)
                );
              };
          },
          function (e, t, n) {
            "use strict";
            var o = n(11),
              i = n(12),
              a = n(54);
            e.exports = n(15)
              ? Object.defineProperties
              : function (e, t) {
                  i(e);
                  for (var n, r = a(t), s = r.length, l = 0; s > l; )
                    o.f(e, (n = r[l++]), t[n]);
                  return e;
                };
          },
          function (e, t, n) {
            "use strict";
            var o = n(55),
              i = n(57);
            e.exports =
              Object.keys ||
              function (e) {
                return o(e, i);
              };
          },
          function (e, t, n) {
            "use strict";
            var o = n(21),
              i = n(42),
              a = n(41)(!1),
              r = n(56)("IE_PROTO");
            e.exports = function (e, t) {
              var n,
                s = i(e),
                l = 0,
                c = [];
              for (n in s) n != r && o(s, n) && c.push(n);
              for (; t.length > l; )
                o(s, (n = t[l++])) && (~a(c, n) || c.push(n));
              return c;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(31)("keys"),
              i = n(22);
            e.exports = function (e) {
              return o[e] || (o[e] = i(e));
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports =
              "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(
                ","
              );
          },
          function (e, t, n) {
            "use strict";
            var o = n(8).document;
            e.exports = o && o.documentElement;
          },
          function (e, t, n) {
            "use strict";
            var o = n(11).f,
              i = n(21),
              a = n(30)("toStringTag");
            e.exports = function (e, t, n) {
              e &&
                !i((e = n ? e : e.prototype), a) &&
                o(e, a, { configurable: !0, value: t });
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(21),
              i = n(61),
              a = n(56)("IE_PROTO"),
              r = Object.prototype;
            e.exports =
              Object.getPrototypeOf ||
              function (e) {
                return (
                  (e = i(e)),
                  o(e, a)
                    ? e[a]
                    : "function" == typeof e.constructor &&
                      e instanceof e.constructor
                    ? e.constructor.prototype
                    : e instanceof Object
                    ? r
                    : null
                );
              };
          },
          function (e, t, n) {
            "use strict";
            var o = n(33);
            e.exports = function (e) {
              return Object(o(e));
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(23),
              i = n(7),
              a = n(61),
              r = n(63),
              s = n(64),
              l = n(25),
              c = n(65),
              d = n(66);
            i(
              i.S +
                i.F *
                  !n(68)(function (e) {
                    Array.from(e);
                  }),
              "Array",
              {
                from: function (e) {
                  var t,
                    n,
                    i,
                    u,
                    p = a(e),
                    g = "function" == typeof this ? this : Array,
                    h = arguments.length,
                    f = h > 1 ? arguments[1] : void 0,
                    m = void 0 !== f,
                    y = 0,
                    v = d(p);
                  if (
                    (m && (f = o(f, h > 2 ? arguments[2] : void 0, 2)),
                    null == v || (g == Array && s(v)))
                  )
                    for (n = new g((t = l(p.length))); t > y; y++)
                      c(n, y, m ? f(p[y], y) : p[y]);
                  else
                    for (u = v.call(p), n = new g(); !(i = u.next()).done; y++)
                      c(n, y, m ? r(u, f, [i.value, y], !0) : i.value);
                  return (n.length = y), n;
                },
              }
            );
          },
          function (e, t, n) {
            "use strict";
            var o = n(12);
            e.exports = function (e, t, n, i) {
              try {
                return i ? t(o(n)[0], n[1]) : t(n);
              } catch (t) {
                var a = e.return;
                throw (void 0 !== a && o(a.call(e)), t);
              }
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(50),
              i = n(30)("iterator"),
              a = Array.prototype;
            e.exports = function (e) {
              return void 0 !== e && (o.Array === e || a[i] === e);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(11),
              i = n(19);
            e.exports = function (e, t, n) {
              t in e ? o.f(e, t, i(0, n)) : (e[t] = n);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(67),
              i = n(30)("iterator"),
              a = n(50);
            e.exports = n(9).getIteratorMethod = function (e) {
              if (null != e) return e[i] || e["@@iterator"] || a[o(e)];
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(29),
              i = n(30)("toStringTag"),
              a =
                "Arguments" ==
                o(
                  (function () {
                    return arguments;
                  })()
                );
            e.exports = function (e) {
              var t, n, r;
              return void 0 === e
                ? "Undefined"
                : null === e
                ? "Null"
                : "string" ==
                  typeof (n = (function (e, t) {
                    try {
                      return e[t];
                    } catch (e) {}
                  })((t = Object(e)), i))
                ? n
                : a
                ? o(t)
                : "Object" == (r = o(t)) && "function" == typeof t.callee
                ? "Arguments"
                : r;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(30)("iterator"),
              i = !1;
            try {
              var a = [7][o]();
              (a.return = function () {
                i = !0;
              }),
                Array.from(a, function () {
                  throw 2;
                });
            } catch (e) {}
            e.exports = function (e, t) {
              if (!t && !i) return !1;
              var n = !1;
              try {
                var a = [7],
                  r = a[o]();
                (r.next = function () {
                  return { done: (n = !0) };
                }),
                  (a[o] = function () {
                    return r;
                  }),
                  e(a);
              } catch (e) {}
              return n;
            };
          },
          function (e, t, n) {
            "use strict";
            n(70), (e.exports = n(9).Object.assign);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7);
            o(o.S + o.F, "Object", { assign: n(71) });
          },
          function (e, t, n) {
            "use strict";
            var o = n(54),
              i = n(72),
              a = n(73),
              r = n(61),
              s = n(43),
              l = Object.assign;
            e.exports =
              !l ||
              n(16)(function () {
                var e = {},
                  t = {},
                  n = Symbol(),
                  o = "abcdefghijklmnopqrst";
                return (
                  (e[n] = 7),
                  o.split("").forEach(function (e) {
                    t[e] = e;
                  }),
                  7 != l({}, e)[n] || Object.keys(l({}, t)).join("") != o
                );
              })
                ? function (e, t) {
                    for (
                      var n = r(e),
                        l = arguments.length,
                        c = 1,
                        d = i.f,
                        u = a.f;
                      l > c;

                    )
                      for (
                        var p,
                          g = s(arguments[c++]),
                          h = d ? o(g).concat(d(g)) : o(g),
                          f = h.length,
                          m = 0;
                        f > m;

                      )
                        u.call(g, (p = h[m++])) && (n[p] = g[p]);
                    return n;
                  }
                : l;
          },
          function (e, t, n) {
            "use strict";
            t.f = Object.getOwnPropertySymbols;
          },
          function (e, t, n) {
            "use strict";
            t.f = {}.propertyIsEnumerable;
          },
          function (e, t, n) {
            "use strict";
            n(75), (e.exports = n(9).Math.log2);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7);
            o(o.S, "Math", {
              log2: function (e) {
                return Math.log(e) / Math.LN2;
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(77), (e.exports = n(9).Number.isNaN);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7);
            o(o.S, "Number", {
              isNaN: function (e) {
                return e != e;
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(79), (e.exports = n(9).Number.isInteger);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7);
            o(o.S, "Number", { isInteger: n(80) });
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = Math.floor;
            e.exports = function (e) {
              return !o(e) && isFinite(e) && i(e) === e;
            };
          },
          function (e, t, n) {
            "use strict";
            n(82),
              n(47),
              n(83),
              n(86),
              n(99),
              n(100),
              (e.exports = n(9).Promise);
          },
          function (e, t, n) {
            "use strict";
            var o = n(67),
              i = {};
            (i[n(30)("toStringTag")] = "z"),
              i + "" != "[object z]" &&
                n(20)(
                  Object.prototype,
                  "toString",
                  function () {
                    return "[object " + o(this) + "]";
                  },
                  !0
                );
          },
          function (e, t, n) {
            "use strict";
            for (
              var o = n(84),
                i = n(54),
                a = n(20),
                r = n(8),
                s = n(10),
                l = n(50),
                c = n(30),
                d = c("iterator"),
                u = c("toStringTag"),
                p = l.Array,
                g = {
                  CSSRuleList: !0,
                  CSSStyleDeclaration: !1,
                  CSSValueList: !1,
                  ClientRectList: !1,
                  DOMRectList: !1,
                  DOMStringList: !1,
                  DOMTokenList: !0,
                  DataTransferItemList: !1,
                  FileList: !1,
                  HTMLAllCollection: !1,
                  HTMLCollection: !1,
                  HTMLFormElement: !1,
                  HTMLSelectElement: !1,
                  MediaList: !0,
                  MimeTypeArray: !1,
                  NamedNodeMap: !1,
                  NodeList: !0,
                  PaintRequestList: !1,
                  Plugin: !1,
                  PluginArray: !1,
                  SVGLengthList: !1,
                  SVGNumberList: !1,
                  SVGPathSegList: !1,
                  SVGPointList: !1,
                  SVGStringList: !1,
                  SVGTransformList: !1,
                  SourceBufferList: !1,
                  StyleSheetList: !0,
                  TextTrackCueList: !1,
                  TextTrackList: !1,
                  TouchList: !1,
                },
                h = i(g),
                f = 0;
              f < h.length;
              f++
            ) {
              var m,
                y = h[f],
                v = g[y],
                _ = r[y],
                b = _ && _.prototype;
              if (b && (b[d] || s(b, d, p), b[u] || s(b, u, y), (l[y] = p), v))
                for (m in o) b[m] || a(b, m, o[m], !0);
            }
          },
          function (e, t, n) {
            "use strict";
            var o = n(45),
              i = n(85),
              a = n(50),
              r = n(42);
            (e.exports = n(49)(
              Array,
              "Array",
              function (e, t) {
                (this._t = r(e)), (this._i = 0), (this._k = t);
              },
              function () {
                var e = this._t,
                  t = this._k,
                  n = this._i++;
                return !e || n >= e.length
                  ? ((this._t = void 0), i(1))
                  : i(0, "keys" == t ? n : "values" == t ? e[n] : [n, e[n]]);
              },
              "values"
            )),
              (a.Arguments = a.Array),
              o("keys"),
              o("values"),
              o("entries");
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e, t) {
              return { value: t, done: !!e };
            };
          },
          function (e, t, n) {
            "use strict";
            var o,
              i,
              a,
              r,
              s = n(32),
              l = n(8),
              c = n(23),
              d = n(67),
              u = n(7),
              p = n(13),
              g = n(24),
              h = n(87),
              f = n(88),
              m = n(89),
              y = n(90).set,
              v = n(92)(),
              _ = n(93),
              b = n(94),
              w = n(95),
              C = n(96),
              x = l.TypeError,
              S = l.process,
              E = S && S.versions,
              A = (E && E.v8) || "",
              T = l.Promise,
              G = "process" == d(S),
              P = function () {},
              D = (i = _.f),
              L = !!(function () {
                try {
                  var e = T.resolve(1),
                    t = ((e.constructor = {})[n(30)("species")] = function (e) {
                      e(P, P);
                    });
                  return (
                    (G || "function" == typeof PromiseRejectionEvent) &&
                    e.then(P) instanceof t &&
                    0 !== A.indexOf("6.6") &&
                    -1 === w.indexOf("Chrome/66")
                  );
                } catch (e) {}
              })(),
              I = function (e) {
                var t;
                return !(!p(e) || "function" != typeof (t = e.then)) && t;
              },
              k = function (e, t) {
                if (!e._n) {
                  e._n = !0;
                  var n = e._c;
                  v(function () {
                    for (
                      var o = e._v,
                        i = 1 == e._s,
                        a = 0,
                        r = function (t) {
                          var n,
                            a,
                            r,
                            s = i ? t.ok : t.fail,
                            l = t.resolve,
                            c = t.reject,
                            d = t.domain;
                          try {
                            s
                              ? (i || (2 == e._h && R(e), (e._h = 1)),
                                !0 === s
                                  ? (n = o)
                                  : (d && d.enter(),
                                    (n = s(o)),
                                    d && (d.exit(), (r = !0))),
                                n === t.promise
                                  ? c(x("Promise-chain cycle"))
                                  : (a = I(n))
                                  ? a.call(n, l, c)
                                  : l(n))
                              : c(o);
                          } catch (e) {
                            d && !r && d.exit(), c(e);
                          }
                        };
                      n.length > a;

                    )
                      r(n[a++]);
                    (e._c = []), (e._n = !1), t && !e._h && O(e);
                  });
                }
              },
              O = function (e) {
                y.call(l, function () {
                  var t,
                    n,
                    o,
                    i = e._v,
                    a = F(e);
                  if (
                    (a &&
                      ((t = b(function () {
                        G
                          ? S.emit("unhandledRejection", i, e)
                          : (n = l.onunhandledrejection)
                          ? n({ promise: e, reason: i })
                          : (o = l.console) &&
                            o.error &&
                            o.error("Unhandled promise rejection", i);
                      })),
                      (e._h = G || F(e) ? 2 : 1)),
                    (e._a = void 0),
                    a && t.e)
                  )
                    throw t.v;
                });
              },
              F = function (e) {
                return 1 !== e._h && 0 === (e._a || e._c).length;
              },
              R = function (e) {
                y.call(l, function () {
                  var t;
                  G
                    ? S.emit("rejectionHandled", e)
                    : (t = l.onrejectionhandled) &&
                      t({ promise: e, reason: e._v });
                });
              },
              M = function (e) {
                var t = this;
                t._d ||
                  ((t._d = !0),
                  ((t = t._w || t)._v = e),
                  (t._s = 2),
                  t._a || (t._a = t._c.slice()),
                  k(t, !0));
              },
              N = function e(t) {
                var n,
                  o = this;
                if (!o._d) {
                  (o._d = !0), (o = o._w || o);
                  try {
                    if (o === t) throw x("Promise can't be resolved itself");
                    (n = I(t))
                      ? v(function () {
                          var i = { _w: o, _d: !1 };
                          try {
                            n.call(t, c(e, i, 1), c(M, i, 1));
                          } catch (e) {
                            M.call(i, e);
                          }
                        })
                      : ((o._v = t), (o._s = 1), k(o, !1));
                  } catch (e) {
                    M.call({ _w: o, _d: !1 }, e);
                  }
                }
              };
            L ||
              ((T = function (e) {
                h(this, T, "Promise", "_h"), g(e), o.call(this);
                try {
                  e(c(N, this, 1), c(M, this, 1));
                } catch (e) {
                  M.call(this, e);
                }
              }),
              ((o = function (e) {
                (this._c = []),
                  (this._a = void 0),
                  (this._s = 0),
                  (this._d = !1),
                  (this._v = void 0),
                  (this._h = 0),
                  (this._n = !1);
              }).prototype = n(97)(T.prototype, {
                then: function (e, t) {
                  var n = D(m(this, T));
                  return (
                    (n.ok = "function" != typeof e || e),
                    (n.fail = "function" == typeof t && t),
                    (n.domain = G ? S.domain : void 0),
                    this._c.push(n),
                    this._a && this._a.push(n),
                    this._s && k(this, !1),
                    n.promise
                  );
                },
                catch: function (e) {
                  return this.then(void 0, e);
                },
              })),
              (a = function () {
                var e = new o();
                (this.promise = e),
                  (this.resolve = c(N, e, 1)),
                  (this.reject = c(M, e, 1));
              }),
              (_.f = D =
                function (e) {
                  return e === T || e === r ? new a(e) : i(e);
                })),
              u(u.G + u.W + u.F * !L, { Promise: T }),
              n(59)(T, "Promise"),
              n(98)("Promise"),
              (r = n(9).Promise),
              u(u.S + u.F * !L, "Promise", {
                reject: function (e) {
                  var t = D(this);
                  return (0, t.reject)(e), t.promise;
                },
              }),
              u(u.S + u.F * (s || !L), "Promise", {
                resolve: function (e) {
                  return C(s && this === r ? T : this, e);
                },
              }),
              u(
                u.S +
                  u.F *
                    !(
                      L &&
                      n(68)(function (e) {
                        T.all(e).catch(P);
                      })
                    ),
                "Promise",
                {
                  all: function (e) {
                    var t = this,
                      n = D(t),
                      o = n.resolve,
                      i = n.reject,
                      a = b(function () {
                        var n = [],
                          a = 0,
                          r = 1;
                        f(e, !1, function (e) {
                          var s = a++,
                            l = !1;
                          n.push(void 0),
                            r++,
                            t.resolve(e).then(function (e) {
                              l || ((l = !0), (n[s] = e), --r || o(n));
                            }, i);
                        }),
                          --r || o(n);
                      });
                    return a.e && i(a.v), n.promise;
                  },
                  race: function (e) {
                    var t = this,
                      n = D(t),
                      o = n.reject,
                      i = b(function () {
                        f(e, !1, function (e) {
                          t.resolve(e).then(n.resolve, o);
                        });
                      });
                    return i.e && o(i.v), n.promise;
                  },
                }
              );
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e, t, n, o) {
              if (!(e instanceof t) || (void 0 !== o && o in e))
                throw TypeError(n + ": incorrect invocation!");
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(23),
              i = n(63),
              a = n(64),
              r = n(12),
              s = n(25),
              l = n(66),
              c = {},
              d = {},
              u = (e.exports = function (e, t, n, u, p) {
                var g,
                  h,
                  f,
                  m,
                  y = p
                    ? function () {
                        return e;
                      }
                    : l(e),
                  v = o(n, u, t ? 2 : 1),
                  _ = 0;
                if ("function" != typeof y)
                  throw TypeError(e + " is not iterable!");
                if (a(y)) {
                  for (g = s(e.length); g > _; _++)
                    if (
                      (m = t ? v(r((h = e[_]))[0], h[1]) : v(e[_])) === c ||
                      m === d
                    )
                      return m;
                } else
                  for (f = y.call(e); !(h = f.next()).done; )
                    if ((m = i(f, v, h.value, t)) === c || m === d) return m;
              });
            (u.BREAK = c), (u.RETURN = d);
          },
          function (e, t, n) {
            "use strict";
            var o = n(12),
              i = n(24),
              a = n(30)("species");
            e.exports = function (e, t) {
              var n,
                r = o(e).constructor;
              return void 0 === r || null == (n = o(r)[a]) ? t : i(n);
            };
          },
          function (e, t, n) {
            "use strict";
            var o,
              i,
              a,
              r = n(23),
              s = n(91),
              l = n(58),
              c = n(17),
              d = n(8),
              u = d.process,
              p = d.setImmediate,
              g = d.clearImmediate,
              h = d.MessageChannel,
              f = d.Dispatch,
              m = 0,
              y = {},
              v = function () {
                var e = +this;
                if (y.hasOwnProperty(e)) {
                  var t = y[e];
                  delete y[e], t();
                }
              },
              _ = function (e) {
                v.call(e.data);
              };
            (p && g) ||
              ((p = function (e) {
                for (var t = [], n = 1; arguments.length > n; )
                  t.push(arguments[n++]);
                return (
                  (y[++m] = function () {
                    s("function" == typeof e ? e : Function(e), t);
                  }),
                  o(m),
                  m
                );
              }),
              (g = function (e) {
                delete y[e];
              }),
              "process" == n(29)(u)
                ? (o = function (e) {
                    u.nextTick(r(v, e, 1));
                  })
                : f && f.now
                ? (o = function (e) {
                    f.now(r(v, e, 1));
                  })
                : h
                ? ((a = (i = new h()).port2),
                  (i.port1.onmessage = _),
                  (o = r(a.postMessage, a, 1)))
                : d.addEventListener &&
                  "function" == typeof postMessage &&
                  !d.importScripts
                ? ((o = function (e) {
                    d.postMessage(e + "", "*");
                  }),
                  d.addEventListener("message", _, !1))
                : (o =
                    "onreadystatechange" in c("script")
                      ? function (e) {
                          l.appendChild(c("script")).onreadystatechange =
                            function () {
                              l.removeChild(this), v.call(e);
                            };
                        }
                      : function (e) {
                          setTimeout(r(v, e, 1), 0);
                        })),
              (e.exports = { set: p, clear: g });
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e, t, n) {
              var o = void 0 === n;
              switch (t.length) {
                case 0:
                  return o ? e() : e.call(n);
                case 1:
                  return o ? e(t[0]) : e.call(n, t[0]);
                case 2:
                  return o ? e(t[0], t[1]) : e.call(n, t[0], t[1]);
                case 3:
                  return o ? e(t[0], t[1], t[2]) : e.call(n, t[0], t[1], t[2]);
                case 4:
                  return o
                    ? e(t[0], t[1], t[2], t[3])
                    : e.call(n, t[0], t[1], t[2], t[3]);
              }
              return e.apply(n, t);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(90).set,
              a = o.MutationObserver || o.WebKitMutationObserver,
              r = o.process,
              s = o.Promise,
              l = "process" == n(29)(r);
            e.exports = function () {
              var e,
                t,
                n,
                c = function () {
                  var o, i;
                  for (l && (o = r.domain) && o.exit(); e; ) {
                    (i = e.fn), (e = e.next);
                    try {
                      i();
                    } catch (o) {
                      throw (e ? n() : (t = void 0), o);
                    }
                  }
                  (t = void 0), o && o.enter();
                };
              if (l)
                n = function () {
                  r.nextTick(c);
                };
              else if (!a || (o.navigator && o.navigator.standalone))
                if (s && s.resolve) {
                  var d = s.resolve(void 0);
                  n = function () {
                    d.then(c);
                  };
                } else
                  n = function () {
                    i.call(o, c);
                  };
              else {
                var u = !0,
                  p = document.createTextNode("");
                new a(c).observe(p, { characterData: !0 }),
                  (n = function () {
                    p.data = u = !u;
                  });
              }
              return function (o) {
                var i = { fn: o, next: void 0 };
                t && (t.next = i), e || ((e = i), n()), (t = i);
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(24);
            function i(e) {
              var t, n;
              (this.promise = new e(function (e, o) {
                if (void 0 !== t || void 0 !== n)
                  throw TypeError("Bad Promise constructor");
                (t = e), (n = o);
              })),
                (this.resolve = o(t)),
                (this.reject = o(n));
            }
            e.exports.f = function (e) {
              return new i(e);
            };
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e) {
              try {
                return { e: !1, v: e() };
              } catch (e) {
                return { e: !0, v: e };
              }
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(8).navigator;
            e.exports = (o && o.userAgent) || "";
          },
          function (e, t, n) {
            "use strict";
            var o = n(12),
              i = n(13),
              a = n(93);
            e.exports = function (e, t) {
              if ((o(e), i(t) && t.constructor === e)) return t;
              var n = a.f(e);
              return (0, n.resolve)(t), n.promise;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(20);
            e.exports = function (e, t, n) {
              for (var i in t) o(e, i, t[i], n);
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(11),
              a = n(15),
              r = n(30)("species");
            e.exports = function (e) {
              var t = o[e];
              a &&
                t &&
                !t[r] &&
                i.f(t, r, {
                  configurable: !0,
                  get: function () {
                    return this;
                  },
                });
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(9),
              a = n(8),
              r = n(89),
              s = n(96);
            o(o.P + o.R, "Promise", {
              finally: function (e) {
                var t = r(this, i.Promise || a.Promise),
                  n = "function" == typeof e;
                return this.then(
                  n
                    ? function (n) {
                        return s(t, e()).then(function () {
                          return n;
                        });
                      }
                    : e,
                  n
                    ? function (n) {
                        return s(t, e()).then(function () {
                          throw n;
                        });
                      }
                    : e
                );
              },
            });
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(93),
              a = n(94);
            o(o.S, "Promise", {
              try: function (e) {
                var t = i.f(this),
                  n = a(e);
                return (n.e ? t.reject : t.resolve)(n.v), t.promise;
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(82), n(83), n(102), n(114), n(116), (e.exports = n(9).WeakMap);
          },
          function (e, t, n) {
            "use strict";
            var o,
              i = n(103)(0),
              a = n(20),
              r = n(107),
              s = n(71),
              l = n(108),
              c = n(13),
              d = n(16),
              u = n(109),
              p = r.getWeak,
              g = Object.isExtensible,
              h = l.ufstore,
              f = {},
              m = function (e) {
                return function () {
                  return e(this, arguments.length > 0 ? arguments[0] : void 0);
                };
              },
              y = {
                get: function (e) {
                  if (c(e)) {
                    var t = p(e);
                    return !0 === t
                      ? h(u(this, "WeakMap")).get(e)
                      : t
                      ? t[this._i]
                      : void 0;
                  }
                },
                set: function (e, t) {
                  return l.def(u(this, "WeakMap"), e, t);
                },
              },
              v = (e.exports = n(110)("WeakMap", m, y, l, !0, !0));
            d(function () {
              return 7 != new v().set((Object.freeze || Object)(f), 7).get(f);
            }) &&
              (s((o = l.getConstructor(m, "WeakMap")).prototype, y),
              (r.NEED = !0),
              i(["delete", "has", "get", "set"], function (e) {
                var t = v.prototype,
                  n = t[e];
                a(t, e, function (t, i) {
                  if (c(t) && !g(t)) {
                    this._f || (this._f = new o());
                    var a = this._f[e](t, i);
                    return "set" == e ? this : a;
                  }
                  return n.call(this, t, i);
                });
              }));
          },
          function (e, t, n) {
            "use strict";
            var o = n(23),
              i = n(43),
              a = n(61),
              r = n(25),
              s = n(104);
            e.exports = function (e, t) {
              var n = 1 == e,
                l = 2 == e,
                c = 3 == e,
                d = 4 == e,
                u = 6 == e,
                p = 5 == e || u,
                g = t || s;
              return function (t, s, h) {
                for (
                  var f,
                    m,
                    y = a(t),
                    v = i(y),
                    _ = o(s, h, 3),
                    b = r(v.length),
                    w = 0,
                    C = n ? g(t, b) : l ? g(t, 0) : void 0;
                  b > w;
                  w++
                )
                  if ((p || w in v) && ((m = _((f = v[w]), w, y)), e))
                    if (n) C[w] = m;
                    else if (m)
                      switch (e) {
                        case 3:
                          return !0;
                        case 5:
                          return f;
                        case 6:
                          return w;
                        case 2:
                          C.push(f);
                      }
                    else if (d) return !1;
                return u ? -1 : c || d ? d : C;
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(105);
            e.exports = function (e, t) {
              return new (o(e))(t);
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = n(106),
              a = n(30)("species");
            e.exports = function (e) {
              var t;
              return (
                i(e) &&
                  ("function" != typeof (t = e.constructor) ||
                    (t !== Array && !i(t.prototype)) ||
                    (t = void 0),
                  o(t) && null === (t = t[a]) && (t = void 0)),
                void 0 === t ? Array : t
              );
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(29);
            e.exports =
              Array.isArray ||
              function (e) {
                return "Array" == o(e);
              };
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var i = n(22)("meta"),
              a = n(13),
              r = n(21),
              s = n(11).f,
              l = 0,
              c =
                Object.isExtensible ||
                function () {
                  return !0;
                },
              d = !n(16)(function () {
                return c(Object.preventExtensions({}));
              }),
              u = function (e) {
                s(e, i, { value: { i: "O" + ++l, w: {} } });
              },
              p = (e.exports = {
                KEY: i,
                NEED: !1,
                fastKey: function (e, t) {
                  if (!a(e))
                    return "symbol" == o(e)
                      ? e
                      : ("string" == typeof e ? "S" : "P") + e;
                  if (!r(e, i)) {
                    if (!c(e)) return "F";
                    if (!t) return "E";
                    u(e);
                  }
                  return e[i].i;
                },
                getWeak: function (e, t) {
                  if (!r(e, i)) {
                    if (!c(e)) return !0;
                    if (!t) return !1;
                    u(e);
                  }
                  return e[i].w;
                },
                onFreeze: function (e) {
                  return d && p.NEED && c(e) && !r(e, i) && u(e), e;
                },
              });
          },
          function (e, t, n) {
            "use strict";
            var o = n(97),
              i = n(107).getWeak,
              a = n(12),
              r = n(13),
              s = n(87),
              l = n(88),
              c = n(103),
              d = n(21),
              u = n(109),
              p = c(5),
              g = c(6),
              h = 0,
              f = function (e) {
                return e._l || (e._l = new m());
              },
              m = function () {
                this.a = [];
              },
              y = function (e, t) {
                return p(e.a, function (e) {
                  return e[0] === t;
                });
              };
            (m.prototype = {
              get: function (e) {
                var t = y(this, e);
                if (t) return t[1];
              },
              has: function (e) {
                return !!y(this, e);
              },
              set: function (e, t) {
                var n = y(this, e);
                n ? (n[1] = t) : this.a.push([e, t]);
              },
              delete: function (e) {
                var t = g(this.a, function (t) {
                  return t[0] === e;
                });
                return ~t && this.a.splice(t, 1), !!~t;
              },
            }),
              (e.exports = {
                getConstructor: function (e, t, n, a) {
                  var c = e(function (e, o) {
                    s(e, c, t, "_i"),
                      (e._t = t),
                      (e._i = h++),
                      (e._l = void 0),
                      null != o && l(o, n, e[a], e);
                  });
                  return (
                    o(c.prototype, {
                      delete: function (e) {
                        if (!r(e)) return !1;
                        var n = i(e);
                        return !0 === n
                          ? f(u(this, t)).delete(e)
                          : n && d(n, this._i) && delete n[this._i];
                      },
                      has: function (e) {
                        if (!r(e)) return !1;
                        var n = i(e);
                        return !0 === n
                          ? f(u(this, t)).has(e)
                          : n && d(n, this._i);
                      },
                    }),
                    c
                  );
                },
                def: function (e, t, n) {
                  var o = i(a(t), !0);
                  return !0 === o ? f(e).set(t, n) : (o[e._i] = n), e;
                },
                ufstore: f,
              });
          },
          function (e, t, n) {
            "use strict";
            var o = n(13);
            e.exports = function (e, t) {
              if (!o(e) || e._t !== t)
                throw TypeError("Incompatible receiver, " + t + " required!");
              return e;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(7),
              a = n(20),
              r = n(97),
              s = n(107),
              l = n(88),
              c = n(87),
              d = n(13),
              u = n(16),
              p = n(68),
              g = n(59),
              h = n(111);
            e.exports = function (e, t, n, f, m, y) {
              var v = o[e],
                _ = v,
                b = m ? "set" : "add",
                w = _ && _.prototype,
                C = {},
                x = function (e) {
                  var t = w[e];
                  a(
                    w,
                    e,
                    "delete" == e || "has" == e
                      ? function (e) {
                          return !(y && !d(e)) && t.call(this, 0 === e ? 0 : e);
                        }
                      : "get" == e
                      ? function (e) {
                          return y && !d(e)
                            ? void 0
                            : t.call(this, 0 === e ? 0 : e);
                        }
                      : "add" == e
                      ? function (e) {
                          return t.call(this, 0 === e ? 0 : e), this;
                        }
                      : function (e, n) {
                          return t.call(this, 0 === e ? 0 : e, n), this;
                        }
                  );
                };
              if (
                "function" == typeof _ &&
                (y ||
                  (w.forEach &&
                    !u(function () {
                      new _().entries().next();
                    })))
              ) {
                var S = new _(),
                  E = S[b](y ? {} : -0, 1) != S,
                  A = u(function () {
                    S.has(1);
                  }),
                  T = p(function (e) {
                    new _(e);
                  }),
                  G =
                    !y &&
                    u(function () {
                      for (var e = new _(), t = 5; t--; ) e[b](t, t);
                      return !e.has(-0);
                    });
                T ||
                  (((_ = t(function (t, n) {
                    c(t, _, e);
                    var o = h(new v(), t, _);
                    return null != n && l(n, m, o[b], o), o;
                  })).prototype = w),
                  (w.constructor = _)),
                  (A || G) && (x("delete"), x("has"), m && x("get")),
                  (G || E) && x(b),
                  y && w.clear && delete w.clear;
              } else
                (_ = f.getConstructor(t, e, m, b)),
                  r(_.prototype, n),
                  (s.NEED = !0);
              return (
                g(_, e),
                (C[e] = _),
                i(i.G + i.W + i.F * (_ != v), C),
                y || f.setStrong(_, e, m),
                _
              );
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = n(112).set;
            e.exports = function (e, t, n) {
              var a,
                r = t.constructor;
              return (
                r !== n &&
                  "function" == typeof r &&
                  (a = r.prototype) !== n.prototype &&
                  o(a) &&
                  i &&
                  i(e, a),
                e
              );
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(13),
              i = n(12),
              a = function (e, t) {
                if ((i(e), !o(t) && null !== t))
                  throw TypeError(t + ": can't set as prototype!");
              };
            e.exports = {
              set:
                Object.setPrototypeOf ||
                ("__proto__" in {}
                  ? (function (e, t, o) {
                      try {
                        (o = n(23)(
                          Function.call,
                          n(113).f(Object.prototype, "__proto__").set,
                          2
                        ))(e, []),
                          (t = !(e instanceof Array));
                      } catch (e) {
                        t = !0;
                      }
                      return function (e, n) {
                        return a(e, n), t ? (e.__proto__ = n) : o(e, n), e;
                      };
                    })({}, !1)
                  : void 0),
              check: a,
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(73),
              i = n(19),
              a = n(42),
              r = n(18),
              s = n(21),
              l = n(14),
              c = Object.getOwnPropertyDescriptor;
            t.f = n(15)
              ? c
              : function (e, t) {
                  if (((e = a(e)), (t = r(t, !0)), l))
                    try {
                      return c(e, t);
                    } catch (e) {}
                  if (s(e, t)) return i(!o.f.call(e, t), e[t]);
                };
          },
          function (e, t, n) {
            "use strict";
            n(115)("WeakMap");
          },
          function (e, t, n) {
            "use strict";
            var o = n(7);
            e.exports = function (e) {
              o(o.S, e, {
                of: function () {
                  for (var e = arguments.length, t = new Array(e); e--; )
                    t[e] = arguments[e];
                  return new this(t);
                },
              });
            };
          },
          function (e, t, n) {
            "use strict";
            n(117)("WeakMap");
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(24),
              a = n(23),
              r = n(88);
            e.exports = function (e) {
              o(o.S, e, {
                from: function (e) {
                  var t,
                    n,
                    o,
                    s,
                    l = arguments[1];
                  return (
                    i(this),
                    (t = void 0 !== l) && i(l),
                    null == e
                      ? new this()
                      : ((n = []),
                        t
                          ? ((o = 0),
                            (s = a(l, arguments[2], 2)),
                            r(e, !1, function (e) {
                              n.push(s(e, o++));
                            }))
                          : r(e, !1, n.push, n),
                        new this(n))
                  );
                },
              });
            };
          },
          function (e, t, n) {
            "use strict";
            n(82), n(83), n(119), n(120), n(121), (e.exports = n(9).WeakSet);
          },
          function (e, t, n) {
            "use strict";
            var o = n(108),
              i = n(109);
            n(110)(
              "WeakSet",
              function (e) {
                return function () {
                  return e(this, arguments.length > 0 ? arguments[0] : void 0);
                };
              },
              {
                add: function (e) {
                  return o.def(i(this, "WeakSet"), e, !0);
                },
              },
              o,
              !1,
              !0
            );
          },
          function (e, t, n) {
            "use strict";
            n(115)("WeakSet");
          },
          function (e, t, n) {
            "use strict";
            n(117)("WeakSet");
          },
          function (e, t, n) {
            "use strict";
            n(123), (e.exports = n(9).String.codePointAt);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(48)(!1);
            o(o.P, "String", {
              codePointAt: function (e) {
                return i(this, e);
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(125), (e.exports = n(9).String.fromCodePoint);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(44),
              a = String.fromCharCode,
              r = String.fromCodePoint;
            o(o.S + o.F * (!!r && 1 != r.length), "String", {
              fromCodePoint: function (e) {
                for (var t, n = [], o = arguments.length, r = 0; o > r; ) {
                  if (((t = +arguments[r++]), i(t, 1114111) !== t))
                    throw RangeError(t + " is not a valid code point");
                  n.push(
                    t < 65536
                      ? a(t)
                      : a(55296 + ((t -= 65536) >> 10), (t % 1024) + 56320)
                  );
                }
                return n.join("");
              },
            });
          },
          function (e, t, n) {
            "use strict";
            n(127), n(82), (e.exports = n(9).Symbol);
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var i = n(8),
              a = n(21),
              r = n(15),
              s = n(7),
              l = n(20),
              c = n(107).KEY,
              d = n(16),
              u = n(31),
              p = n(59),
              g = n(22),
              h = n(30),
              f = n(128),
              m = n(129),
              y = n(130),
              v = n(106),
              _ = n(12),
              b = n(13),
              w = n(42),
              C = n(18),
              x = n(19),
              S = n(52),
              E = n(131),
              A = n(113),
              T = n(11),
              G = n(54),
              P = A.f,
              D = T.f,
              L = E.f,
              I = i.Symbol,
              k = i.JSON,
              O = k && k.stringify,
              F = h("_hidden"),
              R = h("toPrimitive"),
              M = {}.propertyIsEnumerable,
              N = u("symbol-registry"),
              B = u("symbols"),
              U = u("op-symbols"),
              $ = Object.prototype,
              j = "function" == typeof I,
              K = i.QObject,
              V = !K || !K.prototype || !K.prototype.findChild,
              H =
                r &&
                d(function () {
                  return (
                    7 !=
                    S(
                      D({}, "a", {
                        get: function () {
                          return D(this, "a", { value: 7 }).a;
                        },
                      })
                    ).a
                  );
                })
                  ? function (e, t, n) {
                      var o = P($, t);
                      o && delete $[t], D(e, t, n), o && e !== $ && D($, t, o);
                    }
                  : D,
              W = function (e) {
                var t = (B[e] = S(I.prototype));
                return (t._k = e), t;
              },
              z =
                j && "symbol" == o(I.iterator)
                  ? function (e) {
                      return "symbol" == o(e);
                    }
                  : function (e) {
                      return e instanceof I;
                    },
              q = function (e, t, n) {
                return (
                  e === $ && q(U, t, n),
                  _(e),
                  (t = C(t, !0)),
                  _(n),
                  a(B, t)
                    ? (n.enumerable
                        ? (a(e, F) && e[F][t] && (e[F][t] = !1),
                          (n = S(n, { enumerable: x(0, !1) })))
                        : (a(e, F) || D(e, F, x(1, {})), (e[F][t] = !0)),
                      H(e, t, n))
                    : D(e, t, n)
                );
              },
              Y = function (e, t) {
                _(e);
                for (var n, o = y((t = w(t))), i = 0, a = o.length; a > i; )
                  q(e, (n = o[i++]), t[n]);
                return e;
              },
              X = function (e) {
                var t = M.call(this, (e = C(e, !0)));
                return (
                  !(this === $ && a(B, e) && !a(U, e)) &&
                  (!(
                    t ||
                    !a(this, e) ||
                    !a(B, e) ||
                    (a(this, F) && this[F][e])
                  ) ||
                    t)
                );
              },
              Q = function (e, t) {
                if (
                  ((e = w(e)), (t = C(t, !0)), e !== $ || !a(B, t) || a(U, t))
                ) {
                  var n = P(e, t);
                  return (
                    !n ||
                      !a(B, t) ||
                      (a(e, F) && e[F][t]) ||
                      (n.enumerable = !0),
                    n
                  );
                }
              },
              J = function (e) {
                for (var t, n = L(w(e)), o = [], i = 0; n.length > i; )
                  a(B, (t = n[i++])) || t == F || t == c || o.push(t);
                return o;
              },
              Z = function (e) {
                for (
                  var t, n = e === $, o = L(n ? U : w(e)), i = [], r = 0;
                  o.length > r;

                )
                  !a(B, (t = o[r++])) || (n && !a($, t)) || i.push(B[t]);
                return i;
              };
            j ||
              (l(
                (I = function () {
                  if (this instanceof I)
                    throw TypeError("Symbol is not a constructor!");
                  var e = g(arguments.length > 0 ? arguments[0] : void 0),
                    t = function t(n) {
                      this === $ && t.call(U, n),
                        a(this, F) && a(this[F], e) && (this[F][e] = !1),
                        H(this, e, x(1, n));
                    };
                  return r && V && H($, e, { configurable: !0, set: t }), W(e);
                }).prototype,
                "toString",
                function () {
                  return this._k;
                }
              ),
              (A.f = Q),
              (T.f = q),
              (n(132).f = E.f = J),
              (n(73).f = X),
              (n(72).f = Z),
              r && !n(32) && l($, "propertyIsEnumerable", X, !0),
              (f.f = function (e) {
                return W(h(e));
              })),
              s(s.G + s.W + s.F * !j, { Symbol: I });
            for (
              var ee =
                  "hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(
                    ","
                  ),
                te = 0;
              ee.length > te;

            )
              h(ee[te++]);
            for (var ne = G(h.store), oe = 0; ne.length > oe; ) m(ne[oe++]);
            s(s.S + s.F * !j, "Symbol", {
              for: function (e) {
                return a(N, (e += "")) ? N[e] : (N[e] = I(e));
              },
              keyFor: function (e) {
                if (!z(e)) throw TypeError(e + " is not a symbol!");
                for (var t in N) if (N[t] === e) return t;
              },
              useSetter: function () {
                V = !0;
              },
              useSimple: function () {
                V = !1;
              },
            }),
              s(s.S + s.F * !j, "Object", {
                create: function (e, t) {
                  return void 0 === t ? S(e) : Y(S(e), t);
                },
                defineProperty: q,
                defineProperties: Y,
                getOwnPropertyDescriptor: Q,
                getOwnPropertyNames: J,
                getOwnPropertySymbols: Z,
              }),
              k &&
                s(
                  s.S +
                    s.F *
                      (!j ||
                        d(function () {
                          var e = I();
                          return (
                            "[null]" != O([e]) ||
                            "{}" != O({ a: e }) ||
                            "{}" != O(Object(e))
                          );
                        })),
                  "JSON",
                  {
                    stringify: function (e) {
                      for (var t, n, o = [e], i = 1; arguments.length > i; )
                        o.push(arguments[i++]);
                      if (((n = t = o[1]), (b(t) || void 0 !== e) && !z(e)))
                        return (
                          v(t) ||
                            (t = function (e, t) {
                              if (
                                ("function" == typeof n &&
                                  (t = n.call(this, e, t)),
                                !z(t))
                              )
                                return t;
                            }),
                          (o[1] = t),
                          O.apply(k, o)
                        );
                    },
                  }
                ),
              I.prototype[R] || n(10)(I.prototype, R, I.prototype.valueOf),
              p(I, "Symbol"),
              p(Math, "Math", !0),
              p(i.JSON, "JSON", !0);
          },
          function (e, t, n) {
            "use strict";
            t.f = n(30);
          },
          function (e, t, n) {
            "use strict";
            var o = n(8),
              i = n(9),
              a = n(32),
              r = n(128),
              s = n(11).f;
            e.exports = function (e) {
              var t = i.Symbol || (i.Symbol = a ? {} : o.Symbol || {});
              "_" == e.charAt(0) || e in t || s(t, e, { value: r.f(e) });
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(54),
              i = n(72),
              a = n(73);
            e.exports = function (e) {
              var t = o(e),
                n = i.f;
              if (n)
                for (var r, s = n(e), l = a.f, c = 0; s.length > c; )
                  l.call(e, (r = s[c++])) && t.push(r);
              return t;
            };
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var i = n(42),
              a = n(132).f,
              r = {}.toString,
              s =
                "object" ==
                  ("undefined" == typeof window ? "undefined" : o(window)) &&
                window &&
                Object.getOwnPropertyNames
                  ? Object.getOwnPropertyNames(window)
                  : [];
            e.exports.f = function (e) {
              return s && "[object Window]" == r.call(e)
                ? (function (e) {
                    try {
                      return a(e);
                    } catch (e) {
                      return s.slice();
                    }
                  })(e)
                : a(i(e));
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(55),
              i = n(57).concat("length", "prototype");
            t.f =
              Object.getOwnPropertyNames ||
              function (e) {
                return o(e, i);
              };
          },
          function (e, t, n) {
            "use strict";
            n(134), (e.exports = n(9).String.padStart);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(135),
              a = n(95);
            o(
              o.P + o.F * /Version\/10\.\d+(\.\d+)? Safari\//.test(a),
              "String",
              {
                padStart: function (e) {
                  return i(
                    this,
                    e,
                    arguments.length > 1 ? arguments[1] : void 0,
                    !0
                  );
                },
              }
            );
          },
          function (e, t, n) {
            "use strict";
            var o = n(25),
              i = n(136),
              a = n(33);
            e.exports = function (e, t, n, r) {
              var s = String(a(e)),
                l = s.length,
                c = void 0 === n ? " " : String(n),
                d = o(t);
              if (d <= l || "" == c) return s;
              var u = d - l,
                p = i.call(c, Math.ceil(u / c.length));
              return p.length > u && (p = p.slice(0, u)), r ? p + s : s + p;
            };
          },
          function (e, t, n) {
            "use strict";
            var o = n(26),
              i = n(33);
            e.exports = function (e) {
              var t = String(i(this)),
                n = "",
                a = o(e);
              if (a < 0 || a == 1 / 0)
                throw RangeError("Count can't be negative");
              for (; a > 0; (a >>>= 1) && (t += t)) 1 & a && (n += t);
              return n;
            };
          },
          function (e, t, n) {
            "use strict";
            n(138), (e.exports = n(9).String.padEnd);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(135),
              a = n(95);
            o(
              o.P + o.F * /Version\/10\.\d+(\.\d+)? Safari\//.test(a),
              "String",
              {
                padEnd: function (e) {
                  return i(
                    this,
                    e,
                    arguments.length > 1 ? arguments[1] : void 0,
                    !1
                  );
                },
              }
            );
          },
          function (e, t, n) {
            "use strict";
            n(140), (e.exports = n(9).Object.values);
          },
          function (e, t, n) {
            "use strict";
            var o = n(7),
              i = n(141)(!1);
            o(o.S, "Object", {
              values: function (e) {
                return i(e);
              },
            });
          },
          function (e, t, n) {
            "use strict";
            var o = n(54),
              i = n(42),
              a = n(73).f;
            e.exports = function (e) {
              return function (t) {
                for (
                  var n, r = i(t), s = o(r), l = s.length, c = 0, d = [];
                  l > c;

                )
                  a.call(r, (n = s[c++])) && d.push(e ? [n, r[n]] : r[n]);
                return d;
              };
            };
          },
          function (e, t, n) {
            "use strict";
            var o = !1;
            if ("undefined" != typeof ReadableStream)
              try {
                new ReadableStream({
                  start: function (e) {
                    e.close();
                  },
                }),
                  (o = !0);
              } catch (e) {}
            t.ReadableStream = o ? ReadableStream : n(143).ReadableStream;
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            !(function (e, t) {
              for (var n in t) e[n] = t[n];
            })(
              t,
              (function (e) {
                var t = {};
                function n(o) {
                  if (t[o]) return t[o].exports;
                  var i = (t[o] = { i: o, l: !1, exports: {} });
                  return (
                    e[o].call(i.exports, i, i.exports, n), (i.l = !0), i.exports
                  );
                }
                return (
                  (n.m = e),
                  (n.c = t),
                  (n.i = function (e) {
                    return e;
                  }),
                  (n.d = function (e, t, o) {
                    n.o(e, t) ||
                      Object.defineProperty(e, t, {
                        configurable: !1,
                        enumerable: !0,
                        get: o,
                      });
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
                  n((n.s = 7))
                );
              })([
                function (e, t, n) {
                  var i =
                      "function" == typeof Symbol &&
                      "symbol" === o(Symbol.iterator)
                        ? function (e) {
                            return o(e);
                          }
                        : function (e) {
                            return e &&
                              "function" == typeof Symbol &&
                              e.constructor === Symbol &&
                              e !== Symbol.prototype
                              ? "symbol"
                              : o(e);
                          },
                    a = n(1).assert;
                  function r(e) {
                    return (
                      "string" == typeof e ||
                      "symbol" === (void 0 === e ? "undefined" : i(e))
                    );
                  }
                  function s(e, t, n) {
                    if ("function" != typeof e)
                      throw new TypeError("Argument is not a function");
                    return Function.prototype.apply.call(e, t, n);
                  }
                  (t.typeIsObject = function (e) {
                    return (
                      ("object" === (void 0 === e ? "undefined" : i(e)) &&
                        null !== e) ||
                      "function" == typeof e
                    );
                  }),
                    (t.createDataProperty = function (e, n, o) {
                      a(t.typeIsObject(e)),
                        Object.defineProperty(e, n, {
                          value: o,
                          writable: !0,
                          enumerable: !0,
                          configurable: !0,
                        });
                    }),
                    (t.createArrayFromList = function (e) {
                      return e.slice();
                    }),
                    (t.ArrayBufferCopy = function (e, t, n, o, i) {
                      new Uint8Array(e).set(new Uint8Array(n, o, i), t);
                    }),
                    (t.CreateIterResultObject = function (e, t) {
                      a("boolean" == typeof t);
                      var n = {};
                      return (
                        Object.defineProperty(n, "value", {
                          value: e,
                          enumerable: !0,
                          writable: !0,
                          configurable: !0,
                        }),
                        Object.defineProperty(n, "done", {
                          value: t,
                          enumerable: !0,
                          writable: !0,
                          configurable: !0,
                        }),
                        n
                      );
                    }),
                    (t.IsFiniteNonNegativeNumber = function (e) {
                      return !(Number.isNaN(e) || e === 1 / 0 || e < 0);
                    }),
                    (t.InvokeOrNoop = function (e, t, n) {
                      a(void 0 !== e), a(r(t)), a(Array.isArray(n));
                      var o = e[t];
                      if (void 0 !== o) return s(o, e, n);
                    }),
                    (t.PromiseInvokeOrNoop = function (e, n, o) {
                      a(void 0 !== e), a(r(n)), a(Array.isArray(o));
                      try {
                        return Promise.resolve(t.InvokeOrNoop(e, n, o));
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    }),
                    (t.PromiseInvokeOrPerformFallback = function (
                      e,
                      t,
                      n,
                      o,
                      i
                    ) {
                      a(void 0 !== e),
                        a(r(t)),
                        a(Array.isArray(n)),
                        a(Array.isArray(i));
                      var l = void 0;
                      try {
                        l = e[t];
                      } catch (e) {
                        return Promise.reject(e);
                      }
                      if (void 0 === l) return o.apply(null, i);
                      try {
                        return Promise.resolve(s(l, e, n));
                      } catch (e) {
                        return Promise.reject(e);
                      }
                    }),
                    (t.TransferArrayBuffer = function (e) {
                      return e.slice();
                    }),
                    (t.ValidateAndNormalizeHighWaterMark = function (e) {
                      if (((e = Number(e)), Number.isNaN(e) || e < 0))
                        throw new RangeError(
                          "highWaterMark property of a queuing strategy must be non-negative and non-NaN"
                        );
                      return e;
                    }),
                    (t.ValidateAndNormalizeQueuingStrategy = function (e, n) {
                      if (void 0 !== e && "function" != typeof e)
                        throw new TypeError(
                          "size property of a queuing strategy must be a function"
                        );
                      return {
                        size: e,
                        highWaterMark: (n =
                          t.ValidateAndNormalizeHighWaterMark(n)),
                      };
                    });
                },
                function (e, t, n) {
                  function o(e) {
                    (this.name = "AssertionError"),
                      (this.message = e || ""),
                      (this.stack = new Error().stack);
                  }
                  (o.prototype = Object.create(Error.prototype)),
                    (o.prototype.constructor = o),
                    (e.exports = {
                      rethrowAssertionErrorRejection: function (e) {
                        e &&
                          e.constructor === o &&
                          setTimeout(function () {
                            throw e;
                          }, 0);
                      },
                      AssertionError: o,
                      assert: function (e, t) {
                        if (!e) throw new o(t);
                      },
                    });
                },
                function (e, t, n) {
                  var o = (function () {
                    function e(e, t) {
                      for (var n = 0; n < t.length; n++) {
                        var o = t[n];
                        (o.enumerable = o.enumerable || !1),
                          (o.configurable = !0),
                          "value" in o && (o.writable = !0),
                          Object.defineProperty(e, o.key, o);
                      }
                    }
                    return function (t, n, o) {
                      return n && e(t.prototype, n), o && e(t, o), t;
                    };
                  })();
                  function i(e, t) {
                    if (!(e instanceof t))
                      throw new TypeError("Cannot call a class as a function");
                  }
                  var a = n(0),
                    r = a.InvokeOrNoop,
                    s = a.PromiseInvokeOrNoop,
                    l = a.ValidateAndNormalizeQueuingStrategy,
                    c = a.typeIsObject,
                    d = n(1),
                    u = d.assert,
                    p = d.rethrowAssertionErrorRejection,
                    g = n(3),
                    h = g.DequeueValue,
                    f = g.EnqueueValueWithSize,
                    m = g.PeekQueueValue,
                    y = g.ResetQueue,
                    v = (function () {
                      function e() {
                        var t =
                            arguments.length > 0 && void 0 !== arguments[0]
                              ? arguments[0]
                              : {},
                          n =
                            arguments.length > 1 && void 0 !== arguments[1]
                              ? arguments[1]
                              : {},
                          o = n.size,
                          a = n.highWaterMark,
                          r = void 0 === a ? 1 : a;
                        i(this, e),
                          (this._state = "writable"),
                          (this._storedError = void 0),
                          (this._writer = void 0),
                          (this._writableStreamController = void 0),
                          (this._writeRequests = []),
                          (this._inFlightWriteRequest = void 0),
                          (this._closeRequest = void 0),
                          (this._inFlightCloseRequest = void 0),
                          (this._pendingAbortRequest = void 0),
                          (this._backpressure = !1);
                        var s = t.type;
                        if (void 0 !== s)
                          throw new RangeError("Invalid type is specified");
                        (this._writableStreamController = new N(this, t, o, r)),
                          this._writableStreamController.__startSteps();
                      }
                      return (
                        o(e, [
                          {
                            key: "abort",
                            value: function (e) {
                              return !1 === b(this)
                                ? Promise.reject(V("abort"))
                                : !0 === w(this)
                                ? Promise.reject(
                                    new TypeError(
                                      "Cannot abort a stream that already has a writer"
                                    )
                                  )
                                : C(this, e);
                            },
                          },
                          {
                            key: "getWriter",
                            value: function () {
                              if (!1 === b(this)) throw V("getWriter");
                              return _(this);
                            },
                          },
                          {
                            key: "locked",
                            get: function () {
                              if (!1 === b(this)) throw V("locked");
                              return w(this);
                            },
                          },
                        ]),
                        e
                      );
                    })();
                  function _(e) {
                    return new L(e);
                  }
                  function b(e) {
                    return (
                      !!c(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_writableStreamController"
                      )
                    );
                  }
                  function w(e) {
                    return (
                      u(
                        !0 === b(e),
                        "IsWritableStreamLocked should only be used on known writable streams"
                      ),
                      void 0 !== e._writer
                    );
                  }
                  function C(e, t) {
                    var n = e._state;
                    if ("closed" === n) return Promise.resolve(void 0);
                    if ("errored" === n) return Promise.reject(e._storedError);
                    var o = new TypeError("Requested to abort");
                    if (void 0 !== e._pendingAbortRequest)
                      return Promise.reject(o);
                    u(
                      "writable" === n || "erroring" === n,
                      "state must be writable or erroring"
                    );
                    var i = !1;
                    "erroring" === n && ((i = !0), (t = void 0));
                    var a = new Promise(function (n, o) {
                      e._pendingAbortRequest = {
                        _resolve: n,
                        _reject: o,
                        _reason: t,
                        _wasAlreadyErroring: i,
                      };
                    });
                    return !1 === i && S(e, o), a;
                  }
                  function x(e, t) {
                    var n = e._state;
                    "writable" !== n ? (u("erroring" === n), E(e)) : S(e, t);
                  }
                  function S(e, t) {
                    u(
                      void 0 === e._storedError,
                      "stream._storedError === undefined"
                    ),
                      u("writable" === e._state, "state must be writable");
                    var n = e._writableStreamController;
                    u(void 0 !== n, "controller must not be undefined"),
                      (e._state = "erroring"),
                      (e._storedError = t);
                    var o = e._writer;
                    void 0 !== o && F(o, t),
                      !1 === G(e) && !0 === n._started && E(e);
                  }
                  function E(e) {
                    u("erroring" === e._state, "stream._state === erroring"),
                      u(
                        !1 === G(e),
                        "WritableStreamHasOperationMarkedInFlight(stream) === false"
                      ),
                      (e._state = "errored"),
                      e._writableStreamController.__errorSteps();
                    for (
                      var t = e._storedError, n = 0;
                      n < e._writeRequests.length;
                      n++
                    )
                      e._writeRequests[n]._reject(t);
                    if (
                      ((e._writeRequests = []),
                      void 0 !== e._pendingAbortRequest)
                    ) {
                      var o = e._pendingAbortRequest;
                      if (
                        ((e._pendingAbortRequest = void 0),
                        !0 === o._wasAlreadyErroring)
                      )
                        return o._reject(t), void P(e);
                      e._writableStreamController.__abortSteps(o._reason).then(
                        function () {
                          o._resolve(), P(e);
                        },
                        function (t) {
                          o._reject(t), P(e);
                        }
                      );
                    } else P(e);
                  }
                  function A(e) {
                    u(void 0 !== e._inFlightCloseRequest),
                      e._inFlightCloseRequest._resolve(void 0),
                      (e._inFlightCloseRequest = void 0);
                    var t = e._state;
                    u("writable" === t || "erroring" === t),
                      "erroring" === t &&
                        ((e._storedError = void 0),
                        void 0 !== e._pendingAbortRequest &&
                          (e._pendingAbortRequest._resolve(),
                          (e._pendingAbortRequest = void 0))),
                      (e._state = "closed");
                    var n = e._writer;
                    void 0 !== n &&
                      (function (e) {
                        u(
                          void 0 !== e._closedPromise_resolve,
                          "writer._closedPromise_resolve !== undefined"
                        ),
                          u(
                            void 0 !== e._closedPromise_reject,
                            "writer._closedPromise_reject !== undefined"
                          ),
                          u(
                            "pending" === e._closedPromiseState,
                            "writer._closedPromiseState is pending"
                          ),
                          e._closedPromise_resolve(void 0),
                          (e._closedPromise_resolve = void 0),
                          (e._closedPromise_reject = void 0),
                          (e._closedPromiseState = "resolved");
                      })(n),
                      u(
                        void 0 === e._pendingAbortRequest,
                        "stream._pendingAbortRequest === undefined"
                      ),
                      u(
                        void 0 === e._storedError,
                        "stream._storedError === undefined"
                      );
                  }
                  function T(e) {
                    return (
                      void 0 !== e._closeRequest ||
                      void 0 !== e._inFlightCloseRequest
                    );
                  }
                  function G(e) {
                    return (
                      void 0 !== e._inFlightWriteRequest ||
                      void 0 !== e._inFlightCloseRequest
                    );
                  }
                  function P(e) {
                    u(
                      "errored" === e._state,
                      '_stream_.[[state]] is `"errored"`'
                    ),
                      void 0 !== e._closeRequest &&
                        (u(void 0 === e._inFlightCloseRequest),
                        e._closeRequest._reject(e._storedError),
                        (e._closeRequest = void 0));
                    var t = e._writer;
                    void 0 !== t &&
                      (q(t, e._storedError),
                      t._closedPromise.catch(function () {}));
                  }
                  function D(e, t) {
                    u("writable" === e._state), u(!1 === T(e));
                    var n = e._writer;
                    void 0 !== n &&
                      t !== e._backpressure &&
                      (!0 === t
                        ? (function (e) {
                            u(
                              void 0 === e._readyPromise_resolve,
                              "writer._readyPromise_resolve === undefined"
                            ),
                              u(
                                void 0 === e._readyPromise_reject,
                                "writer._readyPromise_reject === undefined"
                              ),
                              (e._readyPromise = new Promise(function (t, n) {
                                (e._readyPromise_resolve = t),
                                  (e._readyPromise_reject = n);
                              })),
                              (e._readyPromiseState = "pending");
                          })(n)
                        : (u(!1 === t), Q(n))),
                      (e._backpressure = t);
                  }
                  e.exports = {
                    AcquireWritableStreamDefaultWriter: _,
                    IsWritableStream: b,
                    IsWritableStreamLocked: w,
                    WritableStream: v,
                    WritableStreamAbort: C,
                    WritableStreamDefaultControllerError: K,
                    WritableStreamDefaultWriterCloseWithErrorPropagation:
                      function (e) {
                        var t = e._ownerWritableStream;
                        u(void 0 !== t);
                        var n = t._state;
                        return !0 === T(t) || "closed" === n
                          ? Promise.resolve()
                          : "errored" === n
                          ? Promise.reject(t._storedError)
                          : (u("writable" === n || "erroring" === n), k(e));
                      },
                    WritableStreamDefaultWriterRelease: R,
                    WritableStreamDefaultWriterWrite: M,
                    WritableStreamCloseQueuedOrInFlight: T,
                  };
                  var L = (function () {
                    function e(t) {
                      if ((i(this, e), !1 === b(t)))
                        throw new TypeError(
                          "WritableStreamDefaultWriter can only be constructed with a WritableStream instance"
                        );
                      if (!0 === w(t))
                        throw new TypeError(
                          "This stream has already been locked for exclusive writing by another writer"
                        );
                      (this._ownerWritableStream = t), (t._writer = this);
                      var n,
                        o = t._state;
                      if ("writable" === o)
                        !1 === T(t) && !0 === t._backpressure
                          ? (((n = this)._readyPromise = new Promise(function (
                              e,
                              t
                            ) {
                              (n._readyPromise_resolve = e),
                                (n._readyPromise_reject = t);
                            })),
                            (n._readyPromiseState = "pending"))
                          : X(this),
                          z(this);
                      else if ("erroring" === o)
                        Y(this, t._storedError),
                          this._readyPromise.catch(function () {}),
                          z(this);
                      else if ("closed" === o)
                        X(this),
                          (function (e) {
                            (e._closedPromise = Promise.resolve(void 0)),
                              (e._closedPromise_resolve = void 0),
                              (e._closedPromise_reject = void 0),
                              (e._closedPromiseState = "resolved");
                          })(this);
                      else {
                        u("errored" === o, "state must be errored");
                        var a = t._storedError;
                        Y(this, a),
                          this._readyPromise.catch(function () {}),
                          (function (e, t) {
                            (e._closedPromise = Promise.reject(t)),
                              (e._closedPromise_resolve = void 0),
                              (e._closedPromise_reject = void 0),
                              (e._closedPromiseState = "rejected");
                          })(this, a),
                          this._closedPromise.catch(function () {});
                      }
                    }
                    return (
                      o(e, [
                        {
                          key: "abort",
                          value: function (e) {
                            return !1 === I(this)
                              ? Promise.reject(H("abort"))
                              : void 0 === this._ownerWritableStream
                              ? Promise.reject(W("abort"))
                              : (function (e, t) {
                                  var n = e._ownerWritableStream;
                                  return u(void 0 !== n), C(n, t);
                                })(this, e);
                          },
                        },
                        {
                          key: "close",
                          value: function () {
                            if (!1 === I(this))
                              return Promise.reject(H("close"));
                            var e = this._ownerWritableStream;
                            return void 0 === e
                              ? Promise.reject(W("close"))
                              : !0 === T(e)
                              ? Promise.reject(
                                  new TypeError(
                                    "cannot close an already-closing stream"
                                  )
                                )
                              : k(this);
                          },
                        },
                        {
                          key: "releaseLock",
                          value: function () {
                            if (!1 === I(this)) throw H("releaseLock");
                            var e = this._ownerWritableStream;
                            void 0 !== e && (u(void 0 !== e._writer), R(this));
                          },
                        },
                        {
                          key: "write",
                          value: function (e) {
                            return !1 === I(this)
                              ? Promise.reject(H("write"))
                              : void 0 === this._ownerWritableStream
                              ? Promise.reject(W("write to"))
                              : M(this, e);
                          },
                        },
                        {
                          key: "closed",
                          get: function () {
                            return !1 === I(this)
                              ? Promise.reject(H("closed"))
                              : this._closedPromise;
                          },
                        },
                        {
                          key: "desiredSize",
                          get: function () {
                            if (!1 === I(this)) throw H("desiredSize");
                            if (void 0 === this._ownerWritableStream)
                              throw W("desiredSize");
                            return (
                              (e = this._ownerWritableStream),
                              "errored" === (t = e._state) || "erroring" === t
                                ? null
                                : "closed" === t
                                ? 0
                                : B(e._writableStreamController)
                            );
                            var e, t;
                          },
                        },
                        {
                          key: "ready",
                          get: function () {
                            return !1 === I(this)
                              ? Promise.reject(H("ready"))
                              : this._readyPromise;
                          },
                        },
                      ]),
                      e
                    );
                  })();
                  function I(e) {
                    return (
                      !!c(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_ownerWritableStream"
                      )
                    );
                  }
                  function k(e) {
                    var t = e._ownerWritableStream;
                    u(void 0 !== t);
                    var n = t._state;
                    if ("closed" === n || "errored" === n)
                      return Promise.reject(
                        new TypeError(
                          "The stream (in " +
                            n +
                            " state) is not in the writable state and cannot be closed"
                        )
                      );
                    u("writable" === n || "erroring" === n), u(!1 === T(t));
                    var o,
                      i = new Promise(function (e, n) {
                        var o = { _resolve: e, _reject: n };
                        t._closeRequest = o;
                      });
                    return (
                      !0 === t._backpressure && "writable" === n && Q(e),
                      (o = t._writableStreamController),
                      f(o, "close", 0),
                      U(o),
                      i
                    );
                  }
                  function O(e, t) {
                    "pending" === e._closedPromiseState
                      ? q(e, t)
                      : (function (e, t) {
                          u(
                            void 0 === e._closedPromise_resolve,
                            "writer._closedPromise_resolve === undefined"
                          ),
                            u(
                              void 0 === e._closedPromise_reject,
                              "writer._closedPromise_reject === undefined"
                            ),
                            u(
                              "pending" !== e._closedPromiseState,
                              "writer._closedPromiseState is not pending"
                            ),
                            (e._closedPromise = Promise.reject(t)),
                            (e._closedPromiseState = "rejected");
                        })(e, t),
                      e._closedPromise.catch(function () {});
                  }
                  function F(e, t) {
                    "pending" === e._readyPromiseState
                      ? (function (e, t) {
                          u(
                            void 0 !== e._readyPromise_resolve,
                            "writer._readyPromise_resolve !== undefined"
                          ),
                            u(
                              void 0 !== e._readyPromise_reject,
                              "writer._readyPromise_reject !== undefined"
                            ),
                            e._readyPromise_reject(t),
                            (e._readyPromise_resolve = void 0),
                            (e._readyPromise_reject = void 0),
                            (e._readyPromiseState = "rejected");
                        })(e, t)
                      : (function (e, t) {
                          u(
                            void 0 === e._readyPromise_resolve,
                            "writer._readyPromise_resolve === undefined"
                          ),
                            u(
                              void 0 === e._readyPromise_reject,
                              "writer._readyPromise_reject === undefined"
                            ),
                            (e._readyPromise = Promise.reject(t)),
                            (e._readyPromiseState = "rejected");
                        })(e, t),
                      e._readyPromise.catch(function () {});
                  }
                  function R(e) {
                    var t = e._ownerWritableStream;
                    u(void 0 !== t), u(t._writer === e);
                    var n = new TypeError(
                      "Writer was released and can no longer be used to monitor the stream's closedness"
                    );
                    F(e, n),
                      O(e, n),
                      (t._writer = void 0),
                      (e._ownerWritableStream = void 0);
                  }
                  function M(e, t) {
                    var n = e._ownerWritableStream;
                    u(void 0 !== n);
                    var o = n._writableStreamController,
                      i = (function (e, t) {
                        var n = e._strategySize;
                        if (void 0 === n) return 1;
                        try {
                          return n(t);
                        } catch (t) {
                          return $(e, t), 1;
                        }
                      })(o, t);
                    if (n !== e._ownerWritableStream)
                      return Promise.reject(W("write to"));
                    var a = n._state;
                    if ("errored" === a) return Promise.reject(n._storedError);
                    if (!0 === T(n) || "closed" === a)
                      return Promise.reject(
                        new TypeError(
                          "The stream is closing or closed and cannot be written to"
                        )
                      );
                    if ("erroring" === a) return Promise.reject(n._storedError);
                    u("writable" === a);
                    var r = (function (e) {
                      return (
                        u(!0 === w(e)),
                        u("writable" === e._state),
                        new Promise(function (t, n) {
                          var o = { _resolve: t, _reject: n };
                          e._writeRequests.push(o);
                        })
                      );
                    })(n);
                    return (
                      (function (e, t, n) {
                        var o = { chunk: t };
                        try {
                          f(e, o, n);
                        } catch (t) {
                          return void $(e, t);
                        }
                        var i = e._controlledWritableStream;
                        if (!1 === T(i) && "writable" === i._state) {
                          var a = j(e);
                          D(i, a);
                        }
                        U(e);
                      })(o, t, i),
                      r
                    );
                  }
                  var N = (function () {
                    function e(t, n, o, a) {
                      if ((i(this, e), !1 === b(t)))
                        throw new TypeError(
                          "WritableStreamDefaultController can only be constructed with a WritableStream instance"
                        );
                      if (void 0 !== t._writableStreamController)
                        throw new TypeError(
                          "WritableStreamDefaultController instances can only be created by the WritableStream constructor"
                        );
                      (this._controlledWritableStream = t),
                        (this._underlyingSink = n),
                        (this._queue = void 0),
                        (this._queueTotalSize = void 0),
                        y(this),
                        (this._started = !1);
                      var r = l(o, a);
                      (this._strategySize = r.size),
                        (this._strategyHWM = r.highWaterMark),
                        D(t, j(this));
                    }
                    return (
                      o(e, [
                        {
                          key: "error",
                          value: function (e) {
                            if (
                              !1 ==
                              (!!c((t = this)) &&
                                !!Object.prototype.hasOwnProperty.call(
                                  t,
                                  "_underlyingSink"
                                ))
                            )
                              throw new TypeError(
                                "WritableStreamDefaultController.prototype.error can only be used on a WritableStreamDefaultController"
                              );
                            var t;
                            "writable" ===
                              this._controlledWritableStream._state &&
                              K(this, e);
                          },
                        },
                        {
                          key: "__abortSteps",
                          value: function (e) {
                            return s(this._underlyingSink, "abort", [e]);
                          },
                        },
                        {
                          key: "__errorSteps",
                          value: function () {
                            y(this);
                          },
                        },
                        {
                          key: "__startSteps",
                          value: function () {
                            var e = this,
                              t = r(this._underlyingSink, "start", [this]),
                              n = this._controlledWritableStream;
                            Promise.resolve(t)
                              .then(
                                function () {
                                  u(
                                    "writable" === n._state ||
                                      "erroring" === n._state
                                  ),
                                    (e._started = !0),
                                    U(e);
                                },
                                function (t) {
                                  u(
                                    "writable" === n._state ||
                                      "erroring" === n._state
                                  ),
                                    (e._started = !0),
                                    x(n, t);
                                }
                              )
                              .catch(p);
                          },
                        },
                      ]),
                      e
                    );
                  })();
                  function B(e) {
                    return e._strategyHWM - e._queueTotalSize;
                  }
                  function U(e) {
                    var t = e._controlledWritableStream;
                    if (
                      !1 !== e._started &&
                      void 0 === t._inFlightWriteRequest
                    ) {
                      var n = t._state;
                      if ("closed" !== n && "errored" !== n)
                        if ("erroring" !== n) {
                          if (0 !== e._queue.length) {
                            var o = m(e);
                            "close" === o
                              ? (function (e) {
                                  var t = e._controlledWritableStream;
                                  (function (e) {
                                    u(void 0 === e._inFlightCloseRequest),
                                      u(void 0 !== e._closeRequest),
                                      (e._inFlightCloseRequest =
                                        e._closeRequest),
                                      (e._closeRequest = void 0);
                                  })(t),
                                    h(e),
                                    u(
                                      0 === e._queue.length,
                                      "queue must be empty once the final write record is dequeued"
                                    ),
                                    s(e._underlyingSink, "close", [])
                                      .then(
                                        function () {
                                          A(t);
                                        },
                                        function (e) {
                                          !(function (e, t) {
                                            u(
                                              void 0 !== e._inFlightCloseRequest
                                            ),
                                              e._inFlightCloseRequest._reject(
                                                t
                                              ),
                                              (e._inFlightCloseRequest =
                                                void 0),
                                              u(
                                                "writable" === e._state ||
                                                  "erroring" === e._state
                                              ),
                                              void 0 !==
                                                e._pendingAbortRequest &&
                                                (e._pendingAbortRequest._reject(
                                                  t
                                                ),
                                                (e._pendingAbortRequest =
                                                  void 0)),
                                              x(e, t);
                                          })(t, e);
                                        }
                                      )
                                      .catch(p);
                                })(e)
                              : (function (e, t) {
                                  var n = e._controlledWritableStream;
                                  (function (e) {
                                    u(
                                      void 0 === e._inFlightWriteRequest,
                                      "there must be no pending write request"
                                    ),
                                      u(
                                        0 !== e._writeRequests.length,
                                        "writeRequests must not be empty"
                                      ),
                                      (e._inFlightWriteRequest =
                                        e._writeRequests.shift());
                                  })(n),
                                    s(e._underlyingSink, "write", [t, e])
                                      .then(
                                        function () {
                                          !(function (e) {
                                            u(
                                              void 0 !== e._inFlightWriteRequest
                                            ),
                                              e._inFlightWriteRequest._resolve(
                                                void 0
                                              ),
                                              (e._inFlightWriteRequest =
                                                void 0);
                                          })(n);
                                          var t = n._state;
                                          if (
                                            (u(
                                              "writable" === t ||
                                                "erroring" === t
                                            ),
                                            h(e),
                                            !1 === T(n) && "writable" === t)
                                          ) {
                                            var o = j(e);
                                            D(n, o);
                                          }
                                          U(e);
                                        },
                                        function (e) {
                                          !(function (e, t) {
                                            u(
                                              void 0 !== e._inFlightWriteRequest
                                            ),
                                              e._inFlightWriteRequest._reject(
                                                t
                                              ),
                                              (e._inFlightWriteRequest =
                                                void 0),
                                              u(
                                                "writable" === e._state ||
                                                  "erroring" === e._state
                                              ),
                                              x(e, t);
                                          })(n, e);
                                        }
                                      )
                                      .catch(p);
                                })(e, o.chunk);
                          }
                        } else E(t);
                    }
                  }
                  function $(e, t) {
                    "writable" === e._controlledWritableStream._state &&
                      K(e, t);
                  }
                  function j(e) {
                    return B(e) <= 0;
                  }
                  function K(e, t) {
                    var n = e._controlledWritableStream;
                    u("writable" === n._state), S(n, t);
                  }
                  function V(e) {
                    return new TypeError(
                      "WritableStream.prototype." +
                        e +
                        " can only be used on a WritableStream"
                    );
                  }
                  function H(e) {
                    return new TypeError(
                      "WritableStreamDefaultWriter.prototype." +
                        e +
                        " can only be used on a WritableStreamDefaultWriter"
                    );
                  }
                  function W(e) {
                    return new TypeError(
                      "Cannot " + e + " a stream using a released writer"
                    );
                  }
                  function z(e) {
                    e._closedPromise = new Promise(function (t, n) {
                      (e._closedPromise_resolve = t),
                        (e._closedPromise_reject = n),
                        (e._closedPromiseState = "pending");
                    });
                  }
                  function q(e, t) {
                    u(
                      void 0 !== e._closedPromise_resolve,
                      "writer._closedPromise_resolve !== undefined"
                    ),
                      u(
                        void 0 !== e._closedPromise_reject,
                        "writer._closedPromise_reject !== undefined"
                      ),
                      u(
                        "pending" === e._closedPromiseState,
                        "writer._closedPromiseState is pending"
                      ),
                      e._closedPromise_reject(t),
                      (e._closedPromise_resolve = void 0),
                      (e._closedPromise_reject = void 0),
                      (e._closedPromiseState = "rejected");
                  }
                  function Y(e, t) {
                    (e._readyPromise = Promise.reject(t)),
                      (e._readyPromise_resolve = void 0),
                      (e._readyPromise_reject = void 0),
                      (e._readyPromiseState = "rejected");
                  }
                  function X(e) {
                    (e._readyPromise = Promise.resolve(void 0)),
                      (e._readyPromise_resolve = void 0),
                      (e._readyPromise_reject = void 0),
                      (e._readyPromiseState = "fulfilled");
                  }
                  function Q(e) {
                    u(
                      void 0 !== e._readyPromise_resolve,
                      "writer._readyPromise_resolve !== undefined"
                    ),
                      u(
                        void 0 !== e._readyPromise_reject,
                        "writer._readyPromise_reject !== undefined"
                      ),
                      e._readyPromise_resolve(void 0),
                      (e._readyPromise_resolve = void 0),
                      (e._readyPromise_reject = void 0),
                      (e._readyPromiseState = "fulfilled");
                  }
                },
                function (e, t, n) {
                  var o = n(0).IsFiniteNonNegativeNumber,
                    i = n(1).assert;
                  (t.DequeueValue = function (e) {
                    i(
                      "_queue" in e && "_queueTotalSize" in e,
                      "Spec-level failure: DequeueValue should only be used on containers with [[queue]] and [[queueTotalSize]]."
                    ),
                      i(
                        e._queue.length > 0,
                        "Spec-level failure: should never dequeue from an empty queue."
                      );
                    var t = e._queue.shift();
                    return (
                      (e._queueTotalSize -= t.size),
                      e._queueTotalSize < 0 && (e._queueTotalSize = 0),
                      t.value
                    );
                  }),
                    (t.EnqueueValueWithSize = function (e, t, n) {
                      if (
                        (i(
                          "_queue" in e && "_queueTotalSize" in e,
                          "Spec-level failure: EnqueueValueWithSize should only be used on containers with [[queue]] and [[queueTotalSize]]."
                        ),
                        (n = Number(n)),
                        !o(n))
                      )
                        throw new RangeError(
                          "Size must be a finite, non-NaN, non-negative number."
                        );
                      e._queue.push({ value: t, size: n }),
                        (e._queueTotalSize += n);
                    }),
                    (t.PeekQueueValue = function (e) {
                      return (
                        i(
                          "_queue" in e && "_queueTotalSize" in e,
                          "Spec-level failure: PeekQueueValue should only be used on containers with [[queue]] and [[queueTotalSize]]."
                        ),
                        i(
                          e._queue.length > 0,
                          "Spec-level failure: should never peek at an empty queue."
                        ),
                        e._queue[0].value
                      );
                    }),
                    (t.ResetQueue = function (e) {
                      i(
                        "_queue" in e && "_queueTotalSize" in e,
                        "Spec-level failure: ResetQueue should only be used on containers with [[queue]] and [[queueTotalSize]]."
                      ),
                        (e._queue = []),
                        (e._queueTotalSize = 0);
                    });
                },
                function (e, t, n) {
                  var o = (function () {
                    function e(e, t) {
                      for (var n = 0; n < t.length; n++) {
                        var o = t[n];
                        (o.enumerable = o.enumerable || !1),
                          (o.configurable = !0),
                          "value" in o && (o.writable = !0),
                          Object.defineProperty(e, o.key, o);
                      }
                    }
                    return function (t, n, o) {
                      return n && e(t.prototype, n), o && e(t, o), t;
                    };
                  })();
                  function i(e, t) {
                    if (!(e instanceof t))
                      throw new TypeError("Cannot call a class as a function");
                  }
                  var a = n(0),
                    r = a.ArrayBufferCopy,
                    s = a.CreateIterResultObject,
                    l = a.IsFiniteNonNegativeNumber,
                    c = a.InvokeOrNoop,
                    d = a.PromiseInvokeOrNoop,
                    u = a.TransferArrayBuffer,
                    p = a.ValidateAndNormalizeQueuingStrategy,
                    g = a.ValidateAndNormalizeHighWaterMark,
                    h = n(0),
                    f = h.createArrayFromList,
                    m = h.createDataProperty,
                    y = h.typeIsObject,
                    v = n(1),
                    _ = v.assert,
                    b = v.rethrowAssertionErrorRejection,
                    w = n(3),
                    C = w.DequeueValue,
                    x = w.EnqueueValueWithSize,
                    S = w.ResetQueue,
                    E = n(2),
                    A = E.AcquireWritableStreamDefaultWriter,
                    T = E.IsWritableStream,
                    G = E.IsWritableStreamLocked,
                    P = E.WritableStreamAbort,
                    D = E.WritableStreamDefaultWriterCloseWithErrorPropagation,
                    L = E.WritableStreamDefaultWriterRelease,
                    I = E.WritableStreamDefaultWriterWrite,
                    k = E.WritableStreamCloseQueuedOrInFlight,
                    O = (function () {
                      function e() {
                        var t =
                            arguments.length > 0 && void 0 !== arguments[0]
                              ? arguments[0]
                              : {},
                          n =
                            arguments.length > 1 && void 0 !== arguments[1]
                              ? arguments[1]
                              : {},
                          o = n.size,
                          a = n.highWaterMark;
                        i(this, e),
                          (this._state = "readable"),
                          (this._reader = void 0),
                          (this._storedError = void 0),
                          (this._disturbed = !1),
                          (this._readableStreamController = void 0);
                        var r = t.type,
                          s = String(r);
                        if ("bytes" === s)
                          void 0 === a && (a = 0),
                            (this._readableStreamController = new ge(
                              this,
                              t,
                              a
                            ));
                        else {
                          if (void 0 !== r)
                            throw new RangeError("Invalid type is specified");
                          void 0 === a && (a = 1),
                            (this._readableStreamController = new ie(
                              this,
                              t,
                              o,
                              a
                            ));
                        }
                      }
                      return (
                        o(e, [
                          {
                            key: "cancel",
                            value: function (e) {
                              return !1 === M(this)
                                ? Promise.reject(De("cancel"))
                                : !0 === N(this)
                                ? Promise.reject(
                                    new TypeError(
                                      "Cannot cancel a stream that already has a reader"
                                    )
                                  )
                                : j(this, e);
                            },
                          },
                          {
                            key: "getReader",
                            value: function () {
                              var e =
                                  arguments.length > 0 &&
                                  void 0 !== arguments[0]
                                    ? arguments[0]
                                    : {},
                                t = e.mode;
                              if (!1 === M(this)) throw De("getReader");
                              if (void 0 === t) return R(this);
                              if ("byob" === (t = String(t))) return F(this);
                              throw new RangeError("Invalid mode is specified");
                            },
                          },
                          {
                            key: "pipeThrough",
                            value: function (e, t) {
                              var n = e.writable,
                                o = e.readable;
                              return (
                                (function (e) {
                                  try {
                                    Promise.prototype.then.call(
                                      e,
                                      void 0,
                                      function () {}
                                    );
                                  } catch (e) {}
                                })(this.pipeTo(n, t)),
                                o
                              );
                            },
                          },
                          {
                            key: "pipeTo",
                            value: function (e) {
                              var t = this,
                                n =
                                  arguments.length > 1 &&
                                  void 0 !== arguments[1]
                                    ? arguments[1]
                                    : {},
                                o = n.preventClose,
                                i = n.preventAbort,
                                a = n.preventCancel;
                              if (!1 === M(this))
                                return Promise.reject(De("pipeTo"));
                              if (!1 === T(e))
                                return Promise.reject(
                                  new TypeError(
                                    "ReadableStream.prototype.pipeTo's first argument must be a WritableStream"
                                  )
                                );
                              if (
                                ((o = Boolean(o)),
                                (i = Boolean(i)),
                                (a = Boolean(a)),
                                !0 === N(this))
                              )
                                return Promise.reject(
                                  new TypeError(
                                    "ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"
                                  )
                                );
                              if (!0 === G(e))
                                return Promise.reject(
                                  new TypeError(
                                    "ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"
                                  )
                                );
                              var r = R(this),
                                s = A(e),
                                l = !1,
                                c = Promise.resolve();
                              return new Promise(function (n, d) {
                                var u, p, g;
                                if (
                                  (m(t, r._closedPromise, function (t) {
                                    !1 === i
                                      ? y(
                                          function () {
                                            return P(e, t);
                                          },
                                          !0,
                                          t
                                        )
                                      : v(!0, t);
                                  }),
                                  m(e, s._closedPromise, function (e) {
                                    !1 === a
                                      ? y(
                                          function () {
                                            return j(t, e);
                                          },
                                          !0,
                                          e
                                        )
                                      : v(!0, e);
                                  }),
                                  (u = t),
                                  (p = r._closedPromise),
                                  (g = function () {
                                    !1 === o
                                      ? y(function () {
                                          return D(s);
                                        })
                                      : v();
                                  }),
                                  "closed" === u._state
                                    ? g()
                                    : p.then(g).catch(b),
                                  !0 === k(e) || "closed" === e._state)
                                ) {
                                  var h = new TypeError(
                                    "the destination writable stream closed before all data could be piped to it"
                                  );
                                  !1 === a
                                    ? y(
                                        function () {
                                          return j(t, h);
                                        },
                                        !0,
                                        h
                                      )
                                    : v(!0, h);
                                }
                                function f() {
                                  var e = c;
                                  return c.then(function () {
                                    return e !== c ? f() : void 0;
                                  });
                                }
                                function m(e, t, n) {
                                  "errored" === e._state
                                    ? n(e._storedError)
                                    : t.catch(n).catch(b);
                                }
                                function y(t, n, o) {
                                  function i() {
                                    t()
                                      .then(
                                        function () {
                                          return _(n, o);
                                        },
                                        function (e) {
                                          return _(!0, e);
                                        }
                                      )
                                      .catch(b);
                                  }
                                  !0 !== l &&
                                    ((l = !0),
                                    "writable" === e._state && !1 === k(e)
                                      ? f().then(i)
                                      : i());
                                }
                                function v(t, n) {
                                  !0 !== l &&
                                    ((l = !0),
                                    "writable" === e._state && !1 === k(e)
                                      ? f()
                                          .then(function () {
                                            return _(t, n);
                                          })
                                          .catch(b)
                                      : _(t, n));
                                }
                                function _(e, t) {
                                  L(s), ne(r), e ? d(t) : n(void 0);
                                }
                                (function e() {
                                  return (
                                    (c = Promise.resolve()),
                                    !0 === l
                                      ? Promise.resolve()
                                      : s._readyPromise
                                          .then(function () {
                                            return oe(r).then(function (e) {
                                              var t = e.value;
                                              !0 !== e.done &&
                                                (c = I(s, t).catch(
                                                  function () {}
                                                ));
                                            });
                                          })
                                          .then(e)
                                  );
                                })().catch(function (e) {
                                  (c = Promise.resolve()), b(e);
                                });
                              });
                            },
                          },
                          {
                            key: "tee",
                            value: function () {
                              if (!1 === M(this)) throw De("tee");
                              var e = B(this, !1);
                              return f(e);
                            },
                          },
                          {
                            key: "locked",
                            get: function () {
                              if (!1 === M(this)) throw De("locked");
                              return N(this);
                            },
                          },
                        ]),
                        e
                      );
                    })();
                  function F(e) {
                    return new Q(e);
                  }
                  function R(e) {
                    return new X(e);
                  }
                  function M(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_readableStreamController"
                      )
                    );
                  }
                  function N(e) {
                    return (
                      _(
                        !0 === M(e),
                        "IsReadableStreamLocked should only be used on known readable streams"
                      ),
                      void 0 !== e._reader
                    );
                  }
                  function B(e, t) {
                    _(!0 === M(e)), _("boolean" == typeof t);
                    var n = R(e),
                      o = {
                        closedOrErrored: !1,
                        canceled1: !1,
                        canceled2: !1,
                        reason1: void 0,
                        reason2: void 0,
                      };
                    o.promise = new Promise(function (e) {
                      o._resolve = e;
                    });
                    var i = function e() {
                      var t = e._branch1,
                        n = e._branch2,
                        o = e._teeState;
                      return oe(e._reader).then(function (e) {
                        _(y(e));
                        var i = e.value,
                          a = e.done;
                        if (
                          (_("boolean" == typeof a),
                          !0 === a &&
                            !1 === o.closedOrErrored &&
                            (!1 === o.canceled1 && se(t),
                            !1 === o.canceled2 && se(n),
                            (o.closedOrErrored = !0)),
                          !0 !== o.closedOrErrored)
                        ) {
                          var r = i,
                            s = i;
                          !1 === o.canceled1 && le(t, r),
                            !1 === o.canceled2 && le(n, s);
                        }
                      });
                    };
                    (i._reader = n),
                      (i._teeState = o),
                      (i._cloneForBranch2 = t);
                    var a = function e(t) {
                      var n = e._stream,
                        o = e._teeState;
                      if (
                        ((o.canceled1 = !0),
                        (o.reason1 = t),
                        !0 === o.canceled2)
                      ) {
                        var i = j(n, f([o.reason1, o.reason2]));
                        o._resolve(i);
                      }
                      return o.promise;
                    };
                    (a._stream = e), (a._teeState = o);
                    var r = function e(t) {
                      var n = e._stream,
                        o = e._teeState;
                      if (
                        ((o.canceled2 = !0),
                        (o.reason2 = t),
                        !0 === o.canceled1)
                      ) {
                        var i = j(n, f([o.reason1, o.reason2]));
                        o._resolve(i);
                      }
                      return o.promise;
                    };
                    (r._stream = e), (r._teeState = o);
                    var s = Object.create(Object.prototype);
                    m(s, "pull", i), m(s, "cancel", a);
                    var l = new O(s),
                      c = Object.create(Object.prototype);
                    m(c, "pull", i), m(c, "cancel", r);
                    var d = new O(c);
                    return (
                      (i._branch1 = l._readableStreamController),
                      (i._branch2 = d._readableStreamController),
                      n._closedPromise.catch(function (e) {
                        !0 !== o.closedOrErrored &&
                          (ce(i._branch1, e),
                          ce(i._branch2, e),
                          (o.closedOrErrored = !0));
                      }),
                      [l, d]
                    );
                  }
                  function U(e) {
                    return (
                      _(!0 === J(e._reader)),
                      _("readable" === e._state || "closed" === e._state),
                      new Promise(function (t, n) {
                        var o = { _resolve: t, _reject: n };
                        e._reader._readIntoRequests.push(o);
                      })
                    );
                  }
                  function $(e) {
                    return (
                      _(!0 === Z(e._reader)),
                      _("readable" === e._state),
                      new Promise(function (t, n) {
                        var o = { _resolve: t, _reject: n };
                        e._reader._readRequests.push(o);
                      })
                    );
                  }
                  function j(e, t) {
                    return (
                      (e._disturbed = !0),
                      "closed" === e._state
                        ? Promise.resolve(void 0)
                        : "errored" === e._state
                        ? Promise.reject(e._storedError)
                        : (K(e),
                          e._readableStreamController
                            .__cancelSteps(t)
                            .then(function () {}))
                    );
                  }
                  function K(e) {
                    _("readable" === e._state), (e._state = "closed");
                    var t = e._reader;
                    if (void 0 !== t) {
                      if (!0 === Z(t)) {
                        for (var n = 0; n < t._readRequests.length; n++)
                          (0, t._readRequests[n]._resolve)(s(void 0, !0));
                        t._readRequests = [];
                      }
                      !(function (e) {
                        _(void 0 !== e._closedPromise_resolve),
                          _(void 0 !== e._closedPromise_reject),
                          e._closedPromise_resolve(void 0),
                          (e._closedPromise_resolve = void 0),
                          (e._closedPromise_reject = void 0);
                      })(t);
                    }
                  }
                  function V(e, t) {
                    _(!0 === M(e), "stream must be ReadableStream"),
                      _("readable" === e._state, "state must be readable"),
                      (e._state = "errored"),
                      (e._storedError = t);
                    var n = e._reader;
                    if (void 0 !== n) {
                      if (!0 === Z(n)) {
                        for (var o = 0; o < n._readRequests.length; o++)
                          n._readRequests[o]._reject(t);
                        n._readRequests = [];
                      } else {
                        _(J(n), "reader must be ReadableStreamBYOBReader");
                        for (var i = 0; i < n._readIntoRequests.length; i++)
                          n._readIntoRequests[i]._reject(t);
                        n._readIntoRequests = [];
                      }
                      ke(n, t), n._closedPromise.catch(function () {});
                    }
                  }
                  function H(e, t, n) {
                    var o = e._reader;
                    _(o._readRequests.length > 0),
                      o._readRequests.shift()._resolve(s(t, n));
                  }
                  function W(e) {
                    return e._reader._readIntoRequests.length;
                  }
                  function z(e) {
                    return e._reader._readRequests.length;
                  }
                  function q(e) {
                    var t = e._reader;
                    return void 0 !== t && !1 !== J(t);
                  }
                  function Y(e) {
                    var t = e._reader;
                    return void 0 !== t && !1 !== Z(t);
                  }
                  e.exports = {
                    ReadableStream: O,
                    IsReadableStreamDisturbed: function (e) {
                      return (
                        _(
                          !0 === M(e),
                          "IsReadableStreamDisturbed should only be used on known readable streams"
                        ),
                        e._disturbed
                      );
                    },
                    ReadableStreamDefaultControllerClose: se,
                    ReadableStreamDefaultControllerEnqueue: le,
                    ReadableStreamDefaultControllerError: ce,
                    ReadableStreamDefaultControllerGetDesiredSize: ue,
                  };
                  var X = (function () {
                      function e(t) {
                        if ((i(this, e), !1 === M(t)))
                          throw new TypeError(
                            "ReadableStreamDefaultReader can only be constructed with a ReadableStream instance"
                          );
                        if (!0 === N(t))
                          throw new TypeError(
                            "This stream has already been locked for exclusive reading by another reader"
                          );
                        ee(this, t), (this._readRequests = []);
                      }
                      return (
                        o(e, [
                          {
                            key: "cancel",
                            value: function (e) {
                              return !1 === Z(this)
                                ? Promise.reject(Ie("cancel"))
                                : void 0 === this._ownerReadableStream
                                ? Promise.reject(Le("cancel"))
                                : te(this, e);
                            },
                          },
                          {
                            key: "read",
                            value: function () {
                              return !1 === Z(this)
                                ? Promise.reject(Ie("read"))
                                : void 0 === this._ownerReadableStream
                                ? Promise.reject(Le("read from"))
                                : oe(this);
                            },
                          },
                          {
                            key: "releaseLock",
                            value: function () {
                              if (!1 === Z(this)) throw Ie("releaseLock");
                              if (void 0 !== this._ownerReadableStream) {
                                if (this._readRequests.length > 0)
                                  throw new TypeError(
                                    "Tried to release a reader lock when that reader has pending read() calls un-settled"
                                  );
                                ne(this);
                              }
                            },
                          },
                          {
                            key: "closed",
                            get: function () {
                              return !1 === Z(this)
                                ? Promise.reject(Ie("closed"))
                                : this._closedPromise;
                            },
                          },
                        ]),
                        e
                      );
                    })(),
                    Q = (function () {
                      function e(t) {
                        if ((i(this, e), !M(t)))
                          throw new TypeError(
                            "ReadableStreamBYOBReader can only be constructed with a ReadableStream instance given a byte source"
                          );
                        if (!1 === he(t._readableStreamController))
                          throw new TypeError(
                            "Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source"
                          );
                        if (N(t))
                          throw new TypeError(
                            "This stream has already been locked for exclusive reading by another reader"
                          );
                        ee(this, t), (this._readIntoRequests = []);
                      }
                      return (
                        o(e, [
                          {
                            key: "cancel",
                            value: function (e) {
                              return J(this)
                                ? void 0 === this._ownerReadableStream
                                  ? Promise.reject(Le("cancel"))
                                  : te(this, e)
                                : Promise.reject(Oe("cancel"));
                            },
                          },
                          {
                            key: "read",
                            value: function (e) {
                              return J(this)
                                ? void 0 === this._ownerReadableStream
                                  ? Promise.reject(Le("read from"))
                                  : ArrayBuffer.isView(e)
                                  ? 0 === e.byteLength
                                    ? Promise.reject(
                                        new TypeError(
                                          "view must have non-zero byteLength"
                                        )
                                      )
                                    : (function (e, t) {
                                        var n = e._ownerReadableStream;
                                        return (
                                          _(void 0 !== n),
                                          (n._disturbed = !0),
                                          "errored" === n._state
                                            ? Promise.reject(n._storedError)
                                            : (function (e, t) {
                                                var n =
                                                    e._controlledReadableStream,
                                                  o = 1;
                                                t.constructor !== DataView &&
                                                  (o =
                                                    t.constructor
                                                      .BYTES_PER_ELEMENT);
                                                var i = t.constructor,
                                                  a = {
                                                    buffer: t.buffer,
                                                    byteOffset: t.byteOffset,
                                                    byteLength: t.byteLength,
                                                    bytesFilled: 0,
                                                    elementSize: o,
                                                    ctor: i,
                                                    readerType: "byob",
                                                  };
                                                if (
                                                  e._pendingPullIntos.length > 0
                                                )
                                                  return (
                                                    (a.buffer = u(a.buffer)),
                                                    e._pendingPullIntos.push(a),
                                                    U(n)
                                                  );
                                                if ("closed" === n._state) {
                                                  var r = new t.constructor(
                                                    a.buffer,
                                                    a.byteOffset,
                                                    0
                                                  );
                                                  return Promise.resolve(
                                                    s(r, !0)
                                                  );
                                                }
                                                if (e._queueTotalSize > 0) {
                                                  if (!0 === we(e, a)) {
                                                    var l = _e(a);
                                                    return (
                                                      xe(e),
                                                      Promise.resolve(s(l, !1))
                                                    );
                                                  }
                                                  if (
                                                    !0 === e._closeRequested
                                                  ) {
                                                    var c = new TypeError(
                                                      "Insufficient bytes to fill elements in the given buffer"
                                                    );
                                                    return (
                                                      Ge(e, c),
                                                      Promise.reject(c)
                                                    );
                                                  }
                                                }
                                                (a.buffer = u(a.buffer)),
                                                  e._pendingPullIntos.push(a);
                                                var d = U(n);
                                                return me(e), d;
                                              })(n._readableStreamController, t)
                                        );
                                      })(this, e)
                                  : Promise.reject(
                                      new TypeError(
                                        "view must be an array buffer view"
                                      )
                                    )
                                : Promise.reject(Oe("read"));
                            },
                          },
                          {
                            key: "releaseLock",
                            value: function () {
                              if (!J(this)) throw Oe("releaseLock");
                              if (void 0 !== this._ownerReadableStream) {
                                if (this._readIntoRequests.length > 0)
                                  throw new TypeError(
                                    "Tried to release a reader lock when that reader has pending read() calls un-settled"
                                  );
                                ne(this);
                              }
                            },
                          },
                          {
                            key: "closed",
                            get: function () {
                              return J(this)
                                ? this._closedPromise
                                : Promise.reject(Oe("closed"));
                            },
                          },
                        ]),
                        e
                      );
                    })();
                  function J(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_readIntoRequests"
                      )
                    );
                  }
                  function Z(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(e, "_readRequests")
                    );
                  }
                  function ee(e, t) {
                    (e._ownerReadableStream = t),
                      (t._reader = e),
                      "readable" === t._state
                        ? (function (e) {
                            e._closedPromise = new Promise(function (t, n) {
                              (e._closedPromise_resolve = t),
                                (e._closedPromise_reject = n);
                            });
                          })(e)
                        : "closed" === t._state
                        ? (function (e) {
                            (e._closedPromise = Promise.resolve(void 0)),
                              (e._closedPromise_resolve = void 0),
                              (e._closedPromise_reject = void 0);
                          })(e)
                        : (_("errored" === t._state, "state must be errored"),
                          (function (e, t) {
                            (e._closedPromise = Promise.reject(t)),
                              (e._closedPromise_resolve = void 0),
                              (e._closedPromise_reject = void 0);
                          })(e, t._storedError),
                          e._closedPromise.catch(function () {}));
                  }
                  function te(e, t) {
                    var n = e._ownerReadableStream;
                    return _(void 0 !== n), j(n, t);
                  }
                  function ne(e) {
                    _(void 0 !== e._ownerReadableStream),
                      _(e._ownerReadableStream._reader === e),
                      "readable" === e._ownerReadableStream._state
                        ? ke(
                            e,
                            new TypeError(
                              "Reader was released and can no longer be used to monitor the stream's closedness"
                            )
                          )
                        : (function (e, t) {
                            _(void 0 === e._closedPromise_resolve),
                              _(void 0 === e._closedPromise_reject),
                              (e._closedPromise = Promise.reject(t));
                          })(
                            e,
                            new TypeError(
                              "Reader was released and can no longer be used to monitor the stream's closedness"
                            )
                          ),
                      e._closedPromise.catch(function () {}),
                      (e._ownerReadableStream._reader = void 0),
                      (e._ownerReadableStream = void 0);
                  }
                  function oe(e) {
                    var t = e._ownerReadableStream;
                    return (
                      _(void 0 !== t),
                      (t._disturbed = !0),
                      "closed" === t._state
                        ? Promise.resolve(s(void 0, !0))
                        : "errored" === t._state
                        ? Promise.reject(t._storedError)
                        : (_("readable" === t._state),
                          t._readableStreamController.__pullSteps())
                    );
                  }
                  var ie = (function () {
                    function e(t, n, o, a) {
                      if ((i(this, e), !1 === M(t)))
                        throw new TypeError(
                          "ReadableStreamDefaultController can only be constructed with a ReadableStream instance"
                        );
                      if (void 0 !== t._readableStreamController)
                        throw new TypeError(
                          "ReadableStreamDefaultController instances can only be created by the ReadableStream constructor"
                        );
                      (this._controlledReadableStream = t),
                        (this._underlyingSource = n),
                        (this._queue = void 0),
                        (this._queueTotalSize = void 0),
                        S(this),
                        (this._started = !1),
                        (this._closeRequested = !1),
                        (this._pullAgain = !1),
                        (this._pulling = !1);
                      var r = p(o, a);
                      (this._strategySize = r.size),
                        (this._strategyHWM = r.highWaterMark);
                      var s = this,
                        l = c(n, "start", [this]);
                      Promise.resolve(l)
                        .then(
                          function () {
                            (s._started = !0),
                              _(!1 === s._pulling),
                              _(!1 === s._pullAgain),
                              re(s);
                          },
                          function (e) {
                            de(s, e);
                          }
                        )
                        .catch(b);
                    }
                    return (
                      o(e, [
                        {
                          key: "close",
                          value: function () {
                            if (!1 === ae(this)) throw Fe("close");
                            if (!0 === this._closeRequested)
                              throw new TypeError(
                                "The stream has already been closed; do not close it again!"
                              );
                            var e = this._controlledReadableStream._state;
                            if ("readable" !== e)
                              throw new TypeError(
                                "The stream (in " +
                                  e +
                                  " state) is not in the readable state and cannot be closed"
                              );
                            se(this);
                          },
                        },
                        {
                          key: "enqueue",
                          value: function (e) {
                            if (!1 === ae(this)) throw Fe("enqueue");
                            if (!0 === this._closeRequested)
                              throw new TypeError(
                                "stream is closed or draining"
                              );
                            var t = this._controlledReadableStream._state;
                            if ("readable" !== t)
                              throw new TypeError(
                                "The stream (in " +
                                  t +
                                  " state) is not in the readable state and cannot be enqueued to"
                              );
                            return le(this, e);
                          },
                        },
                        {
                          key: "error",
                          value: function (e) {
                            if (!1 === ae(this)) throw Fe("error");
                            var t = this._controlledReadableStream;
                            if ("readable" !== t._state)
                              throw new TypeError(
                                "The stream is " +
                                  t._state +
                                  " and so cannot be errored"
                              );
                            ce(this, e);
                          },
                        },
                        {
                          key: "__cancelSteps",
                          value: function (e) {
                            return (
                              S(this), d(this._underlyingSource, "cancel", [e])
                            );
                          },
                        },
                        {
                          key: "__pullSteps",
                          value: function () {
                            var e = this._controlledReadableStream;
                            if (this._queue.length > 0) {
                              var t = C(this);
                              return (
                                !0 === this._closeRequested &&
                                0 === this._queue.length
                                  ? K(e)
                                  : re(this),
                                Promise.resolve(s(t, !1))
                              );
                            }
                            var n = $(e);
                            return re(this), n;
                          },
                        },
                        {
                          key: "desiredSize",
                          get: function () {
                            if (!1 === ae(this)) throw Fe("desiredSize");
                            return ue(this);
                          },
                        },
                      ]),
                      e
                    );
                  })();
                  function ae(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_underlyingSource"
                      )
                    );
                  }
                  function re(e) {
                    !1 !==
                      (function (e) {
                        var t = e._controlledReadableStream;
                        return (
                          "closed" !== t._state &&
                          "errored" !== t._state &&
                          !0 !== e._closeRequested &&
                          !1 !== e._started &&
                          ((!0 === N(t) && z(t) > 0) || ue(e) > 0)
                        );
                      })(e) &&
                      (!0 !== e._pulling
                        ? (_(!1 === e._pullAgain),
                          (e._pulling = !0),
                          d(e._underlyingSource, "pull", [e])
                            .then(
                              function () {
                                if (((e._pulling = !1), !0 === e._pullAgain))
                                  return (e._pullAgain = !1), re(e);
                              },
                              function (t) {
                                de(e, t);
                              }
                            )
                            .catch(b))
                        : (e._pullAgain = !0));
                  }
                  function se(e) {
                    var t = e._controlledReadableStream;
                    _(!1 === e._closeRequested),
                      _("readable" === t._state),
                      (e._closeRequested = !0),
                      0 === e._queue.length && K(t);
                  }
                  function le(e, t) {
                    var n = e._controlledReadableStream;
                    if (
                      (_(!1 === e._closeRequested),
                      _("readable" === n._state),
                      !0 === N(n) && z(n) > 0)
                    )
                      H(n, t, !1);
                    else {
                      var o = 1;
                      if (void 0 !== e._strategySize) {
                        var i = e._strategySize;
                        try {
                          o = i(t);
                        } catch (t) {
                          throw (de(e, t), t);
                        }
                      }
                      try {
                        x(e, t, o);
                      } catch (t) {
                        throw (de(e, t), t);
                      }
                    }
                    re(e);
                  }
                  function ce(e, t) {
                    var n = e._controlledReadableStream;
                    _("readable" === n._state), S(e), V(n, t);
                  }
                  function de(e, t) {
                    "readable" === e._controlledReadableStream._state &&
                      ce(e, t);
                  }
                  function ue(e) {
                    var t = e._controlledReadableStream._state;
                    return "errored" === t
                      ? null
                      : "closed" === t
                      ? 0
                      : e._strategyHWM - e._queueTotalSize;
                  }
                  var pe = (function () {
                      function e(t, n) {
                        i(this, e),
                          (this._associatedReadableByteStreamController = t),
                          (this._view = n);
                      }
                      return (
                        o(e, [
                          {
                            key: "respond",
                            value: function (e) {
                              if (!1 === fe(this)) throw Re("respond");
                              if (
                                void 0 ===
                                this._associatedReadableByteStreamController
                              )
                                throw new TypeError(
                                  "This BYOB request has been invalidated"
                                );
                              !(function (e, t) {
                                if (((t = Number(t)), !1 === l(t)))
                                  throw new RangeError(
                                    "bytesWritten must be a finite"
                                  );
                                _(e._pendingPullIntos.length > 0), Ae(e, t);
                              })(
                                this._associatedReadableByteStreamController,
                                e
                              );
                            },
                          },
                          {
                            key: "respondWithNewView",
                            value: function (e) {
                              if (!1 === fe(this)) throw Re("respond");
                              if (
                                void 0 ===
                                this._associatedReadableByteStreamController
                              )
                                throw new TypeError(
                                  "This BYOB request has been invalidated"
                                );
                              if (!ArrayBuffer.isView(e))
                                throw new TypeError(
                                  "You can only respond with array buffer views"
                                );
                              !(function (e, t) {
                                _(e._pendingPullIntos.length > 0);
                                var n = e._pendingPullIntos[0];
                                if (
                                  n.byteOffset + n.bytesFilled !==
                                  t.byteOffset
                                )
                                  throw new RangeError(
                                    "The region specified by view does not match byobRequest"
                                  );
                                if (n.byteLength !== t.byteLength)
                                  throw new RangeError(
                                    "The buffer of view has different capacity than byobRequest"
                                  );
                                (n.buffer = t.buffer), Ae(e, t.byteLength);
                              })(
                                this._associatedReadableByteStreamController,
                                e
                              );
                            },
                          },
                          {
                            key: "view",
                            get: function () {
                              return this._view;
                            },
                          },
                        ]),
                        e
                      );
                    })(),
                    ge = (function () {
                      function e(t, n, o) {
                        if ((i(this, e), !1 === M(t)))
                          throw new TypeError(
                            "ReadableByteStreamController can only be constructed with a ReadableStream instance given a byte source"
                          );
                        if (void 0 !== t._readableStreamController)
                          throw new TypeError(
                            "ReadableByteStreamController instances can only be created by the ReadableStream constructor given a byte source"
                          );
                        (this._controlledReadableStream = t),
                          (this._underlyingByteSource = n),
                          (this._pullAgain = !1),
                          (this._pulling = !1),
                          ye(this),
                          (this._queue = this._queueTotalSize = void 0),
                          S(this),
                          (this._closeRequested = !1),
                          (this._started = !1),
                          (this._strategyHWM = g(o));
                        var a = n.autoAllocateChunkSize;
                        if (
                          void 0 !== a &&
                          (!1 === Number.isInteger(a) || a <= 0)
                        )
                          throw new RangeError(
                            "autoAllocateChunkSize must be a positive integer"
                          );
                        (this._autoAllocateChunkSize = a),
                          (this._pendingPullIntos = []);
                        var r = this,
                          s = c(n, "start", [this]);
                        Promise.resolve(s)
                          .then(
                            function () {
                              (r._started = !0),
                                _(!1 === r._pulling),
                                _(!1 === r._pullAgain),
                                me(r);
                            },
                            function (e) {
                              "readable" === t._state && Ge(r, e);
                            }
                          )
                          .catch(b);
                      }
                      return (
                        o(e, [
                          {
                            key: "close",
                            value: function () {
                              if (!1 === he(this)) throw Me("close");
                              if (!0 === this._closeRequested)
                                throw new TypeError(
                                  "The stream has already been closed; do not close it again!"
                                );
                              var e = this._controlledReadableStream._state;
                              if ("readable" !== e)
                                throw new TypeError(
                                  "The stream (in " +
                                    e +
                                    " state) is not in the readable state and cannot be closed"
                                );
                              !(function (e) {
                                var t = e._controlledReadableStream;
                                if (
                                  (_(!1 === e._closeRequested),
                                  _("readable" === t._state),
                                  e._queueTotalSize > 0)
                                )
                                  e._closeRequested = !0;
                                else {
                                  if (
                                    e._pendingPullIntos.length > 0 &&
                                    e._pendingPullIntos[0].bytesFilled > 0
                                  ) {
                                    var n = new TypeError(
                                      "Insufficient bytes to fill elements in the given buffer"
                                    );
                                    throw (Ge(e, n), n);
                                  }
                                  K(t);
                                }
                              })(this);
                            },
                          },
                          {
                            key: "enqueue",
                            value: function (e) {
                              if (!1 === he(this)) throw Me("enqueue");
                              if (!0 === this._closeRequested)
                                throw new TypeError(
                                  "stream is closed or draining"
                                );
                              var t = this._controlledReadableStream._state;
                              if ("readable" !== t)
                                throw new TypeError(
                                  "The stream (in " +
                                    t +
                                    " state) is not in the readable state and cannot be enqueued to"
                                );
                              if (!ArrayBuffer.isView(e))
                                throw new TypeError(
                                  "You can only enqueue array buffer views when using a ReadableByteStreamController"
                                );
                              !(function (e, t) {
                                var n = e._controlledReadableStream;
                                _(!1 === e._closeRequested),
                                  _("readable" === n._state);
                                var o = t.buffer,
                                  i = t.byteOffset,
                                  a = t.byteLength,
                                  r = u(o);
                                if (!0 === Y(n))
                                  if (0 === z(n)) be(e, r, i, a);
                                  else {
                                    _(0 === e._queue.length);
                                    var s = new Uint8Array(r, i, a);
                                    H(n, s, !1);
                                  }
                                else
                                  !0 === q(n)
                                    ? (be(e, r, i, a), Ee(e))
                                    : (_(
                                        !1 === N(n),
                                        "stream must not be locked"
                                      ),
                                      be(e, r, i, a));
                              })(this, e);
                            },
                          },
                          {
                            key: "error",
                            value: function (e) {
                              if (!1 === he(this)) throw Me("error");
                              var t = this._controlledReadableStream;
                              if ("readable" !== t._state)
                                throw new TypeError(
                                  "The stream is " +
                                    t._state +
                                    " and so cannot be errored"
                                );
                              Ge(this, e);
                            },
                          },
                          {
                            key: "__cancelSteps",
                            value: function (e) {
                              return (
                                this._pendingPullIntos.length > 0 &&
                                  (this._pendingPullIntos[0].bytesFilled = 0),
                                S(this),
                                d(this._underlyingByteSource, "cancel", [e])
                              );
                            },
                          },
                          {
                            key: "__pullSteps",
                            value: function () {
                              var e = this._controlledReadableStream;
                              if ((_(!0 === Y(e)), this._queueTotalSize > 0)) {
                                _(0 === z(e));
                                var t = this._queue.shift();
                                (this._queueTotalSize -= t.byteLength),
                                  xe(this);
                                var n = void 0;
                                try {
                                  n = new Uint8Array(
                                    t.buffer,
                                    t.byteOffset,
                                    t.byteLength
                                  );
                                } catch (e) {
                                  return Promise.reject(e);
                                }
                                return Promise.resolve(s(n, !1));
                              }
                              var o = this._autoAllocateChunkSize;
                              if (void 0 !== o) {
                                var i = void 0;
                                try {
                                  i = new ArrayBuffer(o);
                                } catch (e) {
                                  return Promise.reject(e);
                                }
                                var a = {
                                  buffer: i,
                                  byteOffset: 0,
                                  byteLength: o,
                                  bytesFilled: 0,
                                  elementSize: 1,
                                  ctor: Uint8Array,
                                  readerType: "default",
                                };
                                this._pendingPullIntos.push(a);
                              }
                              var r = $(e);
                              return me(this), r;
                            },
                          },
                          {
                            key: "byobRequest",
                            get: function () {
                              if (!1 === he(this)) throw Me("byobRequest");
                              if (
                                void 0 === this._byobRequest &&
                                this._pendingPullIntos.length > 0
                              ) {
                                var e = this._pendingPullIntos[0],
                                  t = new Uint8Array(
                                    e.buffer,
                                    e.byteOffset + e.bytesFilled,
                                    e.byteLength - e.bytesFilled
                                  );
                                this._byobRequest = new pe(this, t);
                              }
                              return this._byobRequest;
                            },
                          },
                          {
                            key: "desiredSize",
                            get: function () {
                              if (!1 === he(this)) throw Me("desiredSize");
                              return Pe(this);
                            },
                          },
                        ]),
                        e
                      );
                    })();
                  function he(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_underlyingByteSource"
                      )
                    );
                  }
                  function fe(e) {
                    return (
                      !!y(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_associatedReadableByteStreamController"
                      )
                    );
                  }
                  function me(e) {
                    !1 !==
                      (function (e) {
                        var t = e._controlledReadableStream;
                        return (
                          "readable" === t._state &&
                          !0 !== e._closeRequested &&
                          !1 !== e._started &&
                          ((!0 === Y(t) && z(t) > 0) ||
                            (!0 === q(t) && W(t) > 0) ||
                            Pe(e) > 0)
                        );
                      })(e) &&
                      (!0 !== e._pulling
                        ? (_(!1 === e._pullAgain),
                          (e._pulling = !0),
                          d(e._underlyingByteSource, "pull", [e])
                            .then(
                              function () {
                                (e._pulling = !1),
                                  !0 === e._pullAgain &&
                                    ((e._pullAgain = !1), me(e));
                              },
                              function (t) {
                                "readable" ===
                                  e._controlledReadableStream._state &&
                                  Ge(e, t);
                              }
                            )
                            .catch(b))
                        : (e._pullAgain = !0));
                  }
                  function ye(e) {
                    Se(e), (e._pendingPullIntos = []);
                  }
                  function ve(e, t) {
                    _("errored" !== e._state, "state must not be errored");
                    var n = !1;
                    "closed" === e._state && (_(0 === t.bytesFilled), (n = !0));
                    var o = _e(t);
                    "default" === t.readerType
                      ? H(e, o, n)
                      : (_("byob" === t.readerType),
                        (function (e, t, n) {
                          var o = e._reader;
                          _(o._readIntoRequests.length > 0),
                            o._readIntoRequests.shift()._resolve(s(t, n));
                        })(e, o, n));
                  }
                  function _e(e) {
                    var t = e.bytesFilled,
                      n = e.elementSize;
                    return (
                      _(t <= e.byteLength),
                      _(t % n == 0),
                      new e.ctor(e.buffer, e.byteOffset, t / n)
                    );
                  }
                  function be(e, t, n, o) {
                    e._queue.push({ buffer: t, byteOffset: n, byteLength: o }),
                      (e._queueTotalSize += o);
                  }
                  function we(e, t) {
                    var n = t.elementSize,
                      o = t.bytesFilled - (t.bytesFilled % n),
                      i = Math.min(
                        e._queueTotalSize,
                        t.byteLength - t.bytesFilled
                      ),
                      a = t.bytesFilled + i,
                      s = a - (a % n),
                      l = i,
                      c = !1;
                    s > o && ((l = s - t.bytesFilled), (c = !0));
                    for (var d = e._queue; l > 0; ) {
                      var u = d[0],
                        p = Math.min(l, u.byteLength),
                        g = t.byteOffset + t.bytesFilled;
                      r(t.buffer, g, u.buffer, u.byteOffset, p),
                        u.byteLength === p
                          ? d.shift()
                          : ((u.byteOffset += p), (u.byteLength -= p)),
                        (e._queueTotalSize -= p),
                        Ce(e, p, t),
                        (l -= p);
                    }
                    return (
                      !1 === c &&
                        (_(0 === e._queueTotalSize, "queue must be empty"),
                        _(t.bytesFilled > 0),
                        _(t.bytesFilled < t.elementSize)),
                      c
                    );
                  }
                  function Ce(e, t, n) {
                    _(
                      0 === e._pendingPullIntos.length ||
                        e._pendingPullIntos[0] === n
                    ),
                      Se(e),
                      (n.bytesFilled += t);
                  }
                  function xe(e) {
                    _("readable" === e._controlledReadableStream._state),
                      0 === e._queueTotalSize && !0 === e._closeRequested
                        ? K(e._controlledReadableStream)
                        : me(e);
                  }
                  function Se(e) {
                    void 0 !== e._byobRequest &&
                      ((e._byobRequest._associatedReadableByteStreamController =
                        void 0),
                      (e._byobRequest._view = void 0),
                      (e._byobRequest = void 0));
                  }
                  function Ee(e) {
                    for (
                      _(!1 === e._closeRequested);
                      e._pendingPullIntos.length > 0;

                    ) {
                      if (0 === e._queueTotalSize) return;
                      var t = e._pendingPullIntos[0];
                      !0 === we(e, t) &&
                        (Te(e), ve(e._controlledReadableStream, t));
                    }
                  }
                  function Ae(e, t) {
                    var n = e._pendingPullIntos[0],
                      o = e._controlledReadableStream;
                    if ("closed" === o._state) {
                      if (0 !== t)
                        throw new TypeError(
                          "bytesWritten must be 0 when calling respond() on a closed stream"
                        );
                      !(function (e, t) {
                        (t.buffer = u(t.buffer)),
                          _(0 === t.bytesFilled, "bytesFilled must be 0");
                        var n = e._controlledReadableStream;
                        if (!0 === q(n)) for (; W(n) > 0; ) ve(n, Te(e));
                      })(e, n);
                    } else
                      _("readable" === o._state),
                        (function (e, t, n) {
                          if (n.bytesFilled + t > n.byteLength)
                            throw new RangeError("bytesWritten out of range");
                          if ((Ce(e, t, n), !(n.bytesFilled < n.elementSize))) {
                            Te(e);
                            var o = n.bytesFilled % n.elementSize;
                            if (o > 0) {
                              var i = n.byteOffset + n.bytesFilled,
                                a = n.buffer.slice(i - o, i);
                              be(e, a, 0, a.byteLength);
                            }
                            (n.buffer = u(n.buffer)),
                              (n.bytesFilled -= o),
                              ve(e._controlledReadableStream, n),
                              Ee(e);
                          }
                        })(e, t, n);
                  }
                  function Te(e) {
                    var t = e._pendingPullIntos.shift();
                    return Se(e), t;
                  }
                  function Ge(e, t) {
                    var n = e._controlledReadableStream;
                    _("readable" === n._state), ye(e), S(e), V(n, t);
                  }
                  function Pe(e) {
                    var t = e._controlledReadableStream._state;
                    return "errored" === t
                      ? null
                      : "closed" === t
                      ? 0
                      : e._strategyHWM - e._queueTotalSize;
                  }
                  function De(e) {
                    return new TypeError(
                      "ReadableStream.prototype." +
                        e +
                        " can only be used on a ReadableStream"
                    );
                  }
                  function Le(e) {
                    return new TypeError(
                      "Cannot " + e + " a stream using a released reader"
                    );
                  }
                  function Ie(e) {
                    return new TypeError(
                      "ReadableStreamDefaultReader.prototype." +
                        e +
                        " can only be used on a ReadableStreamDefaultReader"
                    );
                  }
                  function ke(e, t) {
                    _(void 0 !== e._closedPromise_resolve),
                      _(void 0 !== e._closedPromise_reject),
                      e._closedPromise_reject(t),
                      (e._closedPromise_resolve = void 0),
                      (e._closedPromise_reject = void 0);
                  }
                  function Oe(e) {
                    return new TypeError(
                      "ReadableStreamBYOBReader.prototype." +
                        e +
                        " can only be used on a ReadableStreamBYOBReader"
                    );
                  }
                  function Fe(e) {
                    return new TypeError(
                      "ReadableStreamDefaultController.prototype." +
                        e +
                        " can only be used on a ReadableStreamDefaultController"
                    );
                  }
                  function Re(e) {
                    return new TypeError(
                      "ReadableStreamBYOBRequest.prototype." +
                        e +
                        " can only be used on a ReadableStreamBYOBRequest"
                    );
                  }
                  function Me(e) {
                    return new TypeError(
                      "ReadableByteStreamController.prototype." +
                        e +
                        " can only be used on a ReadableByteStreamController"
                    );
                  }
                },
                function (e, t, n) {
                  var o = n(6),
                    i = n(4),
                    a = n(2);
                  (t.TransformStream = o.TransformStream),
                    (t.ReadableStream = i.ReadableStream),
                    (t.IsReadableStreamDisturbed = i.IsReadableStreamDisturbed),
                    (t.ReadableStreamDefaultControllerClose =
                      i.ReadableStreamDefaultControllerClose),
                    (t.ReadableStreamDefaultControllerEnqueue =
                      i.ReadableStreamDefaultControllerEnqueue),
                    (t.ReadableStreamDefaultControllerError =
                      i.ReadableStreamDefaultControllerError),
                    (t.ReadableStreamDefaultControllerGetDesiredSize =
                      i.ReadableStreamDefaultControllerGetDesiredSize),
                    (t.AcquireWritableStreamDefaultWriter =
                      a.AcquireWritableStreamDefaultWriter),
                    (t.IsWritableStream = a.IsWritableStream),
                    (t.IsWritableStreamLocked = a.IsWritableStreamLocked),
                    (t.WritableStream = a.WritableStream),
                    (t.WritableStreamAbort = a.WritableStreamAbort),
                    (t.WritableStreamDefaultControllerError =
                      a.WritableStreamDefaultControllerError),
                    (t.WritableStreamDefaultWriterCloseWithErrorPropagation =
                      a.WritableStreamDefaultWriterCloseWithErrorPropagation),
                    (t.WritableStreamDefaultWriterRelease =
                      a.WritableStreamDefaultWriterRelease),
                    (t.WritableStreamDefaultWriterWrite =
                      a.WritableStreamDefaultWriterWrite);
                },
                function (e, t, n) {
                  var o = (function () {
                    function e(e, t) {
                      for (var n = 0; n < t.length; n++) {
                        var o = t[n];
                        (o.enumerable = o.enumerable || !1),
                          (o.configurable = !0),
                          "value" in o && (o.writable = !0),
                          Object.defineProperty(e, o.key, o);
                      }
                    }
                    return function (t, n, o) {
                      return n && e(t.prototype, n), o && e(t, o), t;
                    };
                  })();
                  function i(e, t) {
                    if (!(e instanceof t))
                      throw new TypeError("Cannot call a class as a function");
                  }
                  var a = n(1).assert,
                    r = n(0),
                    s = r.InvokeOrNoop,
                    l = r.PromiseInvokeOrPerformFallback,
                    c = r.PromiseInvokeOrNoop,
                    d = r.typeIsObject,
                    u = n(4),
                    p = u.ReadableStream,
                    g = u.ReadableStreamDefaultControllerClose,
                    h = u.ReadableStreamDefaultControllerEnqueue,
                    f = u.ReadableStreamDefaultControllerError,
                    m = u.ReadableStreamDefaultControllerGetDesiredSize,
                    y = n(2),
                    v = y.WritableStream,
                    _ = y.WritableStreamDefaultControllerError;
                  function b(e, t) {
                    if (!0 === e._errored)
                      throw new TypeError("TransformStream is already errored");
                    if (!0 === e._readableClosed)
                      throw new TypeError("Readable side is already closed");
                    var n = e._readableController;
                    try {
                      h(n, t);
                    } catch (t) {
                      throw ((e._readableClosed = !0), C(e, t), e._storedError);
                    }
                    !0 == m(n) <= 0 && !1 === e._backpressure && E(e, !0);
                  }
                  function w(e) {
                    a(!1 === e._errored), a(!1 === e._readableClosed);
                    try {
                      g(e._readableController);
                    } catch (e) {
                      a(!1);
                    }
                    e._readableClosed = !0;
                  }
                  function C(e, t) {
                    !1 === e._errored && x(e, t);
                  }
                  function x(e, t) {
                    a(!1 === e._errored),
                      (e._errored = !0),
                      (e._storedError = t),
                      !1 === e._writableDone && _(e._writableController, t),
                      !1 === e._readableClosed && f(e._readableController, t);
                  }
                  function S(e) {
                    return (
                      a(
                        void 0 !== e._backpressureChangePromise,
                        "_backpressureChangePromise should have been initialized"
                      ),
                      !1 === e._backpressure
                        ? Promise.resolve()
                        : (a(
                            !0 === e._backpressure,
                            "_backpressure should have been initialized"
                          ),
                          e._backpressureChangePromise)
                    );
                  }
                  function E(e, t) {
                    a(
                      e._backpressure !== t,
                      "TransformStreamSetBackpressure() should be called only when backpressure is changed"
                    ),
                      void 0 !== e._backpressureChangePromise &&
                        e._backpressureChangePromise_resolve(t),
                      (e._backpressureChangePromise = new Promise(function (t) {
                        e._backpressureChangePromise_resolve = t;
                      })),
                      e._backpressureChangePromise.then(function (e) {
                        a(
                          e !== t,
                          "_backpressureChangePromise should be fulfilled only when backpressure is changed"
                        );
                      }),
                      (e._backpressure = t);
                  }
                  function A(e, t) {
                    return (
                      b(t._controlledTransformStream, e), Promise.resolve()
                    );
                  }
                  function T(e) {
                    return (
                      !!d(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_controlledTransformStream"
                      )
                    );
                  }
                  function G(e) {
                    return (
                      !!d(e) &&
                      !!Object.prototype.hasOwnProperty.call(
                        e,
                        "_transformStreamController"
                      )
                    );
                  }
                  var P = (function () {
                      function e(t, n) {
                        i(this, e),
                          (this._transformStream = t),
                          (this._startPromise = n);
                      }
                      return (
                        o(e, [
                          {
                            key: "start",
                            value: function (e) {
                              var t = this._transformStream;
                              return (
                                (t._writableController = e),
                                this._startPromise.then(function () {
                                  return S(t);
                                })
                              );
                            },
                          },
                          {
                            key: "write",
                            value: function (e) {
                              return (function (e, t) {
                                a(!1 === e._errored),
                                  a(!1 === e._transforming),
                                  a(!1 === e._backpressure),
                                  (e._transforming = !0);
                                var n = e._transformer,
                                  o = e._transformStreamController;
                                return l(n, "transform", [t, o], A, [
                                  t,
                                  o,
                                ]).then(
                                  function () {
                                    return (e._transforming = !1), S(e);
                                  },
                                  function (t) {
                                    return C(e, t), Promise.reject(t);
                                  }
                                );
                              })(this._transformStream, e);
                            },
                          },
                          {
                            key: "abort",
                            value: function () {
                              var e = this._transformStream;
                              (e._writableDone = !0),
                                x(e, new TypeError("Writable side aborted"));
                            },
                          },
                          {
                            key: "close",
                            value: function () {
                              var e = this._transformStream;
                              return (
                                a(!1 === e._transforming),
                                (e._writableDone = !0),
                                c(e._transformer, "flush", [
                                  e._transformStreamController,
                                ])
                                  .then(function () {
                                    return !0 === e._errored
                                      ? Promise.reject(e._storedError)
                                      : (!1 === e._readableClosed && w(e),
                                        Promise.resolve());
                                  })
                                  .catch(function (t) {
                                    return (
                                      C(e, t), Promise.reject(e._storedError)
                                    );
                                  })
                              );
                            },
                          },
                        ]),
                        e
                      );
                    })(),
                    D = (function () {
                      function e(t, n) {
                        i(this, e),
                          (this._transformStream = t),
                          (this._startPromise = n);
                      }
                      return (
                        o(e, [
                          {
                            key: "start",
                            value: function (e) {
                              var t = this._transformStream;
                              return (
                                (t._readableController = e),
                                this._startPromise.then(function () {
                                  return (
                                    a(
                                      void 0 !== t._backpressureChangePromise,
                                      "_backpressureChangePromise should have been initialized"
                                    ),
                                    !0 === t._backpressure
                                      ? Promise.resolve()
                                      : (a(
                                          !1 === t._backpressure,
                                          "_backpressure should have been initialized"
                                        ),
                                        t._backpressureChangePromise)
                                  );
                                })
                              );
                            },
                          },
                          {
                            key: "pull",
                            value: function () {
                              var e = this._transformStream;
                              return (
                                a(
                                  !0 === e._backpressure,
                                  "pull() should be never called while _backpressure is false"
                                ),
                                a(
                                  void 0 !== e._backpressureChangePromise,
                                  "_backpressureChangePromise should have been initialized"
                                ),
                                E(e, !1),
                                e._backpressureChangePromise
                              );
                            },
                          },
                          {
                            key: "cancel",
                            value: function () {
                              var e = this._transformStream;
                              (e._readableClosed = !0),
                                x(e, new TypeError("Readable side canceled"));
                            },
                          },
                        ]),
                        e
                      );
                    })(),
                    L = (function () {
                      function e(t) {
                        if ((i(this, e), !1 === G(t)))
                          throw new TypeError(
                            "TransformStreamDefaultController can only be constructed with a TransformStream instance"
                          );
                        if (void 0 !== t._transformStreamController)
                          throw new TypeError(
                            "TransformStreamDefaultController instances can only be created by the TransformStream constructor"
                          );
                        this._controlledTransformStream = t;
                      }
                      return (
                        o(e, [
                          {
                            key: "enqueue",
                            value: function (e) {
                              if (!1 === T(this)) throw k("enqueue");
                              b(this._controlledTransformStream, e);
                            },
                          },
                          {
                            key: "close",
                            value: function () {
                              if (!1 === T(this)) throw k("close");
                              !(function (e) {
                                if (!0 === e._errored)
                                  throw new TypeError(
                                    "TransformStream is already errored"
                                  );
                                if (!0 === e._readableClosed)
                                  throw new TypeError(
                                    "Readable side is already closed"
                                  );
                                w(e);
                              })(this._controlledTransformStream);
                            },
                          },
                          {
                            key: "error",
                            value: function (e) {
                              if (!1 === T(this)) throw k("error");
                              !(function (e, t) {
                                if (!0 === e._errored)
                                  throw new TypeError(
                                    "TransformStream is already errored"
                                  );
                                x(e, t);
                              })(this._controlledTransformStream, e);
                            },
                          },
                          {
                            key: "desiredSize",
                            get: function () {
                              if (!1 === T(this)) throw k("desiredSize");
                              var e =
                                this._controlledTransformStream
                                  ._readableController;
                              return m(e);
                            },
                          },
                        ]),
                        e
                      );
                    })(),
                    I = (function () {
                      function e() {
                        var t =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {};
                        i(this, e), (this._transformer = t);
                        var n = t.readableStrategy,
                          o = t.writableStrategy;
                        (this._transforming = !1),
                          (this._errored = !1),
                          (this._storedError = void 0),
                          (this._writableController = void 0),
                          (this._readableController = void 0),
                          (this._transformStreamController = void 0),
                          (this._writableDone = !1),
                          (this._readableClosed = !1),
                          (this._backpressure = void 0),
                          (this._backpressureChangePromise = void 0),
                          (this._backpressureChangePromise_resolve = void 0),
                          (this._transformStreamController = new L(this));
                        var r = void 0,
                          l = new Promise(function (e) {
                            r = e;
                          }),
                          c = new D(this, l);
                        this._readable = new p(c, n);
                        var d = new P(this, l);
                        (this._writable = new v(d, o)),
                          a(void 0 !== this._writableController),
                          a(void 0 !== this._readableController);
                        var u = m(this._readableController);
                        E(this, u <= 0);
                        var g = this,
                          h = s(t, "start", [g._transformStreamController]);
                        r(h),
                          l.catch(function (e) {
                            !1 === g._errored &&
                              ((g._errored = !0), (g._storedError = e));
                          });
                      }
                      return (
                        o(e, [
                          {
                            key: "readable",
                            get: function () {
                              if (!1 === G(this)) throw O("readable");
                              return this._readable;
                            },
                          },
                          {
                            key: "writable",
                            get: function () {
                              if (!1 === G(this)) throw O("writable");
                              return this._writable;
                            },
                          },
                        ]),
                        e
                      );
                    })();
                  function k(e) {
                    return new TypeError(
                      "TransformStreamDefaultController.prototype." +
                        e +
                        " can only be used on a TransformStreamDefaultController"
                    );
                  }
                  function O(e) {
                    return new TypeError(
                      "TransformStream.prototype." +
                        e +
                        " can only be used on a TransformStream"
                    );
                  }
                  e.exports = { TransformStream: I };
                },
                function (e, t, n) {
                  e.exports = n(5);
                },
              ])
            );
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var i = !1;
            try {
              if (
                "function" == typeof URL &&
                "object" === o(URL.prototype) &&
                "origin" in URL.prototype
              ) {
                var a = new URL("b", "http://a");
                (a.pathname = "c%20d"), (i = "http://a/c%20d" === a.href);
              }
            } catch (e) {}
            if (i) t.URL = URL;
            else {
              var r = n(145).URL,
                s = n(3).URL;
              s &&
                ((r.createObjectURL = function (e) {
                  return s.createObjectURL.apply(s, arguments);
                }),
                (r.revokeObjectURL = function (e) {
                  s.revokeObjectURL(e);
                })),
                (t.URL = r);
            }
          },
          function (e, t, n) {
            "use strict";
            !(function () {
              var e = Object.create(null);
              (e.ftp = 21),
                (e.file = 0),
                (e.gopher = 70),
                (e.http = 80),
                (e.https = 443),
                (e.ws = 80),
                (e.wss = 443);
              var n = Object.create(null);
              function o(t) {
                return void 0 !== e[t];
              }
              function i() {
                p.call(this), (this._isInvalid = !0);
              }
              function a(e) {
                return "" === e && i.call(this), e.toLowerCase();
              }
              function r(e) {
                var t = e.charCodeAt(0);
                return t > 32 &&
                  t < 127 &&
                  -1 === [34, 35, 60, 62, 63, 96].indexOf(t)
                  ? e
                  : encodeURIComponent(e);
              }
              function s(e) {
                var t = e.charCodeAt(0);
                return t > 32 &&
                  t < 127 &&
                  -1 === [34, 35, 60, 62, 96].indexOf(t)
                  ? e
                  : encodeURIComponent(e);
              }
              (n["%2e"] = "."),
                (n[".%2e"] = ".."),
                (n["%2e."] = ".."),
                (n["%2e%2e"] = "..");
              var l,
                c = /[a-zA-Z]/,
                d = /[a-zA-Z0-9\+\-\.]/;
              function u(t, u, p) {
                function g(e) {
                  _.push(e);
                }
                var h = u || "scheme start",
                  f = 0,
                  m = "",
                  y = !1,
                  v = !1,
                  _ = [];
                e: for (; (t[f - 1] !== l || 0 === f) && !this._isInvalid; ) {
                  var b = t[f];
                  switch (h) {
                    case "scheme start":
                      if (!b || !c.test(b)) {
                        if (u) {
                          g("Invalid scheme.");
                          break e;
                        }
                        (m = ""), (h = "no scheme");
                        continue;
                      }
                      (m += b.toLowerCase()), (h = "scheme");
                      break;
                    case "scheme":
                      if (b && d.test(b)) m += b.toLowerCase();
                      else {
                        if (":" !== b) {
                          if (u) {
                            if (b === l) break e;
                            g("Code point not allowed in scheme: " + b);
                            break e;
                          }
                          (m = ""), (f = 0), (h = "no scheme");
                          continue;
                        }
                        if (((this._scheme = m), (m = ""), u)) break e;
                        o(this._scheme) && (this._isRelative = !0),
                          (h =
                            "file" === this._scheme
                              ? "relative"
                              : this._isRelative &&
                                p &&
                                p._scheme === this._scheme
                              ? "relative or authority"
                              : this._isRelative
                              ? "authority first slash"
                              : "scheme data");
                      }
                      break;
                    case "scheme data":
                      "?" === b
                        ? ((this._query = "?"), (h = "query"))
                        : "#" === b
                        ? ((this._fragment = "#"), (h = "fragment"))
                        : b !== l &&
                          "\t" !== b &&
                          "\n" !== b &&
                          "\r" !== b &&
                          (this._schemeData += r(b));
                      break;
                    case "no scheme":
                      if (p && o(p._scheme)) {
                        h = "relative";
                        continue;
                      }
                      g("Missing scheme."), i.call(this);
                      break;
                    case "relative or authority":
                      if ("/" !== b || "/" !== t[f + 1]) {
                        g("Expected /, got: " + b), (h = "relative");
                        continue;
                      }
                      h = "authority ignore slashes";
                      break;
                    case "relative":
                      if (
                        ((this._isRelative = !0),
                        "file" !== this._scheme && (this._scheme = p._scheme),
                        b === l)
                      ) {
                        (this._host = p._host),
                          (this._port = p._port),
                          (this._path = p._path.slice()),
                          (this._query = p._query),
                          (this._username = p._username),
                          (this._password = p._password);
                        break e;
                      }
                      if ("/" === b || "\\" === b)
                        "\\" === b && g("\\ is an invalid code point."),
                          (h = "relative slash");
                      else if ("?" === b)
                        (this._host = p._host),
                          (this._port = p._port),
                          (this._path = p._path.slice()),
                          (this._query = "?"),
                          (this._username = p._username),
                          (this._password = p._password),
                          (h = "query");
                      else {
                        if ("#" !== b) {
                          var w = t[f + 1],
                            C = t[f + 2];
                          ("file" !== this._scheme ||
                            !c.test(b) ||
                            (":" !== w && "|" !== w) ||
                            (C !== l &&
                              "/" !== C &&
                              "\\" !== C &&
                              "?" !== C &&
                              "#" !== C)) &&
                            ((this._host = p._host),
                            (this._port = p._port),
                            (this._username = p._username),
                            (this._password = p._password),
                            (this._path = p._path.slice()),
                            this._path.pop()),
                            (h = "relative path");
                          continue;
                        }
                        (this._host = p._host),
                          (this._port = p._port),
                          (this._path = p._path.slice()),
                          (this._query = p._query),
                          (this._fragment = "#"),
                          (this._username = p._username),
                          (this._password = p._password),
                          (h = "fragment");
                      }
                      break;
                    case "relative slash":
                      if ("/" !== b && "\\" !== b) {
                        "file" !== this._scheme &&
                          ((this._host = p._host),
                          (this._port = p._port),
                          (this._username = p._username),
                          (this._password = p._password)),
                          (h = "relative path");
                        continue;
                      }
                      "\\" === b && g("\\ is an invalid code point."),
                        (h =
                          "file" === this._scheme
                            ? "file host"
                            : "authority ignore slashes");
                      break;
                    case "authority first slash":
                      if ("/" !== b) {
                        g("Expected '/', got: " + b),
                          (h = "authority ignore slashes");
                        continue;
                      }
                      h = "authority second slash";
                      break;
                    case "authority second slash":
                      if (((h = "authority ignore slashes"), "/" !== b)) {
                        g("Expected '/', got: " + b);
                        continue;
                      }
                      break;
                    case "authority ignore slashes":
                      if ("/" !== b && "\\" !== b) {
                        h = "authority";
                        continue;
                      }
                      g("Expected authority, got: " + b);
                      break;
                    case "authority":
                      if ("@" === b) {
                        y && (g("@ already seen."), (m += "%40")), (y = !0);
                        for (var x = 0; x < m.length; x++) {
                          var S = m[x];
                          if ("\t" !== S && "\n" !== S && "\r" !== S)
                            if (":" !== S || null !== this._password) {
                              var E = r(S);
                              null !== this._password
                                ? (this._password += E)
                                : (this._username += E);
                            } else this._password = "";
                          else g("Invalid whitespace in authority.");
                        }
                        m = "";
                      } else {
                        if (
                          b === l ||
                          "/" === b ||
                          "\\" === b ||
                          "?" === b ||
                          "#" === b
                        ) {
                          (f -= m.length), (m = ""), (h = "host");
                          continue;
                        }
                        m += b;
                      }
                      break;
                    case "file host":
                      if (
                        b === l ||
                        "/" === b ||
                        "\\" === b ||
                        "?" === b ||
                        "#" === b
                      ) {
                        2 !== m.length ||
                        !c.test(m[0]) ||
                        (":" !== m[1] && "|" !== m[1])
                          ? (0 === m.length ||
                              ((this._host = a.call(this, m)), (m = "")),
                            (h = "relative path start"))
                          : (h = "relative path");
                        continue;
                      }
                      "\t" === b || "\n" === b || "\r" === b
                        ? g("Invalid whitespace in file host.")
                        : (m += b);
                      break;
                    case "host":
                    case "hostname":
                      if (":" !== b || v) {
                        if (
                          b === l ||
                          "/" === b ||
                          "\\" === b ||
                          "?" === b ||
                          "#" === b
                        ) {
                          if (
                            ((this._host = a.call(this, m)),
                            (m = ""),
                            (h = "relative path start"),
                            u)
                          )
                            break e;
                          continue;
                        }
                        "\t" !== b && "\n" !== b && "\r" !== b
                          ? ("[" === b ? (v = !0) : "]" === b && (v = !1),
                            (m += b))
                          : g("Invalid code point in host/hostname: " + b);
                      } else if (
                        ((this._host = a.call(this, m)),
                        (m = ""),
                        (h = "port"),
                        "hostname" === u)
                      )
                        break e;
                      break;
                    case "port":
                      if (/[0-9]/.test(b)) m += b;
                      else {
                        if (
                          b === l ||
                          "/" === b ||
                          "\\" === b ||
                          "?" === b ||
                          "#" === b ||
                          u
                        ) {
                          if ("" !== m) {
                            var A = parseInt(m, 10);
                            A !== e[this._scheme] && (this._port = A + ""),
                              (m = "");
                          }
                          if (u) break e;
                          h = "relative path start";
                          continue;
                        }
                        "\t" === b || "\n" === b || "\r" === b
                          ? g("Invalid code point in port: " + b)
                          : i.call(this);
                      }
                      break;
                    case "relative path start":
                      if (
                        ("\\" === b && g("'\\' not allowed in path."),
                        (h = "relative path"),
                        "/" !== b && "\\" !== b)
                      )
                        continue;
                      break;
                    case "relative path":
                      var T;
                      b !== l &&
                      "/" !== b &&
                      "\\" !== b &&
                      (u || ("?" !== b && "#" !== b))
                        ? "\t" !== b && "\n" !== b && "\r" !== b && (m += r(b))
                        : ("\\" === b && g("\\ not allowed in relative path."),
                          (T = n[m.toLowerCase()]) && (m = T),
                          ".." === m
                            ? (this._path.pop(),
                              "/" !== b && "\\" !== b && this._path.push(""))
                            : "." === m && "/" !== b && "\\" !== b
                            ? this._path.push("")
                            : "." !== m &&
                              ("file" === this._scheme &&
                                0 === this._path.length &&
                                2 === m.length &&
                                c.test(m[0]) &&
                                "|" === m[1] &&
                                (m = m[0] + ":"),
                              this._path.push(m)),
                          (m = ""),
                          "?" === b
                            ? ((this._query = "?"), (h = "query"))
                            : "#" === b &&
                              ((this._fragment = "#"), (h = "fragment")));
                      break;
                    case "query":
                      u || "#" !== b
                        ? b !== l &&
                          "\t" !== b &&
                          "\n" !== b &&
                          "\r" !== b &&
                          (this._query += s(b))
                        : ((this._fragment = "#"), (h = "fragment"));
                      break;
                    case "fragment":
                      b !== l &&
                        "\t" !== b &&
                        "\n" !== b &&
                        "\r" !== b &&
                        (this._fragment += b);
                  }
                  f++;
                }
              }
              function p() {
                (this._scheme = ""),
                  (this._schemeData = ""),
                  (this._username = ""),
                  (this._password = null),
                  (this._host = ""),
                  (this._port = ""),
                  (this._path = []),
                  (this._query = ""),
                  (this._fragment = ""),
                  (this._isInvalid = !1),
                  (this._isRelative = !1);
              }
              function g(e, t) {
                void 0 === t || t instanceof g || (t = new g(String(t))),
                  (this._url = e),
                  p.call(this);
                var n = e.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, "");
                u.call(this, n, null, t);
              }
              (g.prototype = {
                toString: function () {
                  return this.href;
                },
                get href() {
                  if (this._isInvalid) return this._url;
                  var e = "";
                  return (
                    ("" === this._username && null === this._password) ||
                      (e =
                        this._username +
                        (null !== this._password ? ":" + this._password : "") +
                        "@"),
                    this.protocol +
                      (this._isRelative ? "//" + e + this.host : "") +
                      this.pathname +
                      this._query +
                      this._fragment
                  );
                },
                set href(e) {
                  p.call(this), u.call(this, e);
                },
                get protocol() {
                  return this._scheme + ":";
                },
                set protocol(e) {
                  this._isInvalid || u.call(this, e + ":", "scheme start");
                },
                get host() {
                  return this._isInvalid
                    ? ""
                    : this._port
                    ? this._host + ":" + this._port
                    : this._host;
                },
                set host(e) {
                  !this._isInvalid &&
                    this._isRelative &&
                    u.call(this, e, "host");
                },
                get hostname() {
                  return this._host;
                },
                set hostname(e) {
                  !this._isInvalid &&
                    this._isRelative &&
                    u.call(this, e, "hostname");
                },
                get port() {
                  return this._port;
                },
                set port(e) {
                  !this._isInvalid &&
                    this._isRelative &&
                    u.call(this, e, "port");
                },
                get pathname() {
                  return this._isInvalid
                    ? ""
                    : this._isRelative
                    ? "/" + this._path.join("/")
                    : this._schemeData;
                },
                set pathname(e) {
                  !this._isInvalid &&
                    this._isRelative &&
                    ((this._path = []), u.call(this, e, "relative path start"));
                },
                get search() {
                  return this._isInvalid || !this._query || "?" === this._query
                    ? ""
                    : this._query;
                },
                set search(e) {
                  !this._isInvalid &&
                    this._isRelative &&
                    ((this._query = "?"),
                    "?" === e[0] && (e = e.slice(1)),
                    u.call(this, e, "query"));
                },
                get hash() {
                  return this._isInvalid ||
                    !this._fragment ||
                    "#" === this._fragment
                    ? ""
                    : this._fragment;
                },
                set hash(e) {
                  this._isInvalid ||
                    ((this._fragment = "#"),
                    "#" === e[0] && (e = e.slice(1)),
                    u.call(this, e, "fragment"));
                },
                get origin() {
                  var e;
                  if (this._isInvalid || !this._scheme) return "";
                  switch (this._scheme) {
                    case "data":
                    case "file":
                    case "javascript":
                    case "mailto":
                      return "null";
                    case "blob":
                      try {
                        return new g(this._schemeData).origin || "null";
                      } catch (e) {}
                      return "null";
                  }
                  return (e = this.host) ? this._scheme + "://" + e : "";
                },
              }),
                (t.URL = g);
            })();
          },
          function (e, t, o) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.getDocument = function (e) {
                var t,
                  n = new I();
                if ("string" == typeof e) t = { url: e };
                else if ((0, a.isArrayBuffer)(e)) t = { data: e };
                else if (e instanceof k) t = { range: e };
                else {
                  if ("object" !== x(e))
                    throw new Error(
                      "Invalid parameter in getDocument, need either Uint8Array, string or a parameter object"
                    );
                  if (!e.url && !e.data && !e.range)
                    throw new Error(
                      "Invalid parameter object: need either .data, .range or .url"
                    );
                  t = e;
                }
                var o = Object.create(null),
                  i = null,
                  s = null;
                for (var c in t)
                  if ("url" !== c || "undefined" == typeof window)
                    if ("range" !== c)
                      if ("worker" !== c)
                        if ("data" !== c || t[c] instanceof Uint8Array)
                          o[c] = t[c];
                        else {
                          var d = t[c];
                          if ("string" == typeof d)
                            o[c] = (0, a.stringToBytes)(d);
                          else if (
                            "object" !== x(d) ||
                            null === d ||
                            isNaN(d.length)
                          ) {
                            if (!(0, a.isArrayBuffer)(d))
                              throw new Error(
                                "Invalid PDF binary data: either typed array, string or array-like object is expected in the data property."
                              );
                            o[c] = new Uint8Array(d);
                          } else o[c] = new Uint8Array(d);
                        }
                      else s = t[c];
                    else i = t[c];
                  else o[c] = new a.URL(t[c], window.location).href;
                (o.rangeChunkSize = o.rangeChunkSize || 65536),
                  (o.CMapReaderFactory =
                    o.CMapReaderFactory || r.DOMCMapReaderFactory),
                  (o.ignoreErrors = !0 !== o.stopAtErrors),
                  (o.pdfBug = !0 === o.pdfBug);
                var g = Object.values(a.NativeImageDecoding);
                if (
                  ((void 0 !== o.nativeImageDecoderSupport &&
                    g.includes(o.nativeImageDecoderSupport)) ||
                    (o.nativeImageDecoderSupport =
                      l.apiCompatibilityParams.nativeImageDecoderSupport ||
                      a.NativeImageDecoding.DECODE),
                  Number.isInteger(o.maxImageSize) || (o.maxImageSize = -1),
                  "boolean" != typeof o.isEvalSupported &&
                    (o.isEvalSupported = !0),
                  "boolean" != typeof o.disableFontFace &&
                    (o.disableFontFace =
                      l.apiCompatibilityParams.disableFontFace || !1),
                  "boolean" != typeof o.disableRange && (o.disableRange = !1),
                  "boolean" != typeof o.disableStream && (o.disableStream = !1),
                  "boolean" != typeof o.disableAutoFetch &&
                    (o.disableAutoFetch = !1),
                  "boolean" != typeof o.disableCreateObjectURL &&
                    (o.disableCreateObjectURL =
                      l.apiCompatibilityParams.disableCreateObjectURL || !1),
                  (0, a.setVerbosityLevel)(o.verbosity),
                  !s)
                ) {
                  var f = {
                    postMessageTransfers: o.postMessageTransfers,
                    verbosity: o.verbosity,
                    port: u.GlobalWorkerOptions.workerPort,
                  };
                  (s = f.port ? M.fromPort(f) : new M(f)), (n._worker = s);
                }
                var m = n.docId;
                return (
                  s.promise
                    .then(function () {
                      if (n.destroyed) throw new Error("Loading aborted");
                      return (function (e, t, n, o) {
                        return e.destroyed
                          ? Promise.reject(new Error("Worker was destroyed"))
                          : (n &&
                              ((t.length = n.length),
                              (t.initialData = n.initialData)),
                            e.messageHandler
                              .sendWithPromise("GetDocRequest", {
                                docId: o,
                                apiVersion: "2.1.286",
                                source: {
                                  data: t.data,
                                  url: t.url,
                                  password: t.password,
                                  disableAutoFetch: t.disableAutoFetch,
                                  rangeChunkSize: t.rangeChunkSize,
                                  length: t.length,
                                },
                                maxImageSize: t.maxImageSize,
                                disableFontFace: t.disableFontFace,
                                disableCreateObjectURL:
                                  t.disableCreateObjectURL,
                                postMessageTransfers: e.postMessageTransfers,
                                docBaseUrl: t.docBaseUrl,
                                nativeImageDecoderSupport:
                                  t.nativeImageDecoderSupport,
                                ignoreErrors: t.ignoreErrors,
                                isEvalSupported: t.isEvalSupported,
                                disableCMYKToRGB: t.disableCMYKToRGB,
                              })
                              .then(function (t) {
                                if (e.destroyed)
                                  throw new Error("Worker was destroyed");
                                return t;
                              }));
                      })(s, o, i, m).then(function (e) {
                        if (n.destroyed) throw new Error("Loading aborted");
                        var t;
                        i
                          ? (t = new h.PDFDataTransportStream(
                              {
                                length: o.length,
                                initialData: o.initialData,
                                disableRange: o.disableRange,
                                disableStream: o.disableStream,
                              },
                              i
                            ))
                          : o.data ||
                            (t = G({
                              url: o.url,
                              length: o.length,
                              httpHeaders: o.httpHeaders,
                              withCredentials: o.withCredentials,
                              rangeChunkSize: o.rangeChunkSize,
                              disableRange: o.disableRange,
                              disableStream: o.disableStream,
                            }));
                        var a = new p.MessageHandler(m, e, s.port);
                        a.postMessageTransfers = s.postMessageTransfers;
                        var r = new B(a, n, t, o);
                        (n._transport = r), a.send("Ready", null);
                      });
                    })
                    .catch(n._capability.reject),
                  n
                );
              }),
              (t.setPDFNetworkStreamFactory = function (e) {
                G = e;
              }),
              (t.build =
                t.version =
                t.PDFPageProxy =
                t.PDFDocumentProxy =
                t.PDFWorker =
                t.PDFDataRangeTransport =
                t.LoopbackPort =
                  void 0);
            var i = m(o(147)),
              a = o(1),
              r = o(151),
              s = o(152),
              l = o(153),
              c = o(154),
              d = m(o(3)),
              u = o(156),
              p = o(157),
              g = o(158),
              h = o(160),
              f = o(161);
            function m(e) {
              return e && e.__esModule ? e : { default: e };
            }
            function y(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function v(e, t) {
              return (
                (function (e) {
                  if (Array.isArray(e)) return e;
                })(e) ||
                (function (e, t) {
                  var n = [],
                    o = !0,
                    i = !1,
                    a = void 0;
                  try {
                    for (
                      var r, s = e[Symbol.iterator]();
                      !(o = (r = s.next()).done) &&
                      (n.push(r.value), !t || n.length !== t);
                      o = !0
                    );
                  } catch (e) {
                    (i = !0), (a = e);
                  } finally {
                    try {
                      o || null == s.return || s.return();
                    } finally {
                      if (i) throw a;
                    }
                  }
                  return n;
                })(e, t) ||
                (function () {
                  throw new TypeError(
                    "Invalid attempt to destructure non-iterable instance"
                  );
                })()
              );
            }
            function _(e) {
              return (
                (function (e) {
                  if (Array.isArray(e)) {
                    for (var t = 0, n = new Array(e.length); t < e.length; t++)
                      n[t] = e[t];
                    return n;
                  }
                })(e) ||
                (function (e) {
                  if (
                    Symbol.iterator in Object(e) ||
                    "[object Arguments]" === Object.prototype.toString.call(e)
                  )
                    return Array.from(e);
                })(e) ||
                (function () {
                  throw new TypeError(
                    "Invalid attempt to spread non-iterable instance"
                  );
                })()
              );
            }
            function b(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function w(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function C(e, t, n) {
              return t && w(e.prototype, t), n && w(e, n), e;
            }
            function x(e) {
              return (x =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var S,
              E,
              A = !1,
              T = !1;
            "undefined" == typeof window ? ((A = !0), (T = !0)) : (T = !0),
              "undefined" != typeof requirejs &&
                requirejs.toUrl &&
                (S = requirejs.toUrl("pdfjs-dist/build/pdf.worker.js"));
            var G,
              P = "undefined" != typeof requirejs && requirejs.load;
            if (
              ((E = T
                ? function () {
                    return new Promise(function (e, t) {
                      n.e(13)
                        .then(
                          function () {
                            try {
                              var o;
                              (o = n(1192)), e(o.WorkerMessageHandler);
                            } catch (e) {
                              t(e);
                            }
                          }.bind(null, n)
                        )
                        .catch(t);
                    });
                  }
                : P
                ? function () {
                    return new Promise(function (e, t) {
                      requirejs(
                        ["pdfjs-dist/build/pdf.worker"],
                        function (n) {
                          try {
                            e(n.WorkerMessageHandler);
                          } catch (e) {
                            t(e);
                          }
                        },
                        t
                      );
                    });
                  }
                : null),
              !S &&
                "object" ===
                  ("undefined" == typeof document
                    ? "undefined"
                    : x(document)) &&
                "currentScript" in document)
            ) {
              var D = document.currentScript && document.currentScript.src;
              D && (S = D.replace(/(\.(?:min\.)?js)(\?.*)?$/i, ".worker$1$2"));
            }
            var L,
              I =
                ((L = 0),
                (function () {
                  function e() {
                    b(this, e),
                      (this._capability = (0, a.createPromiseCapability)()),
                      (this._transport = null),
                      (this._worker = null),
                      (this.docId = "d" + L++),
                      (this.destroyed = !1),
                      (this.onPassword = null),
                      (this.onProgress = null),
                      (this.onUnsupportedFeature = null);
                  }
                  return (
                    C(e, [
                      {
                        key: "destroy",
                        value: function () {
                          var e = this;
                          return (
                            (this.destroyed = !0),
                            (this._transport
                              ? this._transport.destroy()
                              : Promise.resolve()
                            ).then(function () {
                              (e._transport = null),
                                e._worker &&
                                  (e._worker.destroy(), (e._worker = null));
                            })
                          );
                        },
                      },
                      {
                        key: "then",
                        value: function (e, t) {
                          return (
                            (0, a.deprecated)(
                              "PDFDocumentLoadingTask.then method, use the `promise` getter instead."
                            ),
                            this.promise.then.apply(this.promise, arguments)
                          );
                        },
                      },
                      {
                        key: "promise",
                        get: function () {
                          return this._capability.promise;
                        },
                      },
                    ]),
                    e
                  );
                })()),
              k = (function () {
                function e(t, n) {
                  b(this, e),
                    (this.length = t),
                    (this.initialData = n),
                    (this._rangeListeners = []),
                    (this._progressListeners = []),
                    (this._progressiveReadListeners = []),
                    (this._readyCapability = (0, a.createPromiseCapability)());
                }
                return (
                  C(e, [
                    {
                      key: "addRangeListener",
                      value: function (e) {
                        this._rangeListeners.push(e);
                      },
                    },
                    {
                      key: "addProgressListener",
                      value: function (e) {
                        this._progressListeners.push(e);
                      },
                    },
                    {
                      key: "addProgressiveReadListener",
                      value: function (e) {
                        this._progressiveReadListeners.push(e);
                      },
                    },
                    {
                      key: "onDataRange",
                      value: function (e, t) {
                        var n = !0,
                          o = !1,
                          i = void 0;
                        try {
                          for (
                            var a, r = this._rangeListeners[Symbol.iterator]();
                            !(n = (a = r.next()).done);
                            n = !0
                          )
                            (0, a.value)(e, t);
                        } catch (e) {
                          (o = !0), (i = e);
                        } finally {
                          try {
                            n || null == r.return || r.return();
                          } finally {
                            if (o) throw i;
                          }
                        }
                      },
                    },
                    {
                      key: "onDataProgress",
                      value: function (e) {
                        var t = this;
                        this._readyCapability.promise.then(function () {
                          var n = !0,
                            o = !1,
                            i = void 0;
                          try {
                            for (
                              var a,
                                r = t._progressListeners[Symbol.iterator]();
                              !(n = (a = r.next()).done);
                              n = !0
                            )
                              (0, a.value)(e);
                          } catch (e) {
                            (o = !0), (i = e);
                          } finally {
                            try {
                              n || null == r.return || r.return();
                            } finally {
                              if (o) throw i;
                            }
                          }
                        });
                      },
                    },
                    {
                      key: "onDataProgressiveRead",
                      value: function (e) {
                        var t = this;
                        this._readyCapability.promise.then(function () {
                          var n = !0,
                            o = !1,
                            i = void 0;
                          try {
                            for (
                              var a,
                                r =
                                  t._progressiveReadListeners[
                                    Symbol.iterator
                                  ]();
                              !(n = (a = r.next()).done);
                              n = !0
                            )
                              (0, a.value)(e);
                          } catch (e) {
                            (o = !0), (i = e);
                          } finally {
                            try {
                              n || null == r.return || r.return();
                            } finally {
                              if (o) throw i;
                            }
                          }
                        });
                      },
                    },
                    {
                      key: "transportReady",
                      value: function () {
                        this._readyCapability.resolve();
                      },
                    },
                    {
                      key: "requestDataRange",
                      value: function (e, t) {
                        (0, a.unreachable)(
                          "Abstract method PDFDataRangeTransport.requestDataRange"
                        );
                      },
                    },
                    { key: "abort", value: function () {} },
                  ]),
                  e
                );
              })();
            t.PDFDataRangeTransport = k;
            var O = (function () {
              function e(t, n, o) {
                b(this, e),
                  (this.loadingTask = o),
                  (this._pdfInfo = t),
                  (this._transport = n);
              }
              return (
                C(e, [
                  {
                    key: "getPage",
                    value: function (e) {
                      return this._transport.getPage(e);
                    },
                  },
                  {
                    key: "getPageIndex",
                    value: function (e) {
                      return this._transport.getPageIndex(e);
                    },
                  },
                  {
                    key: "getDestinations",
                    value: function () {
                      return this._transport.getDestinations();
                    },
                  },
                  {
                    key: "getDestination",
                    value: function (e) {
                      return this._transport.getDestination(e);
                    },
                  },
                  {
                    key: "getPageLabels",
                    value: function () {
                      return this._transport.getPageLabels();
                    },
                  },
                  {
                    key: "getPageMode",
                    value: function () {
                      return this._transport.getPageMode();
                    },
                  },
                  {
                    key: "getOpenActionDestination",
                    value: function () {
                      return this._transport.getOpenActionDestination();
                    },
                  },
                  {
                    key: "getAttachments",
                    value: function () {
                      return this._transport.getAttachments();
                    },
                  },
                  {
                    key: "getJavaScript",
                    value: function () {
                      return this._transport.getJavaScript();
                    },
                  },
                  {
                    key: "getOutline",
                    value: function () {
                      return this._transport.getOutline();
                    },
                  },
                  {
                    key: "getPermissions",
                    value: function () {
                      return this._transport.getPermissions();
                    },
                  },
                  {
                    key: "getMetadata",
                    value: function () {
                      return this._transport.getMetadata();
                    },
                  },
                  {
                    key: "getData",
                    value: function () {
                      return this._transport.getData();
                    },
                  },
                  {
                    key: "getDownloadInfo",
                    value: function () {
                      return this._transport.downloadInfoCapability.promise;
                    },
                  },
                  {
                    key: "getStats",
                    value: function () {
                      return this._transport.getStats();
                    },
                  },
                  {
                    key: "cleanup",
                    value: function () {
                      this._transport.startCleanup();
                    },
                  },
                  {
                    key: "destroy",
                    value: function () {
                      return this.loadingTask.destroy();
                    },
                  },
                  {
                    key: "numPages",
                    get: function () {
                      return this._pdfInfo.numPages;
                    },
                  },
                  {
                    key: "fingerprint",
                    get: function () {
                      return this._pdfInfo.fingerprint;
                    },
                  },
                  {
                    key: "loadingParams",
                    get: function () {
                      return this._transport.loadingParams;
                    },
                  },
                ]),
                e
              );
            })();
            t.PDFDocumentProxy = O;
            var F = (function () {
              function e(t, n, o) {
                var i =
                  arguments.length > 3 &&
                  void 0 !== arguments[3] &&
                  arguments[3];
                b(this, e),
                  (this.pageIndex = t),
                  (this._pageInfo = n),
                  (this._transport = o),
                  (this._stats = i ? new r.StatTimer() : r.DummyStatTimer),
                  (this._pdfBug = i),
                  (this.commonObjs = o.commonObjs),
                  (this.objs = new U()),
                  (this.cleanupAfterRender = !1),
                  (this.pendingCleanup = !1),
                  (this.intentStates = Object.create(null)),
                  (this.destroyed = !1);
              }
              return (
                C(e, [
                  {
                    key: "getViewport",
                    value: function () {
                      var e =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {},
                        t = e.scale,
                        n = e.rotation,
                        o = void 0 === n ? this.rotate : n,
                        i = e.dontFlip,
                        s = void 0 !== i && i;
                      return (
                        (arguments.length > 1 ||
                          "number" == typeof arguments[0]) &&
                          ((0, a.deprecated)(
                            "getViewport is called with obsolete arguments."
                          ),
                          (t = arguments[0]),
                          (o =
                            "number" == typeof arguments[1]
                              ? arguments[1]
                              : this.rotate),
                          (s =
                            "boolean" == typeof arguments[2] && arguments[2])),
                        new r.PageViewport({
                          viewBox: this.view,
                          scale: t,
                          rotation: o,
                          dontFlip: s,
                        })
                      );
                    },
                  },
                  {
                    key: "getAnnotations",
                    value: function () {
                      var e =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {},
                        t = e.intent,
                        n = void 0 === t ? null : t;
                      return (
                        (this.annotationsPromise &&
                          this.annotationsIntent === n) ||
                          ((this.annotationsPromise =
                            this._transport.getAnnotations(this.pageIndex, n)),
                          (this.annotationsIntent = n)),
                        this.annotationsPromise
                      );
                    },
                  },
                  {
                    key: "render",
                    value: function (e) {
                      var t = this,
                        n = e.canvasContext,
                        o = e.viewport,
                        i = e.intent,
                        s = void 0 === i ? "display" : i,
                        l = e.enableWebGL,
                        c = void 0 !== l && l,
                        d = e.renderInteractiveForms,
                        u = void 0 !== d && d,
                        p = e.transform,
                        g = void 0 === p ? null : p,
                        h = e.imageLayer,
                        m = void 0 === h ? null : h,
                        y = e.canvasFactory,
                        v = void 0 === y ? null : y,
                        _ = e.background,
                        b = void 0 === _ ? null : _,
                        w = e.canvasGraphicsClass,
                        C = void 0 === w ? null : w,
                        x = e.progress,
                        S = void 0 === x ? null : x,
                        E = this._stats;
                      E.time("Overall"), (this.pendingCleanup = !1);
                      var A = "print" === s ? "print" : "display",
                        T = v || new r.DOMCanvasFactory(),
                        G = new f.WebGLContext({ enable: c });
                      this.intentStates[A] ||
                        (this.intentStates[A] = Object.create(null));
                      var P = this.intentStates[A];
                      P.displayReadyCapability ||
                        ((P.receivingOperatorList = !0),
                        (P.displayReadyCapability = (0,
                        a.createPromiseCapability)()),
                        (P.operatorList = {
                          fnArray: [],
                          argsArray: [],
                          lastChunk: !1,
                        }),
                        E.time("Page Request"),
                        this._transport.messageHandler.send(
                          "RenderPageRequest",
                          {
                            pageIndex: this.pageNumber - 1,
                            intent: A,
                            renderInteractiveForms: !0 === u,
                          }
                        ));
                      var D = function (e) {
                          var n = P.renderTasks.indexOf(L);
                          n >= 0 && P.renderTasks.splice(n, 1),
                            t.cleanupAfterRender && (t.pendingCleanup = !0),
                            t._tryCleanup(),
                            e ? L.capability.reject(e) : L.capability.resolve(),
                            E.timeEnd("Rendering"),
                            E.timeEnd("Overall");
                        },
                        L = new j({
                          callback: D,
                          params: {
                            canvasContext: n,
                            viewport: o,
                            transform: g,
                            imageLayer: m,
                            background: b,
                            progress: S,
                          },
                          objs: this.objs,
                          commonObjs: this.commonObjs,
                          operatorList: P.operatorList,
                          pageNumber: this.pageNumber,
                          canvasFactory: T,
                          canvasGraphicsClass: C,
                          webGLContext: G,
                          useRequestAnimationFrame: "print" !== A,
                          pdfBug: this._pdfBug,
                        });
                      P.renderTasks || (P.renderTasks = []),
                        P.renderTasks.push(L);
                      var I = L.task;
                      return (
                        P.displayReadyCapability.promise
                          .then(function (e) {
                            t.pendingCleanup
                              ? D()
                              : (E.time("Rendering"),
                                L.initializeGraphics(e),
                                L.operatorListChanged());
                          })
                          .catch(D),
                        I
                      );
                    },
                  },
                  {
                    key: "getOperatorList",
                    value: function () {
                      this.intentStates.oplist ||
                        (this.intentStates.oplist = Object.create(null));
                      var e,
                        t = this.intentStates.oplist;
                      return (
                        t.opListReadCapability ||
                          (((e = {}).operatorListChanged = function () {
                            if (t.operatorList.lastChunk) {
                              t.opListReadCapability.resolve(t.operatorList);
                              var n = t.renderTasks.indexOf(e);
                              n >= 0 && t.renderTasks.splice(n, 1);
                            }
                          }),
                          (t.receivingOperatorList = !0),
                          (t.opListReadCapability = (0,
                          a.createPromiseCapability)()),
                          (t.renderTasks = []),
                          t.renderTasks.push(e),
                          (t.operatorList = {
                            fnArray: [],
                            argsArray: [],
                            lastChunk: !1,
                          }),
                          this._stats.time("Page Request"),
                          this._transport.messageHandler.send(
                            "RenderPageRequest",
                            { pageIndex: this.pageIndex, intent: "oplist" }
                          )),
                        t.opListReadCapability.promise
                      );
                    },
                  },
                  {
                    key: "streamTextContent",
                    value: function () {
                      var e =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {},
                        t = e.normalizeWhitespace,
                        n = void 0 !== t && t,
                        o = e.disableCombineTextItems,
                        i = void 0 !== o && o,
                        a = 100;
                      return this._transport.messageHandler.sendWithStream(
                        "GetTextContent",
                        {
                          pageIndex: this.pageNumber - 1,
                          normalizeWhitespace: !0 === n,
                          combineTextItems: !0 !== i,
                        },
                        {
                          highWaterMark: a,
                          size: function (e) {
                            return e.items.length;
                          },
                        }
                      );
                    },
                  },
                  {
                    key: "getTextContent",
                    value: function () {
                      var e =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {},
                        t = this.streamTextContent(e);
                      return new Promise(function (e, n) {
                        var o = t.getReader(),
                          i = { items: [], styles: Object.create(null) };
                        !(function t() {
                          o.read().then(function (n) {
                            var o,
                              a = n.value;
                            n.done
                              ? e(i)
                              : (Object.assign(i.styles, a.styles),
                                (o = i.items).push.apply(o, _(a.items)),
                                t());
                          }, n);
                        })();
                      });
                    },
                  },
                  {
                    key: "_destroy",
                    value: function () {
                      (this.destroyed = !0),
                        (this._transport.pageCache[this.pageIndex] = null);
                      var e = [];
                      return (
                        Object.keys(this.intentStates).forEach(function (t) {
                          "oplist" !== t &&
                            this.intentStates[t].renderTasks.forEach(function (
                              t
                            ) {
                              var n = t.capability.promise.catch(
                                function () {}
                              );
                              e.push(n), t.cancel();
                            });
                        }, this),
                        this.objs.clear(),
                        (this.annotationsPromise = null),
                        (this.pendingCleanup = !1),
                        Promise.all(e)
                      );
                    },
                  },
                  {
                    key: "cleanup",
                    value: function () {
                      var e =
                        arguments.length > 0 &&
                        void 0 !== arguments[0] &&
                        arguments[0];
                      (this.pendingCleanup = !0), this._tryCleanup(e);
                    },
                  },
                  {
                    key: "_tryCleanup",
                    value: function () {
                      var e =
                        arguments.length > 0 &&
                        void 0 !== arguments[0] &&
                        arguments[0];
                      this.pendingCleanup &&
                        !Object.keys(this.intentStates).some(function (e) {
                          var t = this.intentStates[e];
                          return (
                            0 !== t.renderTasks.length ||
                            t.receivingOperatorList
                          );
                        }, this) &&
                        (Object.keys(this.intentStates).forEach(function (e) {
                          delete this.intentStates[e];
                        }, this),
                        this.objs.clear(),
                        (this.annotationsPromise = null),
                        e &&
                          this._stats instanceof r.StatTimer &&
                          (this._stats = new r.StatTimer()),
                        (this.pendingCleanup = !1));
                    },
                  },
                  {
                    key: "_startRenderPage",
                    value: function (e, t) {
                      var n = this.intentStates[t];
                      n.displayReadyCapability &&
                        n.displayReadyCapability.resolve(e);
                    },
                  },
                  {
                    key: "_renderPageChunk",
                    value: function (e, t) {
                      for (
                        var n = this.intentStates[t], o = 0, i = e.length;
                        o < i;
                        o++
                      )
                        n.operatorList.fnArray.push(e.fnArray[o]),
                          n.operatorList.argsArray.push(e.argsArray[o]);
                      n.operatorList.lastChunk = e.lastChunk;
                      for (var a = 0; a < n.renderTasks.length; a++)
                        n.renderTasks[a].operatorListChanged();
                      e.lastChunk &&
                        ((n.receivingOperatorList = !1), this._tryCleanup());
                    },
                  },
                  {
                    key: "pageNumber",
                    get: function () {
                      return this.pageIndex + 1;
                    },
                  },
                  {
                    key: "rotate",
                    get: function () {
                      return this._pageInfo.rotate;
                    },
                  },
                  {
                    key: "ref",
                    get: function () {
                      return this._pageInfo.ref;
                    },
                  },
                  {
                    key: "userUnit",
                    get: function () {
                      return this._pageInfo.userUnit;
                    },
                  },
                  {
                    key: "view",
                    get: function () {
                      return this._pageInfo.view;
                    },
                  },
                  {
                    key: "stats",
                    get: function () {
                      return this._stats instanceof r.StatTimer
                        ? this._stats
                        : null;
                    },
                  },
                ]),
                e
              );
            })();
            t.PDFPageProxy = F;
            var R = (function () {
              function e() {
                var t =
                  !(arguments.length > 0 && void 0 !== arguments[0]) ||
                  arguments[0];
                b(this, e),
                  (this._listeners = []),
                  (this._defer = t),
                  (this._deferred = Promise.resolve(void 0));
              }
              return (
                C(e, [
                  {
                    key: "postMessage",
                    value: function (e, t) {
                      var n = this;
                      if (this._defer) {
                        var o = new WeakMap(),
                          i = {
                            data: (function e(n) {
                              if ("object" !== x(n) || null === n) return n;
                              if (o.has(n)) return o.get(n);
                              var i, r;
                              if ((i = n.buffer) && (0, a.isArrayBuffer)(i)) {
                                var s = t && t.includes(i);
                                return (
                                  (r =
                                    n === i
                                      ? n
                                      : s
                                      ? new n.constructor(
                                          i,
                                          n.byteOffset,
                                          n.byteLength
                                        )
                                      : new n.constructor(n)),
                                  o.set(n, r),
                                  r
                                );
                              }
                              for (var l in ((r = Array.isArray(n) ? [] : {}),
                              o.set(n, r),
                              n)) {
                                for (
                                  var c = void 0, d = n;
                                  !(c = Object.getOwnPropertyDescriptor(d, l));

                                )
                                  d = Object.getPrototypeOf(d);
                                void 0 !== c.value &&
                                  "function" != typeof c.value &&
                                  (r[l] = e(c.value));
                              }
                              return r;
                            })(e),
                          };
                        this._deferred.then(function () {
                          n._listeners.forEach(function (e) {
                            e.call(this, i);
                          }, n);
                        });
                      } else
                        this._listeners.forEach(function (t) {
                          t.call(this, { data: e });
                        }, this);
                    },
                  },
                  {
                    key: "addEventListener",
                    value: function (e, t) {
                      this._listeners.push(t);
                    },
                  },
                  {
                    key: "removeEventListener",
                    value: function (e, t) {
                      var n = this._listeners.indexOf(t);
                      this._listeners.splice(n, 1);
                    },
                  },
                  {
                    key: "terminate",
                    value: function () {
                      this._listeners = [];
                    },
                  },
                ]),
                e
              );
            })();
            t.LoopbackPort = R;
            var M = (function () {
              var e,
                t = new WeakMap(),
                n = 0;
              function o() {
                if (u.GlobalWorkerOptions.workerSrc)
                  return u.GlobalWorkerOptions.workerSrc;
                if (void 0 !== S) return S;
                throw new Error(
                  'No "GlobalWorkerOptions.workerSrc" specified.'
                );
              }
              function i() {
                try {
                  if ("undefined" != typeof window)
                    return (
                      window.pdfjsWorker &&
                      window.pdfjsWorker.WorkerMessageHandler
                    );
                } catch (e) {}
                return null;
              }
              return (function () {
                function s() {
                  var e =
                      arguments.length > 0 && void 0 !== arguments[0]
                        ? arguments[0]
                        : {},
                    n = e.name,
                    o = void 0 === n ? null : n,
                    i = e.port,
                    r = void 0 === i ? null : i,
                    l = e.postMessageTransfers,
                    c = void 0 === l || l,
                    d = e.verbosity,
                    u = void 0 === d ? (0, a.getVerbosityLevel)() : d;
                  if ((b(this, s), r && t.has(r)))
                    throw new Error(
                      "Cannot use more than one PDFWorker per port"
                    );
                  if (
                    ((this.name = o),
                    (this.destroyed = !1),
                    (this.postMessageTransfers = !1 !== c),
                    (this.verbosity = u),
                    (this._readyCapability = (0, a.createPromiseCapability)()),
                    (this._port = null),
                    (this._webWorker = null),
                    (this._messageHandler = null),
                    r)
                  )
                    return t.set(r, this), void this._initializeFromPort(r);
                  this._initialize();
                }
                return (
                  C(
                    s,
                    [
                      {
                        key: "_initializeFromPort",
                        value: function (e) {
                          (this._port = e),
                            (this._messageHandler = new p.MessageHandler(
                              "main",
                              "worker",
                              e
                            )),
                            this._messageHandler.on("ready", function () {}),
                            this._readyCapability.resolve();
                        },
                      },
                      {
                        key: "_initialize",
                        value: function () {
                          var e,
                            t,
                            n = this;
                          if ("undefined" != typeof Worker && !A && !i()) {
                            var r = o();
                            try {
                              (0, a.isSameOrigin)(window.location.href, r) ||
                                ((e = new a.URL(r, window.location).href),
                                (t = "importScripts('" + e + "');"),
                                (r = a.URL.createObjectURL(new Blob([t]))));
                              var s = new Worker(r),
                                l = new p.MessageHandler("main", "worker", s),
                                c = function () {
                                  s.removeEventListener("error", d),
                                    l.destroy(),
                                    s.terminate(),
                                    n.destroyed
                                      ? n._readyCapability.reject(
                                          new Error("Worker was destroyed")
                                        )
                                      : n._setupFakeWorker();
                                },
                                d = function () {
                                  n._webWorker || c();
                                };
                              s.addEventListener("error", d),
                                l.on("test", function (e) {
                                  s.removeEventListener("error", d),
                                    n.destroyed
                                      ? c()
                                      : e && e.supportTypedArray
                                      ? ((n._messageHandler = l),
                                        (n._port = s),
                                        (n._webWorker = s),
                                        e.supportTransfers ||
                                          (n.postMessageTransfers = !1),
                                        n._readyCapability.resolve(),
                                        l.send("configure", {
                                          verbosity: n.verbosity,
                                        }))
                                      : (n._setupFakeWorker(),
                                        l.destroy(),
                                        s.terminate());
                                }),
                                l.on("ready", function (e) {
                                  if (
                                    (s.removeEventListener("error", d),
                                    n.destroyed)
                                  )
                                    c();
                                  else
                                    try {
                                      u();
                                    } catch (e) {
                                      n._setupFakeWorker();
                                    }
                                });
                              var u = function () {
                                var e = new Uint8Array([
                                  n.postMessageTransfers ? 255 : 0,
                                ]);
                                try {
                                  l.send("test", e, [e.buffer]);
                                } catch (t) {
                                  (0, a.info)(
                                    "Cannot use postMessage transfers"
                                  ),
                                    (e[0] = 0),
                                    l.send("test", e);
                                }
                              };
                              return void u();
                            } catch (e) {
                              (0, a.info)("The worker has been disabled.");
                            }
                          }
                          this._setupFakeWorker();
                        },
                      },
                      {
                        key: "_setupFakeWorker",
                        value: function () {
                          var t = this;
                          A ||
                            ((0, a.warn)("Setting up fake worker."), (A = !0)),
                            (function () {
                              if (e) return e.promise;
                              e = (0, a.createPromiseCapability)();
                              var t = i();
                              return t
                                ? (e.resolve(t), e.promise)
                                : ((
                                    E ||
                                    function () {
                                      return (0, r.loadScript)(o()).then(
                                        function () {
                                          return window.pdfjsWorker
                                            .WorkerMessageHandler;
                                        }
                                      );
                                    }
                                  )().then(e.resolve, e.reject),
                                  e.promise);
                            })()
                              .then(function (e) {
                                if (t.destroyed)
                                  t._readyCapability.reject(
                                    new Error("Worker was destroyed")
                                  );
                                else {
                                  var o = new R();
                                  t._port = o;
                                  var i = "fake" + n++,
                                    a = new p.MessageHandler(
                                      i + "_worker",
                                      i,
                                      o
                                    );
                                  e.setup(a, o);
                                  var r = new p.MessageHandler(
                                    i,
                                    i + "_worker",
                                    o
                                  );
                                  (t._messageHandler = r),
                                    t._readyCapability.resolve();
                                }
                              })
                              .catch(function (e) {
                                t._readyCapability.reject(
                                  new Error(
                                    'Setting up fake worker failed: "'.concat(
                                      e.message,
                                      '".'
                                    )
                                  )
                                );
                              });
                        },
                      },
                      {
                        key: "destroy",
                        value: function () {
                          (this.destroyed = !0),
                            this._webWorker &&
                              (this._webWorker.terminate(),
                              (this._webWorker = null)),
                            t.delete(this._port),
                            (this._port = null),
                            this._messageHandler &&
                              (this._messageHandler.destroy(),
                              (this._messageHandler = null));
                        },
                      },
                      {
                        key: "promise",
                        get: function () {
                          return this._readyCapability.promise;
                        },
                      },
                      {
                        key: "port",
                        get: function () {
                          return this._port;
                        },
                      },
                      {
                        key: "messageHandler",
                        get: function () {
                          return this._messageHandler;
                        },
                      },
                    ],
                    [
                      {
                        key: "fromPort",
                        value: function (e) {
                          if (!e || !e.port)
                            throw new Error(
                              "PDFWorker.fromPort - invalid method signature."
                            );
                          return t.has(e.port) ? t.get(e.port) : new s(e);
                        },
                      },
                      {
                        key: "getWorkerSrc",
                        value: function () {
                          return o();
                        },
                      },
                    ]
                  ),
                  s
                );
              })();
            })();
            t.PDFWorker = M;
            var N,
              B = (function () {
                function e(t, n, o, i) {
                  b(this, e),
                    (this.messageHandler = t),
                    (this.loadingTask = n),
                    (this.commonObjs = new U()),
                    (this.fontLoader = new s.FontLoader({
                      docId: n.docId,
                      onUnsupportedFeature:
                        this._onUnsupportedFeature.bind(this),
                    })),
                    (this._params = i),
                    (this.CMapReaderFactory = new i.CMapReaderFactory({
                      baseUrl: i.cMapUrl,
                      isCompressed: i.cMapPacked,
                    })),
                    (this.destroyed = !1),
                    (this.destroyCapability = null),
                    (this._passwordCapability = null),
                    (this._networkStream = o),
                    (this._fullReader = null),
                    (this._lastProgress = null),
                    (this.pageCache = []),
                    (this.pagePromises = []),
                    (this.downloadInfoCapability = (0,
                    a.createPromiseCapability)()),
                    this.setupMessageHandler();
                }
                return (
                  C(e, [
                    {
                      key: "destroy",
                      value: function () {
                        var e = this;
                        if (this.destroyCapability)
                          return this.destroyCapability.promise;
                        (this.destroyed = !0),
                          (this.destroyCapability = (0,
                          a.createPromiseCapability)()),
                          this._passwordCapability &&
                            this._passwordCapability.reject(
                              new Error(
                                "Worker was destroyed during onPassword callback"
                              )
                            );
                        var t = [];
                        this.pageCache.forEach(function (e) {
                          e && t.push(e._destroy());
                        }),
                          (this.pageCache = []),
                          (this.pagePromises = []);
                        var n = this.messageHandler.sendWithPromise(
                          "Terminate",
                          null
                        );
                        return (
                          t.push(n),
                          Promise.all(t).then(function () {
                            e.fontLoader.clear(),
                              e._networkStream &&
                                e._networkStream.cancelAllRequests(),
                              e.messageHandler &&
                                (e.messageHandler.destroy(),
                                (e.messageHandler = null)),
                              e.destroyCapability.resolve();
                          }, this.destroyCapability.reject),
                          this.destroyCapability.promise
                        );
                      },
                    },
                    {
                      key: "setupMessageHandler",
                      value: function () {
                        var e = this.messageHandler,
                          t = this.loadingTask;
                        e.on(
                          "GetReader",
                          function (e, t) {
                            var n = this;
                            (0, a.assert)(this._networkStream),
                              (this._fullReader =
                                this._networkStream.getFullReader()),
                              (this._fullReader.onProgress = function (e) {
                                n._lastProgress = {
                                  loaded: e.loaded,
                                  total: e.total,
                                };
                              }),
                              (t.onPull = function () {
                                n._fullReader
                                  .read()
                                  .then(function (e) {
                                    var n = e.value;
                                    e.done
                                      ? t.close()
                                      : ((0, a.assert)((0, a.isArrayBuffer)(n)),
                                        t.enqueue(new Uint8Array(n), 1, [n]));
                                  })
                                  .catch(function (e) {
                                    t.error(e);
                                  });
                              }),
                              (t.onCancel = function (e) {
                                n._fullReader.cancel(e);
                              });
                          },
                          this
                        ),
                          e.on(
                            "ReaderHeadersReady",
                            function (e) {
                              var n = this,
                                o = (0, a.createPromiseCapability)(),
                                i = this._fullReader;
                              return (
                                i.headersReady.then(function () {
                                  (i.isStreamingSupported &&
                                    i.isRangeSupported) ||
                                    (n._lastProgress &&
                                      t.onProgress &&
                                      t.onProgress(n._lastProgress),
                                    (i.onProgress = function (e) {
                                      t.onProgress &&
                                        t.onProgress({
                                          loaded: e.loaded,
                                          total: e.total,
                                        });
                                    })),
                                    o.resolve({
                                      isStreamingSupported:
                                        i.isStreamingSupported,
                                      isRangeSupported: i.isRangeSupported,
                                      contentLength: i.contentLength,
                                    });
                                }, o.reject),
                                o.promise
                              );
                            },
                            this
                          ),
                          e.on(
                            "GetRangeReader",
                            function (e, t) {
                              (0, a.assert)(this._networkStream);
                              var n = this._networkStream.getRangeReader(
                                e.begin,
                                e.end
                              );
                              (t.onPull = function () {
                                n.read()
                                  .then(function (e) {
                                    var n = e.value;
                                    e.done
                                      ? t.close()
                                      : ((0, a.assert)((0, a.isArrayBuffer)(n)),
                                        t.enqueue(new Uint8Array(n), 1, [n]));
                                  })
                                  .catch(function (e) {
                                    t.error(e);
                                  });
                              }),
                                (t.onCancel = function (e) {
                                  n.cancel(e);
                                });
                            },
                            this
                          ),
                          e.on(
                            "GetDoc",
                            function (e) {
                              var n = e.pdfInfo;
                              (this.numPages = n.numPages),
                                (this.pdfDocument = new O(n, this, t)),
                                t._capability.resolve(this.pdfDocument);
                            },
                            this
                          ),
                          e.on(
                            "PasswordRequest",
                            function (e) {
                              var n = this;
                              if (
                                ((this._passwordCapability = (0,
                                a.createPromiseCapability)()),
                                t.onPassword)
                              )
                                try {
                                  t.onPassword(function (e) {
                                    n._passwordCapability.resolve({
                                      password: e,
                                    });
                                  }, e.code);
                                } catch (e) {
                                  this._passwordCapability.reject(e);
                                }
                              else
                                this._passwordCapability.reject(
                                  new a.PasswordException(e.message, e.code)
                                );
                              return this._passwordCapability.promise;
                            },
                            this
                          ),
                          e.on(
                            "PasswordException",
                            function (e) {
                              t._capability.reject(
                                new a.PasswordException(e.message, e.code)
                              );
                            },
                            this
                          ),
                          e.on(
                            "InvalidPDF",
                            function (e) {
                              t._capability.reject(
                                new a.InvalidPDFException(e.message)
                              );
                            },
                            this
                          ),
                          e.on(
                            "MissingPDF",
                            function (e) {
                              t._capability.reject(
                                new a.MissingPDFException(e.message)
                              );
                            },
                            this
                          ),
                          e.on(
                            "UnexpectedResponse",
                            function (e) {
                              t._capability.reject(
                                new a.UnexpectedResponseException(
                                  e.message,
                                  e.status
                                )
                              );
                            },
                            this
                          ),
                          e.on(
                            "UnknownError",
                            function (e) {
                              t._capability.reject(
                                new a.UnknownErrorException(
                                  e.message,
                                  e.details
                                )
                              );
                            },
                            this
                          ),
                          e.on(
                            "DataLoaded",
                            function (e) {
                              t.onProgress &&
                                t.onProgress({
                                  loaded: e.length,
                                  total: e.length,
                                }),
                                this.downloadInfoCapability.resolve(e);
                            },
                            this
                          ),
                          e.on(
                            "StartRenderPage",
                            function (e) {
                              if (!this.destroyed) {
                                var t = this.pageCache[e.pageIndex];
                                t._stats.timeEnd("Page Request"),
                                  t._startRenderPage(e.transparency, e.intent);
                              }
                            },
                            this
                          ),
                          e.on(
                            "RenderPageChunk",
                            function (e) {
                              this.destroyed ||
                                this.pageCache[e.pageIndex]._renderPageChunk(
                                  e.operatorList,
                                  e.intent
                                );
                            },
                            this
                          ),
                          e.on(
                            "commonobj",
                            function (t) {
                              var n = this;
                              if (!this.destroyed) {
                                var o = v(t, 3),
                                  i = o[0],
                                  r = o[1],
                                  l = o[2];
                                if (!this.commonObjs.has(i))
                                  switch (r) {
                                    case "Font":
                                      var c = this._params;
                                      if ("error" in l) {
                                        var u = l.error;
                                        (0, a.warn)(
                                          "Error during font loading: ".concat(
                                            u
                                          )
                                        ),
                                          this.commonObjs.resolve(i, u);
                                        break;
                                      }
                                      var p = null;
                                      c.pdfBug &&
                                        d.default.FontInspector &&
                                        d.default.FontInspector.enabled &&
                                        (p = {
                                          registerFont: function (e, t) {
                                            d.default.FontInspector.fontAdded(
                                              e,
                                              t
                                            );
                                          },
                                        });
                                      var g = new s.FontFaceObject(l, {
                                        isEvalSupported: c.isEvalSupported,
                                        disableFontFace: c.disableFontFace,
                                        ignoreErrors: c.ignoreErrors,
                                        onUnsupportedFeature:
                                          this._onUnsupportedFeature.bind(this),
                                        fontRegistry: p,
                                      });
                                      this.fontLoader.bind(g).then(
                                        function () {
                                          n.commonObjs.resolve(i, g);
                                        },
                                        function (t) {
                                          e.sendWithPromise("FontFallback", {
                                            id: i,
                                          }).finally(function () {
                                            n.commonObjs.resolve(i, g);
                                          });
                                        }
                                      );
                                      break;
                                    case "FontPath":
                                      this.commonObjs.resolve(i, l);
                                      break;
                                    default:
                                      throw new Error(
                                        "Got unknown common object type ".concat(
                                          r
                                        )
                                      );
                                  }
                              }
                            },
                            this
                          ),
                          e.on(
                            "obj",
                            function (e) {
                              if (!this.destroyed) {
                                var t = v(e, 4),
                                  n = t[0],
                                  o = t[1],
                                  i = t[2],
                                  a = t[3],
                                  r = this.pageCache[o];
                                if (!r.objs.has(n))
                                  switch (i) {
                                    case "JpegStream":
                                      return new Promise(function (e, t) {
                                        var n = new Image();
                                        (n.onload = function () {
                                          e(n);
                                        }),
                                          (n.onerror = function () {
                                            t(
                                              new Error(
                                                "Error during JPEG image loading"
                                              )
                                            );
                                          }),
                                          (n.src = a);
                                      }).then(function (e) {
                                        r.objs.resolve(n, e);
                                      });
                                    case "Image":
                                      r.objs.resolve(n, a),
                                        a &&
                                          "data" in a &&
                                          a.data.length > 8e6 &&
                                          (r.cleanupAfterRender = !0);
                                      break;
                                    default:
                                      throw new Error(
                                        "Got unknown object type ".concat(i)
                                      );
                                  }
                              }
                            },
                            this
                          ),
                          e.on(
                            "DocProgress",
                            function (e) {
                              this.destroyed ||
                                (t.onProgress &&
                                  t.onProgress({
                                    loaded: e.loaded,
                                    total: e.total,
                                  }));
                            },
                            this
                          ),
                          e.on(
                            "PageError",
                            function (e) {
                              if (!this.destroyed) {
                                var t =
                                  this.pageCache[e.pageNum - 1].intentStates[
                                    e.intent
                                  ];
                                if (!t.displayReadyCapability)
                                  throw new Error(e.error);
                                if (
                                  (t.displayReadyCapability.reject(e.error),
                                  t.operatorList)
                                ) {
                                  t.operatorList.lastChunk = !0;
                                  for (var n = 0; n < t.renderTasks.length; n++)
                                    t.renderTasks[n].operatorListChanged();
                                }
                              }
                            },
                            this
                          ),
                          e.on(
                            "UnsupportedFeature",
                            this._onUnsupportedFeature,
                            this
                          ),
                          e.on(
                            "JpegDecode",
                            function (e) {
                              if (this.destroyed)
                                return Promise.reject(
                                  new Error("Worker was destroyed")
                                );
                              if ("undefined" == typeof document)
                                return Promise.reject(
                                  new Error('"document" is not defined.')
                                );
                              var t = v(e, 2),
                                n = t[0],
                                o = t[1];
                              return 3 !== o && 1 !== o
                                ? Promise.reject(
                                    new Error(
                                      "Only 3 components or 1 component can be returned"
                                    )
                                  )
                                : new Promise(function (e, t) {
                                    var i = new Image();
                                    (i.onload = function () {
                                      var t = i.width,
                                        n = i.height,
                                        a = t * n,
                                        r = 4 * a,
                                        s = new Uint8ClampedArray(a * o),
                                        l = document.createElement("canvas");
                                      (l.width = t), (l.height = n);
                                      var c = l.getContext("2d");
                                      c.drawImage(i, 0, 0);
                                      var d = c.getImageData(0, 0, t, n).data;
                                      if (3 === o)
                                        for (
                                          var u = 0, p = 0;
                                          u < r;
                                          u += 4, p += 3
                                        )
                                          (s[p] = d[u]),
                                            (s[p + 1] = d[u + 1]),
                                            (s[p + 2] = d[u + 2]);
                                      else if (1 === o)
                                        for (
                                          var g = 0, h = 0;
                                          g < r;
                                          g += 4, h++
                                        )
                                          s[h] = d[g];
                                      e({ data: s, width: t, height: n });
                                    }),
                                      (i.onerror = function () {
                                        t(
                                          new Error(
                                            "JpegDecode failed to load image"
                                          )
                                        );
                                      }),
                                      (i.src = n);
                                  });
                            },
                            this
                          ),
                          e.on(
                            "FetchBuiltInCMap",
                            function (e) {
                              return this.destroyed
                                ? Promise.reject(
                                    new Error("Worker was destroyed")
                                  )
                                : this.CMapReaderFactory.fetch({
                                    name: e.name,
                                  });
                            },
                            this
                          );
                      },
                    },
                    {
                      key: "_onUnsupportedFeature",
                      value: function (e) {
                        var t = e.featureId;
                        this.destroyed ||
                          (this.loadingTask.onUnsupportedFeature &&
                            this.loadingTask.onUnsupportedFeature(t));
                      },
                    },
                    {
                      key: "getData",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetData",
                          null
                        );
                      },
                    },
                    {
                      key: "getPage",
                      value: function (e) {
                        var t = this;
                        if (!Number.isInteger(e) || e <= 0 || e > this.numPages)
                          return Promise.reject(
                            new Error("Invalid page request")
                          );
                        var n = e - 1;
                        if (n in this.pagePromises) return this.pagePromises[n];
                        var o = this.messageHandler
                          .sendWithPromise("GetPage", { pageIndex: n })
                          .then(function (e) {
                            if (t.destroyed)
                              throw new Error("Transport destroyed");
                            var o = new F(n, e, t, t._params.pdfBug);
                            return (t.pageCache[n] = o), o;
                          });
                        return (this.pagePromises[n] = o), o;
                      },
                    },
                    {
                      key: "getPageIndex",
                      value: function (e) {
                        return this.messageHandler
                          .sendWithPromise("GetPageIndex", { ref: e })
                          .catch(function (e) {
                            return Promise.reject(new Error(e));
                          });
                      },
                    },
                    {
                      key: "getAnnotations",
                      value: function (e, t) {
                        return this.messageHandler.sendWithPromise(
                          "GetAnnotations",
                          { pageIndex: e, intent: t }
                        );
                      },
                    },
                    {
                      key: "getDestinations",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetDestinations",
                          null
                        );
                      },
                    },
                    {
                      key: "getDestination",
                      value: function (e) {
                        return "string" != typeof e
                          ? Promise.reject(
                              new Error("Invalid destination request.")
                            )
                          : this.messageHandler.sendWithPromise(
                              "GetDestination",
                              { id: e }
                            );
                      },
                    },
                    {
                      key: "getPageLabels",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetPageLabels",
                          null
                        );
                      },
                    },
                    {
                      key: "getPageMode",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetPageMode",
                          null
                        );
                      },
                    },
                    {
                      key: "getOpenActionDestination",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "getOpenActionDestination",
                          null
                        );
                      },
                    },
                    {
                      key: "getAttachments",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetAttachments",
                          null
                        );
                      },
                    },
                    {
                      key: "getJavaScript",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetJavaScript",
                          null
                        );
                      },
                    },
                    {
                      key: "getOutline",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetOutline",
                          null
                        );
                      },
                    },
                    {
                      key: "getPermissions",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetPermissions",
                          null
                        );
                      },
                    },
                    {
                      key: "getMetadata",
                      value: function () {
                        var e = this;
                        return this.messageHandler
                          .sendWithPromise("GetMetadata", null)
                          .then(function (t) {
                            return {
                              info: t[0],
                              metadata: t[1] ? new g.Metadata(t[1]) : null,
                              contentDispositionFilename: e._fullReader
                                ? e._fullReader.filename
                                : null,
                            };
                          });
                      },
                    },
                    {
                      key: "getStats",
                      value: function () {
                        return this.messageHandler.sendWithPromise(
                          "GetStats",
                          null
                        );
                      },
                    },
                    {
                      key: "startCleanup",
                      value: function () {
                        var e = this;
                        this.messageHandler
                          .sendWithPromise("Cleanup", null)
                          .then(function () {
                            for (
                              var t = 0, n = e.pageCache.length;
                              t < n;
                              t++
                            ) {
                              var o = e.pageCache[t];
                              o && o.cleanup();
                            }
                            e.commonObjs.clear(), e.fontLoader.clear();
                          });
                      },
                    },
                    {
                      key: "loadingParams",
                      get: function () {
                        var e = this._params;
                        return (0, a.shadow)(this, "loadingParams", {
                          disableAutoFetch: e.disableAutoFetch,
                          disableCreateObjectURL: e.disableCreateObjectURL,
                          disableFontFace: e.disableFontFace,
                          nativeImageDecoderSupport:
                            e.nativeImageDecoderSupport,
                        });
                      },
                    },
                  ]),
                  e
                );
              })(),
              U = (function () {
                function e() {
                  b(this, e), (this._objs = Object.create(null));
                }
                return (
                  C(e, [
                    {
                      key: "_ensureObj",
                      value: function (e) {
                        return this._objs[e]
                          ? this._objs[e]
                          : (this._objs[e] = {
                              capability: (0, a.createPromiseCapability)(),
                              data: null,
                              resolved: !1,
                            });
                      },
                    },
                    {
                      key: "get",
                      value: function (e) {
                        var t =
                          arguments.length > 1 && void 0 !== arguments[1]
                            ? arguments[1]
                            : null;
                        if (t)
                          return (
                            this._ensureObj(e).capability.promise.then(t), null
                          );
                        var n = this._objs[e];
                        if (!n || !n.resolved)
                          throw new Error(
                            "Requesting object that isn't resolved yet ".concat(
                              e,
                              "."
                            )
                          );
                        return n.data;
                      },
                    },
                    {
                      key: "has",
                      value: function (e) {
                        var t = this._objs[e];
                        return !!t && t.resolved;
                      },
                    },
                    {
                      key: "resolve",
                      value: function (e, t) {
                        var n = this._ensureObj(e);
                        (n.resolved = !0),
                          (n.data = t),
                          n.capability.resolve(t);
                      },
                    },
                    {
                      key: "clear",
                      value: function () {
                        this._objs = Object.create(null);
                      },
                    },
                  ]),
                  e
                );
              })(),
              $ = (function () {
                function e(t) {
                  b(this, e),
                    (this._internalRenderTask = t),
                    (this.onContinue = null);
                }
                return (
                  C(e, [
                    {
                      key: "cancel",
                      value: function () {
                        this._internalRenderTask.cancel();
                      },
                    },
                    {
                      key: "then",
                      value: function (e, t) {
                        return (
                          (0, a.deprecated)(
                            "RenderTask.then method, use the `promise` getter instead."
                          ),
                          this.promise.then.apply(this.promise, arguments)
                        );
                      },
                    },
                    {
                      key: "promise",
                      get: function () {
                        return this._internalRenderTask.capability.promise;
                      },
                    },
                  ]),
                  e
                );
              })(),
              j =
                ((N = new WeakSet()),
                (function () {
                  function e(t) {
                    var n = t.callback,
                      o = t.params,
                      i = t.objs,
                      r = t.commonObjs,
                      s = t.operatorList,
                      l = t.pageNumber,
                      d = t.canvasFactory,
                      u = t.canvasGraphicsClass,
                      p = t.webGLContext,
                      g = t.useRequestAnimationFrame,
                      h = void 0 !== g && g,
                      f = t.pdfBug,
                      m = void 0 !== f && f;
                    b(this, e),
                      (this.callback = n),
                      (this.params = o),
                      (this.objs = i),
                      (this.commonObjs = r),
                      (this.operatorListIdx = null),
                      (this.operatorList = s),
                      (this.pageNumber = l),
                      (this.canvasFactory = d),
                      (this.CanvasGraphics = u || c.CanvasGraphics),
                      (this.webGLContext = p),
                      (this._pdfBug = m),
                      (this.running = !1),
                      (this.graphicsReadyCallback = null),
                      (this.graphicsReady = !1),
                      (this._useRequestAnimationFrame =
                        !0 === h && "undefined" != typeof window),
                      (this.cancelled = !1),
                      (this.capability = (0, a.createPromiseCapability)()),
                      (this.task = new $(this)),
                      (this._continueBound = this._continue.bind(this)),
                      (this._scheduleNextBound = this._scheduleNext.bind(this)),
                      (this._nextBound = this._next.bind(this)),
                      (this._canvas = o.canvasContext.canvas);
                  }
                  var t, n;
                  return (
                    C(e, [
                      {
                        key: "initializeGraphics",
                        value: function () {
                          var e =
                            arguments.length > 0 &&
                            void 0 !== arguments[0] &&
                            arguments[0];
                          if (!this.cancelled) {
                            if (this._canvas) {
                              if (N.has(this._canvas))
                                throw new Error(
                                  "Cannot use the same canvas during multiple render() operations. Use different canvas or ensure previous operations were cancelled or completed."
                                );
                              N.add(this._canvas);
                            }
                            this._pdfBug &&
                              d.default.StepperManager &&
                              d.default.StepperManager.enabled &&
                              ((this.stepper = d.default.StepperManager.create(
                                this.pageNumber - 1
                              )),
                              this.stepper.init(this.operatorList),
                              (this.stepper.nextBreakPoint =
                                this.stepper.getNextBreakPoint()));
                            var t = this.params,
                              n = t.canvasContext,
                              o = t.viewport,
                              i = t.transform,
                              a = t.imageLayer,
                              r = t.background;
                            (this.gfx = new this.CanvasGraphics(
                              n,
                              this.commonObjs,
                              this.objs,
                              this.canvasFactory,
                              this.webGLContext,
                              a
                            )),
                              this.gfx.beginDrawing({
                                transform: i,
                                viewport: o,
                                transparency: e,
                                background: r,
                              }),
                              (this.operatorListIdx = 0),
                              (this.graphicsReady = !0),
                              this.graphicsReadyCallback &&
                                this.graphicsReadyCallback();
                          }
                        },
                      },
                      {
                        key: "cancel",
                        value: function () {
                          var e =
                            arguments.length > 0 && void 0 !== arguments[0]
                              ? arguments[0]
                              : null;
                          (this.running = !1),
                            (this.cancelled = !0),
                            this.gfx && this.gfx.endDrawing(),
                            this._canvas && N.delete(this._canvas),
                            this.callback(
                              e ||
                                new r.RenderingCancelledException(
                                  "Rendering cancelled, page ".concat(
                                    this.pageNumber
                                  ),
                                  "canvas"
                                )
                            );
                        },
                      },
                      {
                        key: "operatorListChanged",
                        value: function () {
                          this.graphicsReady
                            ? (this.stepper &&
                                this.stepper.updateOperatorList(
                                  this.operatorList
                                ),
                              this.running || this._continue())
                            : this.graphicsReadyCallback ||
                              (this.graphicsReadyCallback =
                                this._continueBound);
                        },
                      },
                      {
                        key: "_continue",
                        value: function () {
                          (this.running = !0),
                            this.cancelled ||
                              (this.task.onContinue
                                ? this.task.onContinue(this._scheduleNextBound)
                                : this._scheduleNext());
                        },
                      },
                      {
                        key: "_scheduleNext",
                        value: function () {
                          var e = this;
                          this._useRequestAnimationFrame
                            ? window.requestAnimationFrame(function () {
                                e._nextBound().catch(e.cancel.bind(e));
                              })
                            : Promise.resolve()
                                .then(this._nextBound)
                                .catch(this.cancel.bind(this));
                        },
                      },
                      {
                        key: "_next",
                        value:
                          ((t = i.default.mark(function e() {
                            return i.default.wrap(
                              function (e) {
                                for (;;)
                                  switch ((e.prev = e.next)) {
                                    case 0:
                                      if (!this.cancelled) {
                                        e.next = 2;
                                        break;
                                      }
                                      return e.abrupt("return");
                                    case 2:
                                      try {
                                        (this.operatorListIdx =
                                          this.gfx.executeOperatorList(
                                            this.operatorList,
                                            this.operatorListIdx,
                                            this._continueBound,
                                            this.stepper,
                                            this.params.progress
                                          )),
                                          this.operatorListIdx ===
                                            this.operatorList.argsArray
                                              .length &&
                                            ((this.running = !1),
                                            this.operatorList.lastChunk &&
                                              (this.gfx.endDrawing(),
                                              this._canvas &&
                                                N.delete(this._canvas),
                                              this.callback()));
                                      } catch (e) {
                                        this.capability.reject(e);
                                      }
                                    case 3:
                                    case "end":
                                      return e.stop();
                                  }
                              },
                              e,
                              this
                            );
                          })),
                          (n = function () {
                            var e = this,
                              n = arguments;
                            return new Promise(function (o, i) {
                              var a = t.apply(e, n);
                              function r(e) {
                                y(a, o, i, r, s, "next", e);
                              }
                              function s(e) {
                                y(a, o, i, r, s, "throw", e);
                              }
                              r(void 0);
                            });
                          }),
                          function () {
                            return n.apply(this, arguments);
                          }),
                      },
                    ]),
                    e
                  );
                })());
            (t.version = "2.1.286"), (t.build = "7525e341");
          },
          function (e, t, n) {
            "use strict";
            e.exports = n(148);
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            var i =
                (function () {
                  return (
                    this ||
                    ("object" ===
                      ("undefined" == typeof self ? "undefined" : o(self)) &&
                      self)
                  );
                })() || Function("return this")(),
              a =
                i.regeneratorRuntime &&
                Object.getOwnPropertyNames(i).indexOf("regeneratorRuntime") >=
                  0,
              r = a && i.regeneratorRuntime;
            if (((i.regeneratorRuntime = void 0), (e.exports = n(149)), a))
              i.regeneratorRuntime = r;
            else
              try {
                delete i.regeneratorRuntime;
              } catch (e) {
                i.regeneratorRuntime = void 0;
              }
          },
          function (e, t, n) {
            "use strict";
            (function (e) {
              function t(e) {
                return (t =
                  "function" == typeof Symbol &&
                  "symbol" == typeof Symbol.iterator
                    ? function (e) {
                        return typeof e;
                      }
                    : function (e) {
                        return e &&
                          "function" == typeof Symbol &&
                          e.constructor === Symbol &&
                          e !== Symbol.prototype
                          ? "symbol"
                          : typeof e;
                      })(e);
              }
              !(function (n) {
                var o = Object.prototype,
                  i = o.hasOwnProperty,
                  a = "function" == typeof Symbol ? Symbol : {},
                  r = a.iterator || "@@iterator",
                  s = a.asyncIterator || "@@asyncIterator",
                  l = a.toStringTag || "@@toStringTag",
                  c = "object" === t(e),
                  d = n.regeneratorRuntime;
                if (d) c && (e.exports = d);
                else {
                  (d = n.regeneratorRuntime = c ? e.exports : {}).wrap = m;
                  var u = {},
                    p = {};
                  p[r] = function () {
                    return this;
                  };
                  var g = Object.getPrototypeOf,
                    h = g && g(g(T([])));
                  h && h !== o && i.call(h, r) && (p = h);
                  var f = (b.prototype = v.prototype = Object.create(p));
                  (_.prototype = f.constructor = b),
                    (b.constructor = _),
                    (b[l] = _.displayName = "GeneratorFunction"),
                    (d.isGeneratorFunction = function (e) {
                      var t = "function" == typeof e && e.constructor;
                      return (
                        !!t &&
                        (t === _ ||
                          "GeneratorFunction" === (t.displayName || t.name))
                      );
                    }),
                    (d.mark = function (e) {
                      return (
                        Object.setPrototypeOf
                          ? Object.setPrototypeOf(e, b)
                          : ((e.__proto__ = b),
                            l in e || (e[l] = "GeneratorFunction")),
                        (e.prototype = Object.create(f)),
                        e
                      );
                    }),
                    (d.awrap = function (e) {
                      return { __await: e };
                    }),
                    w(C.prototype),
                    (C.prototype[s] = function () {
                      return this;
                    }),
                    (d.AsyncIterator = C),
                    (d.async = function (e, t, n, o) {
                      var i = new C(m(e, t, n, o));
                      return d.isGeneratorFunction(t)
                        ? i
                        : i.next().then(function (e) {
                            return e.done ? e.value : i.next();
                          });
                    }),
                    w(f),
                    (f[l] = "Generator"),
                    (f[r] = function () {
                      return this;
                    }),
                    (f.toString = function () {
                      return "[object Generator]";
                    }),
                    (d.keys = function (e) {
                      var t = [];
                      for (var n in e) t.push(n);
                      return (
                        t.reverse(),
                        function n() {
                          for (; t.length; ) {
                            var o = t.pop();
                            if (o in e) return (n.value = o), (n.done = !1), n;
                          }
                          return (n.done = !0), n;
                        }
                      );
                    }),
                    (d.values = T),
                    (A.prototype = {
                      constructor: A,
                      reset: function (e) {
                        if (
                          ((this.prev = 0),
                          (this.next = 0),
                          (this.sent = this._sent = void 0),
                          (this.done = !1),
                          (this.delegate = null),
                          (this.method = "next"),
                          (this.arg = void 0),
                          this.tryEntries.forEach(E),
                          !e)
                        )
                          for (var t in this)
                            "t" === t.charAt(0) &&
                              i.call(this, t) &&
                              !isNaN(+t.slice(1)) &&
                              (this[t] = void 0);
                      },
                      stop: function () {
                        this.done = !0;
                        var e = this.tryEntries[0].completion;
                        if ("throw" === e.type) throw e.arg;
                        return this.rval;
                      },
                      dispatchException: function (e) {
                        if (this.done) throw e;
                        var t = this;
                        function n(n, o) {
                          return (
                            (r.type = "throw"),
                            (r.arg = e),
                            (t.next = n),
                            o && ((t.method = "next"), (t.arg = void 0)),
                            !!o
                          );
                        }
                        for (var o = this.tryEntries.length - 1; o >= 0; --o) {
                          var a = this.tryEntries[o],
                            r = a.completion;
                          if ("root" === a.tryLoc) return n("end");
                          if (a.tryLoc <= this.prev) {
                            var s = i.call(a, "catchLoc"),
                              l = i.call(a, "finallyLoc");
                            if (s && l) {
                              if (this.prev < a.catchLoc)
                                return n(a.catchLoc, !0);
                              if (this.prev < a.finallyLoc)
                                return n(a.finallyLoc);
                            } else if (s) {
                              if (this.prev < a.catchLoc)
                                return n(a.catchLoc, !0);
                            } else {
                              if (!l)
                                throw new Error(
                                  "try statement without catch or finally"
                                );
                              if (this.prev < a.finallyLoc)
                                return n(a.finallyLoc);
                            }
                          }
                        }
                      },
                      abrupt: function (e, t) {
                        for (var n = this.tryEntries.length - 1; n >= 0; --n) {
                          var o = this.tryEntries[n];
                          if (
                            o.tryLoc <= this.prev &&
                            i.call(o, "finallyLoc") &&
                            this.prev < o.finallyLoc
                          ) {
                            var a = o;
                            break;
                          }
                        }
                        a &&
                          ("break" === e || "continue" === e) &&
                          a.tryLoc <= t &&
                          t <= a.finallyLoc &&
                          (a = null);
                        var r = a ? a.completion : {};
                        return (
                          (r.type = e),
                          (r.arg = t),
                          a
                            ? ((this.method = "next"),
                              (this.next = a.finallyLoc),
                              u)
                            : this.complete(r)
                        );
                      },
                      complete: function (e, t) {
                        if ("throw" === e.type) throw e.arg;
                        return (
                          "break" === e.type || "continue" === e.type
                            ? (this.next = e.arg)
                            : "return" === e.type
                            ? ((this.rval = this.arg = e.arg),
                              (this.method = "return"),
                              (this.next = "end"))
                            : "normal" === e.type && t && (this.next = t),
                          u
                        );
                      },
                      finish: function (e) {
                        for (var t = this.tryEntries.length - 1; t >= 0; --t) {
                          var n = this.tryEntries[t];
                          if (n.finallyLoc === e)
                            return (
                              this.complete(n.completion, n.afterLoc), E(n), u
                            );
                        }
                      },
                      catch: function (e) {
                        for (var t = this.tryEntries.length - 1; t >= 0; --t) {
                          var n = this.tryEntries[t];
                          if (n.tryLoc === e) {
                            var o = n.completion;
                            if ("throw" === o.type) {
                              var i = o.arg;
                              E(n);
                            }
                            return i;
                          }
                        }
                        throw new Error("illegal catch attempt");
                      },
                      delegateYield: function (e, t, n) {
                        return (
                          (this.delegate = {
                            iterator: T(e),
                            resultName: t,
                            nextLoc: n,
                          }),
                          "next" === this.method && (this.arg = void 0),
                          u
                        );
                      },
                    });
                }
                function m(e, t, n, o) {
                  var i = t && t.prototype instanceof v ? t : v,
                    a = Object.create(i.prototype),
                    r = new A(o || []);
                  return (
                    (a._invoke = (function (e, t, n) {
                      var o = "suspendedStart";
                      return function (i, a) {
                        if ("executing" === o)
                          throw new Error("Generator is already running");
                        if ("completed" === o) {
                          if ("throw" === i) throw a;
                          return { value: void 0, done: !0 };
                        }
                        for (n.method = i, n.arg = a; ; ) {
                          var r = n.delegate;
                          if (r) {
                            var s = x(r, n);
                            if (s) {
                              if (s === u) continue;
                              return s;
                            }
                          }
                          if ("next" === n.method) n.sent = n._sent = n.arg;
                          else if ("throw" === n.method) {
                            if ("suspendedStart" === o)
                              throw ((o = "completed"), n.arg);
                            n.dispatchException(n.arg);
                          } else
                            "return" === n.method && n.abrupt("return", n.arg);
                          o = "executing";
                          var l = y(e, t, n);
                          if ("normal" === l.type) {
                            if (
                              ((o = n.done ? "completed" : "suspendedYield"),
                              l.arg === u)
                            )
                              continue;
                            return { value: l.arg, done: n.done };
                          }
                          "throw" === l.type &&
                            ((o = "completed"),
                            (n.method = "throw"),
                            (n.arg = l.arg));
                        }
                      };
                    })(e, n, r)),
                    a
                  );
                }
                function y(e, t, n) {
                  try {
                    return { type: "normal", arg: e.call(t, n) };
                  } catch (e) {
                    return { type: "throw", arg: e };
                  }
                }
                function v() {}
                function _() {}
                function b() {}
                function w(e) {
                  ["next", "throw", "return"].forEach(function (t) {
                    e[t] = function (e) {
                      return this._invoke(t, e);
                    };
                  });
                }
                function C(e) {
                  var n;
                  this._invoke = function (o, a) {
                    function r() {
                      return new Promise(function (n, r) {
                        !(function n(o, a, r, s) {
                          var l = y(e[o], e, a);
                          if ("throw" !== l.type) {
                            var c = l.arg,
                              d = c.value;
                            return d &&
                              "object" === t(d) &&
                              i.call(d, "__await")
                              ? Promise.resolve(d.__await).then(
                                  function (e) {
                                    n("next", e, r, s);
                                  },
                                  function (e) {
                                    n("throw", e, r, s);
                                  }
                                )
                              : Promise.resolve(d).then(
                                  function (e) {
                                    (c.value = e), r(c);
                                  },
                                  function (e) {
                                    return n("throw", e, r, s);
                                  }
                                );
                          }
                          s(l.arg);
                        })(o, a, n, r);
                      });
                    }
                    return (n = n ? n.then(r, r) : r());
                  };
                }
                function x(e, t) {
                  var n = e.iterator[t.method];
                  if (void 0 === n) {
                    if (((t.delegate = null), "throw" === t.method)) {
                      if (
                        e.iterator.return &&
                        ((t.method = "return"),
                        (t.arg = void 0),
                        x(e, t),
                        "throw" === t.method)
                      )
                        return u;
                      (t.method = "throw"),
                        (t.arg = new TypeError(
                          "The iterator does not provide a 'throw' method"
                        ));
                    }
                    return u;
                  }
                  var o = y(n, e.iterator, t.arg);
                  if ("throw" === o.type)
                    return (
                      (t.method = "throw"),
                      (t.arg = o.arg),
                      (t.delegate = null),
                      u
                    );
                  var i = o.arg;
                  return i
                    ? i.done
                      ? ((t[e.resultName] = i.value),
                        (t.next = e.nextLoc),
                        "return" !== t.method &&
                          ((t.method = "next"), (t.arg = void 0)),
                        (t.delegate = null),
                        u)
                      : i
                    : ((t.method = "throw"),
                      (t.arg = new TypeError(
                        "iterator result is not an object"
                      )),
                      (t.delegate = null),
                      u);
                }
                function S(e) {
                  var t = { tryLoc: e[0] };
                  1 in e && (t.catchLoc = e[1]),
                    2 in e && ((t.finallyLoc = e[2]), (t.afterLoc = e[3])),
                    this.tryEntries.push(t);
                }
                function E(e) {
                  var t = e.completion || {};
                  (t.type = "normal"), delete t.arg, (e.completion = t);
                }
                function A(e) {
                  (this.tryEntries = [{ tryLoc: "root" }]),
                    e.forEach(S, this),
                    this.reset(!0);
                }
                function T(e) {
                  if (e) {
                    var t = e[r];
                    if (t) return t.call(e);
                    if ("function" == typeof e.next) return e;
                    if (!isNaN(e.length)) {
                      var n = -1,
                        o = function t() {
                          for (; ++n < e.length; )
                            if (i.call(e, n))
                              return (t.value = e[n]), (t.done = !1), t;
                          return (t.value = void 0), (t.done = !0), t;
                        };
                      return (o.next = o);
                    }
                  }
                  return { next: G };
                }
                function G() {
                  return { value: void 0, done: !0 };
                }
              })(
                (function () {
                  return (
                    this ||
                    ("object" ===
                      ("undefined" == typeof self ? "undefined" : t(self)) &&
                      self)
                  );
                })() || Function("return this")()
              );
            }).call(this, n(150)(e));
          },
          function (e, t, n) {
            "use strict";
            e.exports = function (e) {
              return (
                e.webpackPolyfill ||
                  ((e.deprecate = function () {}),
                  (e.paths = []),
                  e.children || (e.children = []),
                  Object.defineProperty(e, "loaded", {
                    enumerable: !0,
                    get: function () {
                      return e.l;
                    },
                  }),
                  Object.defineProperty(e, "id", {
                    enumerable: !0,
                    get: function () {
                      return e.i;
                    },
                  }),
                  (e.webpackPolyfill = 1)),
                e
              );
            };
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.addLinkAttributes = function (e) {
                var t =
                    arguments.length > 1 && void 0 !== arguments[1]
                      ? arguments[1]
                      : {},
                  n = t.url,
                  i = t.target,
                  a = t.rel;
                if (
                  ((e.href = e.title = n ? (0, o.removeNullCharacters)(n) : ""),
                  n)
                ) {
                  var r = Object.values(g),
                    s = r.includes(i) ? i : g.NONE;
                  (e.target = h[s]),
                    (e.rel =
                      "string" == typeof a
                        ? a
                        : "noopener noreferrer nofollow");
                }
              }),
              (t.getFilenameFromUrl = function (e) {
                var t = e.indexOf("#"),
                  n = e.indexOf("?"),
                  o = Math.min(t > 0 ? t : e.length, n > 0 ? n : e.length);
                return e.substring(e.lastIndexOf("/", o) + 1, o);
              }),
              (t.loadScript = function (e) {
                return new Promise(function (t, n) {
                  var o = document.createElement("script");
                  (o.src = e),
                    (o.onload = t),
                    (o.onerror = function () {
                      n(new Error("Cannot load script at: ".concat(o.src)));
                    }),
                    (document.head || document.documentElement).appendChild(o);
                });
              }),
              (t.DummyStatTimer =
                t.StatTimer =
                t.DOMSVGFactory =
                t.DOMCMapReaderFactory =
                t.DOMCanvasFactory =
                t.DEFAULT_LINK_REL =
                t.LinkTarget =
                t.RenderingCancelledException =
                t.PageViewport =
                  void 0);
            var o = n(1);
            function i(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function a(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function r(e, t, n) {
              return t && a(e.prototype, t), n && a(e, n), e;
            }
            t.DEFAULT_LINK_REL = "noopener noreferrer nofollow";
            var s = "http://www.w3.org/2000/svg",
              l = (function () {
                function e() {
                  i(this, e);
                }
                return (
                  r(e, [
                    {
                      key: "create",
                      value: function (e, t) {
                        if (e <= 0 || t <= 0)
                          throw new Error("invalid canvas size");
                        var n = document.createElement("canvas"),
                          o = n.getContext("2d");
                        return (
                          (n.width = e),
                          (n.height = t),
                          { canvas: n, context: o }
                        );
                      },
                    },
                    {
                      key: "reset",
                      value: function (e, t, n) {
                        if (!e.canvas)
                          throw new Error("canvas is not specified");
                        if (t <= 0 || n <= 0)
                          throw new Error("invalid canvas size");
                        (e.canvas.width = t), (e.canvas.height = n);
                      },
                    },
                    {
                      key: "destroy",
                      value: function (e) {
                        if (!e.canvas)
                          throw new Error("canvas is not specified");
                        (e.canvas.width = 0),
                          (e.canvas.height = 0),
                          (e.canvas = null),
                          (e.context = null);
                      },
                    },
                  ]),
                  e
                );
              })();
            t.DOMCanvasFactory = l;
            var c = (function () {
              function e(t) {
                var n = t.baseUrl,
                  o = void 0 === n ? null : n,
                  a = t.isCompressed,
                  r = void 0 !== a && a;
                i(this, e), (this.baseUrl = o), (this.isCompressed = r);
              }
              return (
                r(e, [
                  {
                    key: "fetch",
                    value: function (e) {
                      var t = this,
                        n = e.name;
                      return this.baseUrl
                        ? n
                          ? new Promise(function (e, i) {
                              var a =
                                  t.baseUrl +
                                  n +
                                  (t.isCompressed ? ".bcmap" : ""),
                                r = new XMLHttpRequest();
                              r.open("GET", a, !0),
                                t.isCompressed &&
                                  (r.responseType = "arraybuffer"),
                                (r.onreadystatechange = function () {
                                  if (r.readyState === XMLHttpRequest.DONE) {
                                    var n;
                                    if (
                                      (200 === r.status || 0 === r.status) &&
                                      (t.isCompressed && r.response
                                        ? (n = new Uint8Array(r.response))
                                        : !t.isCompressed &&
                                          r.responseText &&
                                          (n = (0, o.stringToBytes)(
                                            r.responseText
                                          )),
                                      n)
                                    )
                                      return void e({
                                        cMapData: n,
                                        compressionType: t.isCompressed
                                          ? o.CMapCompressionType.BINARY
                                          : o.CMapCompressionType.NONE,
                                      });
                                    i(
                                      new Error(
                                        "Unable to load " +
                                          (t.isCompressed ? "binary " : "") +
                                          "CMap at: " +
                                          a
                                      )
                                    );
                                  }
                                }),
                                r.send(null);
                            })
                          : Promise.reject(
                              new Error("CMap name must be specified.")
                            )
                        : Promise.reject(
                            new Error(
                              'The CMap "baseUrl" parameter must be specified, ensure that the "cMapUrl" and "cMapPacked" API parameters are provided.'
                            )
                          );
                    },
                  },
                ]),
                e
              );
            })();
            t.DOMCMapReaderFactory = c;
            var d = (function () {
              function e() {
                i(this, e);
              }
              return (
                r(e, [
                  {
                    key: "create",
                    value: function (e, t) {
                      (0, o.assert)(e > 0 && t > 0, "Invalid SVG dimensions");
                      var n = document.createElementNS(s, "svg:svg");
                      return (
                        n.setAttribute("version", "1.1"),
                        n.setAttribute("width", e + "px"),
                        n.setAttribute("height", t + "px"),
                        n.setAttribute("preserveAspectRatio", "none"),
                        n.setAttribute("viewBox", "0 0 " + e + " " + t),
                        n
                      );
                    },
                  },
                  {
                    key: "createElement",
                    value: function (e) {
                      return (
                        (0, o.assert)(
                          "string" == typeof e,
                          "Invalid SVG element type"
                        ),
                        document.createElementNS(s, e)
                      );
                    },
                  },
                ]),
                e
              );
            })();
            t.DOMSVGFactory = d;
            var u = (function () {
              function e(t) {
                var n = t.viewBox,
                  o = t.scale,
                  a = t.rotation,
                  r = t.offsetX,
                  s = void 0 === r ? 0 : r,
                  l = t.offsetY,
                  c = void 0 === l ? 0 : l,
                  d = t.dontFlip,
                  u = void 0 !== d && d;
                i(this, e),
                  (this.viewBox = n),
                  (this.scale = o),
                  (this.rotation = a),
                  (this.offsetX = s),
                  (this.offsetY = c);
                var p,
                  g,
                  h,
                  f,
                  m,
                  y,
                  v,
                  _,
                  b = (n[2] + n[0]) / 2,
                  w = (n[3] + n[1]) / 2;
                switch ((a = (a %= 360) < 0 ? a + 360 : a)) {
                  case 180:
                    (p = -1), (g = 0), (h = 0), (f = 1);
                    break;
                  case 90:
                    (p = 0), (g = 1), (h = 1), (f = 0);
                    break;
                  case 270:
                    (p = 0), (g = -1), (h = -1), (f = 0);
                    break;
                  default:
                    (p = 1), (g = 0), (h = 0), (f = -1);
                }
                u && ((h = -h), (f = -f)),
                  0 === p
                    ? ((m = Math.abs(w - n[1]) * o + s),
                      (y = Math.abs(b - n[0]) * o + c),
                      (v = Math.abs(n[3] - n[1]) * o),
                      (_ = Math.abs(n[2] - n[0]) * o))
                    : ((m = Math.abs(b - n[0]) * o + s),
                      (y = Math.abs(w - n[1]) * o + c),
                      (v = Math.abs(n[2] - n[0]) * o),
                      (_ = Math.abs(n[3] - n[1]) * o)),
                  (this.transform = [
                    p * o,
                    g * o,
                    h * o,
                    f * o,
                    m - p * o * b - h * o * w,
                    y - g * o * b - f * o * w,
                  ]),
                  (this.width = v),
                  (this.height = _);
              }
              return (
                r(e, [
                  {
                    key: "clone",
                    value: function () {
                      var t =
                          arguments.length > 0 && void 0 !== arguments[0]
                            ? arguments[0]
                            : {},
                        n = t.scale,
                        o = void 0 === n ? this.scale : n,
                        i = t.rotation,
                        a = void 0 === i ? this.rotation : i,
                        r = t.dontFlip,
                        s = void 0 !== r && r;
                      return new e({
                        viewBox: this.viewBox.slice(),
                        scale: o,
                        rotation: a,
                        offsetX: this.offsetX,
                        offsetY: this.offsetY,
                        dontFlip: s,
                      });
                    },
                  },
                  {
                    key: "convertToViewportPoint",
                    value: function (e, t) {
                      return o.Util.applyTransform([e, t], this.transform);
                    },
                  },
                  {
                    key: "convertToViewportRectangle",
                    value: function (e) {
                      var t = o.Util.applyTransform(
                          [e[0], e[1]],
                          this.transform
                        ),
                        n = o.Util.applyTransform([e[2], e[3]], this.transform);
                      return [t[0], t[1], n[0], n[1]];
                    },
                  },
                  {
                    key: "convertToPdfPoint",
                    value: function (e, t) {
                      return o.Util.applyInverseTransform(
                        [e, t],
                        this.transform
                      );
                    },
                  },
                ]),
                e
              );
            })();
            t.PageViewport = u;
            var p = (function () {
              function e(e, t) {
                (this.message = e), (this.type = t);
              }
              return (
                (e.prototype = new Error()),
                (e.prototype.name = "RenderingCancelledException"),
                (e.constructor = e),
                e
              );
            })();
            t.RenderingCancelledException = p;
            var g = { NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4 };
            t.LinkTarget = g;
            var h = ["", "_self", "_blank", "_parent", "_top"],
              f = (function () {
                function e() {
                  var t =
                    !(arguments.length > 0 && void 0 !== arguments[0]) ||
                    arguments[0];
                  i(this, e),
                    (this.enabled = !!t),
                    (this.started = Object.create(null)),
                    (this.times = []);
                }
                return (
                  r(e, [
                    {
                      key: "time",
                      value: function (e) {
                        this.enabled &&
                          (e in this.started &&
                            (0, o.warn)("Timer is already running for " + e),
                          (this.started[e] = Date.now()));
                      },
                    },
                    {
                      key: "timeEnd",
                      value: function (e) {
                        this.enabled &&
                          (e in this.started ||
                            (0, o.warn)("Timer has not been started for " + e),
                          this.times.push({
                            name: e,
                            start: this.started[e],
                            end: Date.now(),
                          }),
                          delete this.started[e]);
                      },
                    },
                    {
                      key: "toString",
                      value: function () {
                        for (
                          var e = this.times,
                            t = "",
                            n = 0,
                            o = 0,
                            i = e.length;
                          o < i;
                          ++o
                        ) {
                          var a = e[o].name;
                          a.length > n && (n = a.length);
                        }
                        for (var r = 0, s = e.length; r < s; ++r) {
                          var l = e[r],
                            c = l.end - l.start;
                          t += ""
                            .concat(l.name.padEnd(n), " ")
                            .concat(c, "ms\n");
                        }
                        return t;
                      },
                    },
                  ]),
                  e
                );
              })();
            t.StatTimer = f;
            var m = (function () {
              function e() {
                i(this, e),
                  (0, o.unreachable)("Cannot initialize DummyStatTimer.");
              }
              return (
                r(e, null, [
                  { key: "time", value: function (e) {} },
                  { key: "timeEnd", value: function (e) {} },
                  {
                    key: "toString",
                    value: function () {
                      return "";
                    },
                  },
                ]),
                e
              );
            })();
            t.DummyStatTimer = m;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.FontLoader = t.FontFaceObject = void 0);
            var o,
              i = (o = n(147)) && o.__esModule ? o : { default: o },
              a = n(1);
            function r(e) {
              return (r =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            function s(e, t) {
              return !t || ("object" !== r(t) && "function" != typeof t)
                ? (function (e) {
                    if (void 0 === e)
                      throw new ReferenceError(
                        "this hasn't been initialised - super() hasn't been called"
                      );
                    return e;
                  })(e)
                : t;
            }
            function l(e) {
              return (l = Object.setPrototypeOf
                ? Object.getPrototypeOf
                : function (e) {
                    return e.__proto__ || Object.getPrototypeOf(e);
                  })(e);
            }
            function c(e, t) {
              return (c =
                Object.setPrototypeOf ||
                function (e, t) {
                  return (e.__proto__ = t), e;
                })(e, t);
            }
            function d(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function u(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function p(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function g(e, t, n) {
              return t && p(e.prototype, t), n && p(e, n), e;
            }
            var h,
              f = (function () {
                function e(t) {
                  var n = t.docId,
                    o = t.onUnsupportedFeature;
                  u(this, e),
                    this.constructor === e &&
                      (0, a.unreachable)("Cannot initialize BaseFontLoader."),
                    (this.docId = n),
                    (this._onUnsupportedFeature = o),
                    (this.nativeFontFaces = []),
                    (this.styleElement = null);
                }
                var t, n;
                return (
                  g(e, [
                    {
                      key: "addNativeFontFace",
                      value: function (e) {
                        this.nativeFontFaces.push(e), document.fonts.add(e);
                      },
                    },
                    {
                      key: "insertRule",
                      value: function (e) {
                        var t = this.styleElement;
                        t ||
                          (((t = this.styleElement =
                            document.createElement("style")).id =
                            "PDFJS_FONT_STYLE_TAG_".concat(this.docId)),
                          document.documentElement
                            .getElementsByTagName("head")[0]
                            .appendChild(t));
                        var n = t.sheet;
                        n.insertRule(e, n.cssRules.length);
                      },
                    },
                    {
                      key: "clear",
                      value: function () {
                        this.nativeFontFaces.forEach(function (e) {
                          document.fonts.delete(e);
                        }),
                          (this.nativeFontFaces.length = 0),
                          this.styleElement &&
                            (this.styleElement.remove(),
                            (this.styleElement = null));
                      },
                    },
                    {
                      key: "bind",
                      value:
                        ((t = i.default.mark(function e(t) {
                          var n,
                            o,
                            r = this;
                          return i.default.wrap(
                            function (e) {
                              for (;;)
                                switch ((e.prev = e.next)) {
                                  case 0:
                                    if (!t.attached && !t.missingFile) {
                                      e.next = 2;
                                      break;
                                    }
                                    return e.abrupt("return");
                                  case 2:
                                    if (
                                      ((t.attached = !0),
                                      !this.isFontLoadingAPISupported)
                                    ) {
                                      e.next = 19;
                                      break;
                                    }
                                    if (!(n = t.createNativeFontFace())) {
                                      e.next = 18;
                                      break;
                                    }
                                    return (
                                      this.addNativeFontFace(n),
                                      (e.prev = 7),
                                      (e.next = 10),
                                      n.loaded
                                    );
                                  case 10:
                                    e.next = 18;
                                    break;
                                  case 12:
                                    throw (
                                      ((e.prev = 12),
                                      (e.t0 = e.catch(7)),
                                      this._onUnsupportedFeature({
                                        featureId: a.UNSUPPORTED_FEATURES.font,
                                      }),
                                      (0, a.warn)(
                                        "Failed to load font '"
                                          .concat(n.family, "': '")
                                          .concat(e.t0, "'.")
                                      ),
                                      (t.disableFontFace = !0),
                                      e.t0)
                                    );
                                  case 18:
                                    return e.abrupt("return");
                                  case 19:
                                    if (!(o = t.createFontFaceRule())) {
                                      e.next = 25;
                                      break;
                                    }
                                    if (
                                      (this.insertRule(o),
                                      !this.isSyncFontLoadingSupported)
                                    ) {
                                      e.next = 24;
                                      break;
                                    }
                                    return e.abrupt("return");
                                  case 24:
                                    return e.abrupt(
                                      "return",
                                      new Promise(function (e) {
                                        var n = r._queueLoadingCallback(e);
                                        r._prepareFontLoadEvent([o], [t], n);
                                      })
                                    );
                                  case 25:
                                  case "end":
                                    return e.stop();
                                }
                            },
                            e,
                            this,
                            [[7, 12]]
                          );
                        })),
                        (n = function () {
                          var e = this,
                            n = arguments;
                          return new Promise(function (o, i) {
                            var a = t.apply(e, n);
                            function r(e) {
                              d(a, o, i, r, s, "next", e);
                            }
                            function s(e) {
                              d(a, o, i, r, s, "throw", e);
                            }
                            r(void 0);
                          });
                        }),
                        function (e) {
                          return n.apply(this, arguments);
                        }),
                    },
                    {
                      key: "_queueLoadingCallback",
                      value: function (e) {
                        (0, a.unreachable)(
                          "Abstract method `_queueLoadingCallback`."
                        );
                      },
                    },
                    {
                      key: "_prepareFontLoadEvent",
                      value: function (e, t, n) {
                        (0, a.unreachable)(
                          "Abstract method `_prepareFontLoadEvent`."
                        );
                      },
                    },
                    {
                      key: "isFontLoadingAPISupported",
                      get: function () {
                        (0, a.unreachable)(
                          "Abstract method `isFontLoadingAPISupported`."
                        );
                      },
                    },
                    {
                      key: "isSyncFontLoadingSupported",
                      get: function () {
                        (0, a.unreachable)(
                          "Abstract method `isSyncFontLoadingSupported`."
                        );
                      },
                    },
                    {
                      key: "_loadTestFont",
                      get: function () {
                        (0, a.unreachable)("Abstract method `_loadTestFont`.");
                      },
                    },
                  ]),
                  e
                );
              })();
            (t.FontLoader = h),
              (t.FontLoader = h =
                (function (e) {
                  function t(e) {
                    var n;
                    return (
                      u(this, t),
                      ((n = s(this, l(t).call(this, e))).loadingContext = {
                        requests: [],
                        nextRequestId: 0,
                      }),
                      (n.loadTestFontId = 0),
                      n
                    );
                  }
                  return (
                    (function (e, t) {
                      if ("function" != typeof t && null !== t)
                        throw new TypeError(
                          "Super expression must either be null or a function"
                        );
                      (e.prototype = Object.create(t && t.prototype, {
                        constructor: {
                          value: e,
                          writable: !0,
                          configurable: !0,
                        },
                      })),
                        t && c(e, t);
                    })(t, e),
                    g(t, [
                      {
                        key: "_queueLoadingCallback",
                        value: function (e) {
                          var t = this.loadingContext,
                            n = {
                              id: "pdfjs-font-loading-".concat(
                                t.nextRequestId++
                              ),
                              done: !1,
                              complete: function () {
                                for (
                                  (0, a.assert)(
                                    !n.done,
                                    "completeRequest() cannot be called twice."
                                  ),
                                    n.done = !0;
                                  t.requests.length > 0 && t.requests[0].done;

                                ) {
                                  var e = t.requests.shift();
                                  setTimeout(e.callback, 0);
                                }
                              },
                              callback: e,
                            };
                          return t.requests.push(n), n;
                        },
                      },
                      {
                        key: "_prepareFontLoadEvent",
                        value: function (e, t, n) {
                          function o(e, t) {
                            return (
                              (e.charCodeAt(t) << 24) |
                              (e.charCodeAt(t + 1) << 16) |
                              (e.charCodeAt(t + 2) << 8) |
                              (255 & e.charCodeAt(t + 3))
                            );
                          }
                          function i(e, t, n, o) {
                            return e.substring(0, t) + o + e.substring(t + n);
                          }
                          var r,
                            s,
                            l = document.createElement("canvas");
                          (l.width = 1), (l.height = 1);
                          var c = l.getContext("2d"),
                            d = 0,
                            u = "lt"
                              .concat(Date.now())
                              .concat(this.loadTestFontId++),
                            p = this._loadTestFont,
                            g = o((p = i(p, 976, u.length, u)), 16);
                          for (r = 0, s = u.length - 3; r < s; r += 4)
                            g = (g - 1482184792 + o(u, r)) | 0;
                          r < u.length &&
                            (g = (g - 1482184792 + o(u + "XXX", r)) | 0),
                            (p = i(p, 16, 4, (0, a.string32)(g)));
                          var h = "url(data:font/opentype;base64,".concat(
                              btoa(p),
                              ");"
                            ),
                            f = '@font-face {font-family:"'
                              .concat(u, '";src:')
                              .concat(h, "}");
                          this.insertRule(f);
                          var m = [];
                          for (r = 0, s = t.length; r < s; r++)
                            m.push(t[r].loadedName);
                          m.push(u);
                          var y = document.createElement("div");
                          for (
                            y.setAttribute(
                              "style",
                              "visibility: hidden;width: 10px; height: 10px;position: absolute; top: 0px; left: 0px;"
                            ),
                              r = 0,
                              s = m.length;
                            r < s;
                            ++r
                          ) {
                            var v = document.createElement("span");
                            (v.textContent = "Hi"),
                              (v.style.fontFamily = m[r]),
                              y.appendChild(v);
                          }
                          document.body.appendChild(y),
                            (function e(t, n) {
                              if (++d > 30)
                                return (
                                  (0, a.warn)("Load test font never loaded."),
                                  void n()
                                );
                              (c.font = "30px " + t),
                                c.fillText(".", 0, 20),
                                c.getImageData(0, 0, 1, 1).data[3] > 0
                                  ? n()
                                  : setTimeout(e.bind(null, t, n));
                            })(u, function () {
                              document.body.removeChild(y), n.complete();
                            });
                        },
                      },
                      {
                        key: "isFontLoadingAPISupported",
                        get: function () {
                          var e =
                            "undefined" != typeof document && !!document.fonts;
                          if (e && "undefined" != typeof navigator) {
                            var t = /Mozilla\/5.0.*?rv:(\d+).*? Gecko/.exec(
                              navigator.userAgent
                            );
                            t && t[1] < 63 && (e = !1);
                          }
                          return (0, a.shadow)(
                            this,
                            "isFontLoadingAPISupported",
                            e
                          );
                        },
                      },
                      {
                        key: "isSyncFontLoadingSupported",
                        get: function () {
                          var e = !1;
                          if ("undefined" == typeof navigator) e = !0;
                          else {
                            var t = /Mozilla\/5.0.*?rv:(\d+).*? Gecko/.exec(
                              navigator.userAgent
                            );
                            t && t[1] >= 14 && (e = !0);
                          }
                          return (0, a.shadow)(
                            this,
                            "isSyncFontLoadingSupported",
                            e
                          );
                        },
                      },
                      {
                        key: "_loadTestFont",
                        get: function () {
                          return (0, a.shadow)(
                            this,
                            "_loadTestFont",
                            atob(
                              "T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQAABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwAAAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbmFtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAAAADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6AABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAAMQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAAAAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAAAAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQAAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMAAQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAAEAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgcA/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQAAAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAgABAAAAAAAAAAAD6AAAAAAAAA=="
                            )
                          );
                        },
                      },
                    ]),
                    t
                  );
                })(f));
            var m = {
                get value() {
                  return (0, a.shadow)(this, "value", (0, a.isEvalSupported)());
                },
              },
              y = (function () {
                function e(t, n) {
                  var o = n.isEvalSupported,
                    i = void 0 === o || o,
                    a = n.disableFontFace,
                    r = void 0 !== a && a,
                    s = n.ignoreErrors,
                    l = void 0 !== s && s,
                    c = n.onUnsupportedFeature,
                    d = void 0 === c ? null : c,
                    p = n.fontRegistry,
                    g = void 0 === p ? null : p;
                  for (var h in (u(this, e),
                  (this.compiledGlyphs = Object.create(null)),
                  t))
                    this[h] = t[h];
                  (this.isEvalSupported = !1 !== i),
                    (this.disableFontFace = !0 === r),
                    (this.ignoreErrors = !0 === l),
                    (this._onUnsupportedFeature = d),
                    (this.fontRegistry = g);
                }
                return (
                  g(e, [
                    {
                      key: "createNativeFontFace",
                      value: function () {
                        if (!this.data || this.disableFontFace) return null;
                        var e = new FontFace(this.loadedName, this.data, {});
                        return (
                          this.fontRegistry &&
                            this.fontRegistry.registerFont(this),
                          e
                        );
                      },
                    },
                    {
                      key: "createFontFaceRule",
                      value: function () {
                        if (!this.data || this.disableFontFace) return null;
                        var e = (0, a.bytesToString)(new Uint8Array(this.data)),
                          t = "url(data:"
                            .concat(this.mimetype, ";base64,")
                            .concat(btoa(e), ");"),
                          n = '@font-face {font-family:"'
                            .concat(this.loadedName, '";src:')
                            .concat(t, "}");
                        return (
                          this.fontRegistry &&
                            this.fontRegistry.registerFont(this, t),
                          n
                        );
                      },
                    },
                    {
                      key: "getPathGenerator",
                      value: function (e, t) {
                        if (void 0 !== this.compiledGlyphs[t])
                          return this.compiledGlyphs[t];
                        var n, o;
                        try {
                          n = e.get(this.loadedName + "_path_" + t);
                        } catch (e) {
                          if (!this.ignoreErrors) throw e;
                          return (
                            this._onUnsupportedFeature &&
                              this._onUnsupportedFeature({
                                featureId: a.UNSUPPORTED_FEATURES.font,
                              }),
                            (0, a.warn)(
                              'getPathGenerator - ignoring character: "'.concat(
                                e,
                                '".'
                              )
                            ),
                            (this.compiledGlyphs[t] = function (e, t) {})
                          );
                        }
                        if (this.isEvalSupported && m.value) {
                          for (var i, r = "", s = 0, l = n.length; s < l; s++)
                            (i =
                              void 0 !== (o = n[s]).args
                                ? o.args.join(",")
                                : ""),
                              (r += "c." + o.cmd + "(" + i + ");\n");
                          return (this.compiledGlyphs[t] = new Function(
                            "c",
                            "size",
                            r
                          ));
                        }
                        return (this.compiledGlyphs[t] = function (e, t) {
                          for (var i = 0, a = n.length; i < a; i++) {
                            "scale" === (o = n[i]).cmd && (o.args = [t, -t]);
                            try {
                              e[o.cmd].apply(e, o.args);
                            } catch (t) {
                              throw "function" != typeof e[o.cmd]
                                ? new Error(
                                    "Unsupported drawing command: " + o.cmd
                                  )
                                : t;
                            }
                          }
                        });
                      },
                    },
                  ]),
                  e
                );
              })();
            t.FontFaceObject = y;
          },
          function (e, t, n) {
            "use strict";
            var o = Object.create(null),
              i = n(4),
              a =
                ("undefined" != typeof navigator && navigator.userAgent) || "",
              r = /Trident/.test(a),
              s = /CriOS/.test(a);
            (r || s) && (o.disableCreateObjectURL = !0),
              i() &&
                ((o.disableFontFace = !0),
                (o.nativeImageDecoderSupport = "none")),
              (t.apiCompatibilityParams = Object.freeze(o));
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.CanvasGraphics = void 0);
            var o = n(1),
              i = n(155),
              a = {
                get value() {
                  return (0, o.shadow)(a, "value", (0, o.isLittleEndian)());
                },
              };
            function r(e) {
              e.mozCurrentTransform ||
                ((e._originalSave = e.save),
                (e._originalRestore = e.restore),
                (e._originalRotate = e.rotate),
                (e._originalScale = e.scale),
                (e._originalTranslate = e.translate),
                (e._originalTransform = e.transform),
                (e._originalSetTransform = e.setTransform),
                (e._transformMatrix = e._transformMatrix || [1, 0, 0, 1, 0, 0]),
                (e._transformStack = []),
                Object.defineProperty(e, "mozCurrentTransform", {
                  get: function () {
                    return this._transformMatrix;
                  },
                }),
                Object.defineProperty(e, "mozCurrentTransformInverse", {
                  get: function () {
                    var e = this._transformMatrix,
                      t = e[0],
                      n = e[1],
                      o = e[2],
                      i = e[3],
                      a = e[4],
                      r = e[5],
                      s = t * i - n * o,
                      l = n * o - t * i;
                    return [
                      i / s,
                      n / l,
                      o / l,
                      t / s,
                      (i * a - o * r) / l,
                      (n * a - t * r) / s,
                    ];
                  },
                }),
                (e.save = function () {
                  var e = this._transformMatrix;
                  this._transformStack.push(e),
                    (this._transformMatrix = e.slice(0, 6)),
                    this._originalSave();
                }),
                (e.restore = function () {
                  var e = this._transformStack.pop();
                  e && ((this._transformMatrix = e), this._originalRestore());
                }),
                (e.translate = function (e, t) {
                  var n = this._transformMatrix;
                  (n[4] = n[0] * e + n[2] * t + n[4]),
                    (n[5] = n[1] * e + n[3] * t + n[5]),
                    this._originalTranslate(e, t);
                }),
                (e.scale = function (e, t) {
                  var n = this._transformMatrix;
                  (n[0] = n[0] * e),
                    (n[1] = n[1] * e),
                    (n[2] = n[2] * t),
                    (n[3] = n[3] * t),
                    this._originalScale(e, t);
                }),
                (e.transform = function (t, n, o, i, a, r) {
                  var s = this._transformMatrix;
                  (this._transformMatrix = [
                    s[0] * t + s[2] * n,
                    s[1] * t + s[3] * n,
                    s[0] * o + s[2] * i,
                    s[1] * o + s[3] * i,
                    s[0] * a + s[2] * r + s[4],
                    s[1] * a + s[3] * r + s[5],
                  ]),
                    e._originalTransform(t, n, o, i, a, r);
                }),
                (e.setTransform = function (t, n, o, i, a, r) {
                  (this._transformMatrix = [t, n, o, i, a, r]),
                    e._originalSetTransform(t, n, o, i, a, r);
                }),
                (e.rotate = function (e) {
                  var t = Math.cos(e),
                    n = Math.sin(e),
                    o = this._transformMatrix;
                  (this._transformMatrix = [
                    o[0] * t + o[2] * n,
                    o[1] * t + o[3] * n,
                    o[0] * -n + o[2] * t,
                    o[1] * -n + o[3] * t,
                    o[4],
                    o[5],
                  ]),
                    this._originalRotate(e);
                }));
            }
            var s = (function () {
                function e(e) {
                  (this.canvasFactory = e), (this.cache = Object.create(null));
                }
                return (
                  (e.prototype = {
                    getCanvas: function (e, t, n, o) {
                      var i;
                      return (
                        void 0 !== this.cache[e]
                          ? ((i = this.cache[e]),
                            this.canvasFactory.reset(i, t, n),
                            i.context.setTransform(1, 0, 0, 1, 0, 0))
                          : ((i = this.canvasFactory.create(t, n)),
                            (this.cache[e] = i)),
                        o && r(i.context),
                        i
                      );
                    },
                    clear: function () {
                      for (var e in this.cache) {
                        var t = this.cache[e];
                        this.canvasFactory.destroy(t), delete this.cache[e];
                      }
                    },
                  }),
                  e
                );
              })(),
              l = (function () {
                function e() {
                  (this.alphaIsShape = !1),
                    (this.fontSize = 0),
                    (this.fontSizeScale = 1),
                    (this.textMatrix = o.IDENTITY_MATRIX),
                    (this.textMatrixScale = 1),
                    (this.fontMatrix = o.FONT_IDENTITY_MATRIX),
                    (this.leading = 0),
                    (this.x = 0),
                    (this.y = 0),
                    (this.lineX = 0),
                    (this.lineY = 0),
                    (this.charSpacing = 0),
                    (this.wordSpacing = 0),
                    (this.textHScale = 1),
                    (this.textRenderingMode = o.TextRenderingMode.FILL),
                    (this.textRise = 0),
                    (this.fillColor = "#000000"),
                    (this.strokeColor = "#000000"),
                    (this.patternFill = !1),
                    (this.fillAlpha = 1),
                    (this.strokeAlpha = 1),
                    (this.lineWidth = 1),
                    (this.activeSMask = null),
                    (this.resumeSMaskCtx = null);
                }
                return (
                  (e.prototype = {
                    clone: function () {
                      return Object.create(this);
                    },
                    setCurrentPoint: function (e, t) {
                      (this.x = e), (this.y = t);
                    },
                  }),
                  e
                );
              })(),
              c = (function () {
                function e(e, t, n, o, i, a) {
                  (this.ctx = e),
                    (this.current = new l()),
                    (this.stateStack = []),
                    (this.pendingClip = null),
                    (this.pendingEOFill = !1),
                    (this.res = null),
                    (this.xobjs = null),
                    (this.commonObjs = t),
                    (this.objs = n),
                    (this.canvasFactory = o),
                    (this.webGLContext = i),
                    (this.imageLayer = a),
                    (this.groupStack = []),
                    (this.processingType3 = null),
                    (this.baseTransform = null),
                    (this.baseTransformStack = []),
                    (this.groupLevel = 0),
                    (this.smaskStack = []),
                    (this.smaskCounter = 0),
                    (this.tempSMask = null),
                    (this.cachedCanvases = new s(this.canvasFactory)),
                    e && r(e),
                    (this._cachedGetSinglePixelWidth = null);
                }
                function t(e, t) {
                  if ("undefined" != typeof ImageData && t instanceof ImageData)
                    e.putImageData(t, 0, 0);
                  else {
                    var n,
                      i,
                      r,
                      s,
                      l,
                      c = t.height,
                      d = t.width,
                      u = c % 16,
                      p = (c - u) / 16,
                      g = 0 === u ? p : p + 1,
                      h = e.createImageData(d, 16),
                      f = 0,
                      m = t.data,
                      y = h.data;
                    if (t.kind === o.ImageKind.GRAYSCALE_1BPP) {
                      var v = m.byteLength,
                        _ = new Uint32Array(y.buffer, 0, y.byteLength >> 2),
                        b = _.length,
                        w = (d + 7) >> 3,
                        C = 4294967295,
                        x = a.value ? 4278190080 : 255;
                      for (i = 0; i < g; i++) {
                        for (s = i < p ? 16 : u, n = 0, r = 0; r < s; r++) {
                          for (
                            var S = v - f,
                              E = 0,
                              A = S > w ? d : 8 * S - 7,
                              T = -8 & A,
                              G = 0,
                              P = 0;
                            E < T;
                            E += 8
                          )
                            (P = m[f++]),
                              (_[n++] = 128 & P ? C : x),
                              (_[n++] = 64 & P ? C : x),
                              (_[n++] = 32 & P ? C : x),
                              (_[n++] = 16 & P ? C : x),
                              (_[n++] = 8 & P ? C : x),
                              (_[n++] = 4 & P ? C : x),
                              (_[n++] = 2 & P ? C : x),
                              (_[n++] = 1 & P ? C : x);
                          for (; E < A; E++)
                            0 === G && ((P = m[f++]), (G = 128)),
                              (_[n++] = P & G ? C : x),
                              (G >>= 1);
                        }
                        for (; n < b; ) _[n++] = 0;
                        e.putImageData(h, 0, 16 * i);
                      }
                    } else if (t.kind === o.ImageKind.RGBA_32BPP) {
                      for (r = 0, l = 16 * d * 4, i = 0; i < p; i++)
                        y.set(m.subarray(f, f + l)),
                          (f += l),
                          e.putImageData(h, 0, r),
                          (r += 16);
                      i < g &&
                        ((l = d * u * 4),
                        y.set(m.subarray(f, f + l)),
                        e.putImageData(h, 0, r));
                    } else {
                      if (t.kind !== o.ImageKind.RGB_24BPP)
                        throw new Error("bad image kind: ".concat(t.kind));
                      for (l = d * (s = 16), i = 0; i < g; i++) {
                        for (i >= p && (l = d * (s = u)), n = 0, r = l; r--; )
                          (y[n++] = m[f++]),
                            (y[n++] = m[f++]),
                            (y[n++] = m[f++]),
                            (y[n++] = 255);
                        e.putImageData(h, 0, 16 * i);
                      }
                    }
                  }
                }
                function n(e, t) {
                  for (
                    var n = t.height,
                      o = t.width,
                      i = n % 16,
                      a = (n - i) / 16,
                      r = 0 === i ? a : a + 1,
                      s = e.createImageData(o, 16),
                      l = 0,
                      c = t.data,
                      d = s.data,
                      u = 0;
                    u < r;
                    u++
                  ) {
                    for (var p = u < a ? 16 : i, g = 3, h = 0; h < p; h++)
                      for (var f = 0, m = 0; m < o; m++) {
                        if (!f) {
                          var y = c[l++];
                          f = 128;
                        }
                        (d[g] = y & f ? 0 : 255), (g += 4), (f >>= 1);
                      }
                    e.putImageData(s, 0, 16 * u);
                  }
                }
                function c(e, t) {
                  for (
                    var n = [
                        "strokeStyle",
                        "fillStyle",
                        "fillRule",
                        "globalAlpha",
                        "lineWidth",
                        "lineCap",
                        "lineJoin",
                        "miterLimit",
                        "globalCompositeOperation",
                        "font",
                        "_path",
                      ],
                      o = 0,
                      i = n.length;
                    o < i;
                    o++
                  ) {
                    var a = n[o];
                    void 0 !== e[a] && (t[a] = e[a]);
                  }
                  void 0 !== e.setLineDash &&
                    (t.setLineDash(e.getLineDash()),
                    (t.lineDashOffset = e.lineDashOffset));
                }
                function d(e) {
                  (e.strokeStyle = "#000000"),
                    (e.fillStyle = "#000000"),
                    (e.fillRule = "nonzero"),
                    (e.globalAlpha = 1),
                    (e.lineWidth = 1),
                    (e.lineCap = "butt"),
                    (e.lineJoin = "miter"),
                    (e.miterLimit = 10),
                    (e.globalCompositeOperation = "source-over"),
                    (e.font = "10px sans-serif"),
                    void 0 !== e.setLineDash &&
                      (e.setLineDash([]), (e.lineDashOffset = 0));
                }
                function u(e, t, n, o) {
                  for (var i = e.length, a = 3; a < i; a += 4) {
                    var r = e[a];
                    if (0 === r) (e[a - 3] = t), (e[a - 2] = n), (e[a - 1] = o);
                    else if (r < 255) {
                      var s = 255 - r;
                      (e[a - 3] = (e[a - 3] * r + t * s) >> 8),
                        (e[a - 2] = (e[a - 2] * r + n * s) >> 8),
                        (e[a - 1] = (e[a - 1] * r + o * s) >> 8);
                    }
                  }
                }
                function p(e, t, n) {
                  for (var o = e.length, i = 3; i < o; i += 4) {
                    var a = n ? n[e[i]] : e[i];
                    t[i] = (t[i] * a * (1 / 255)) | 0;
                  }
                }
                function g(e, t, n) {
                  for (var o = e.length, i = 3; i < o; i += 4) {
                    var a = 77 * e[i - 3] + 152 * e[i - 2] + 28 * e[i - 1];
                    t[i] = n ? (t[i] * n[a >> 8]) >> 8 : (t[i] * a) >> 16;
                  }
                }
                function h(e, t, n, o) {
                  var i = t.canvas,
                    a = t.context;
                  e.setTransform(
                    t.scaleX,
                    0,
                    0,
                    t.scaleY,
                    t.offsetX,
                    t.offsetY
                  );
                  var r = t.backdrop || null;
                  if (!t.transferMap && o.isEnabled) {
                    var s = o.composeSMask({
                      layer: n.canvas,
                      mask: i,
                      properties: { subtype: t.subtype, backdrop: r },
                    });
                    return (
                      e.setTransform(1, 0, 0, 1, 0, 0),
                      void e.drawImage(s, t.offsetX, t.offsetY)
                    );
                  }
                  !(function (e, t, n, o, i, a, r) {
                    var s,
                      l = !!a,
                      c = l ? a[0] : 0,
                      d = l ? a[1] : 0,
                      h = l ? a[2] : 0;
                    s = "Luminosity" === i ? g : p;
                    for (
                      var f = Math.min(o, Math.ceil(1048576 / n)), m = 0;
                      m < o;
                      m += f
                    ) {
                      var y = Math.min(f, o - m),
                        v = e.getImageData(0, m, n, y),
                        _ = t.getImageData(0, m, n, y);
                      l && u(v.data, c, d, h),
                        s(v.data, _.data, r),
                        e.putImageData(_, 0, m);
                    }
                  })(a, n, i.width, i.height, t.subtype, r, t.transferMap),
                    e.drawImage(i, 0, 0);
                }
                var f = ["butt", "round", "square"],
                  m = ["miter", "round", "bevel"],
                  y = {},
                  v = {};
                for (var _ in ((e.prototype = {
                  beginDrawing: function (e) {
                    var t = e.transform,
                      n = e.viewport,
                      o = e.transparency,
                      i = void 0 !== o && o,
                      a = e.background,
                      r = void 0 === a ? null : a,
                      s = this.ctx.canvas.width,
                      l = this.ctx.canvas.height;
                    if (
                      (this.ctx.save(),
                      (this.ctx.fillStyle = r || "rgb(255, 255, 255)"),
                      this.ctx.fillRect(0, 0, s, l),
                      this.ctx.restore(),
                      i)
                    ) {
                      var c = this.cachedCanvases.getCanvas(
                        "transparent",
                        s,
                        l,
                        !0
                      );
                      (this.compositeCtx = this.ctx),
                        (this.transparentCanvas = c.canvas),
                        (this.ctx = c.context),
                        this.ctx.save(),
                        this.ctx.transform.apply(
                          this.ctx,
                          this.compositeCtx.mozCurrentTransform
                        );
                    }
                    this.ctx.save(),
                      d(this.ctx),
                      t && this.ctx.transform.apply(this.ctx, t),
                      this.ctx.transform.apply(this.ctx, n.transform),
                      (this.baseTransform =
                        this.ctx.mozCurrentTransform.slice()),
                      this.imageLayer && this.imageLayer.beginLayout();
                  },
                  executeOperatorList: function (e, t, n, i, a) {
                    var r = e.argsArray,
                      s = e.fnArray,
                      l = t || 0,
                      c = r.length;
                    if (c === l) return l;
                    for (
                      var d,
                        u = c - l > 10 && "function" == typeof n,
                        p = u ? Date.now() + 15 : 0,
                        g = 0,
                        h = this.commonObjs,
                        f = this.objs;
                      ;

                    ) {
                      if (void 0 !== i && l === i.nextBreakPoint)
                        return i.breakIt(l, n), l;
                      if ((d = s[l]) !== o.OPS.dependency)
                        this[d].apply(this, r[l]);
                      else
                        for (var m = r[l], y = 0, v = m.length; y < v; y++) {
                          var _ = m[y],
                            b = "g" === _[0] && "_" === _[1] ? h : f;
                          if (!b.has(_)) return b.get(_, n), l;
                        }
                      if ((l++, a && a(l, c), l === c)) return l;
                      if (u && ++g > 10) {
                        if (Date.now() > p) return n(), l;
                        g = 0;
                      }
                    }
                  },
                  endDrawing: function () {
                    null !== this.current.activeSMask && this.endSMaskGroup(),
                      this.ctx.restore(),
                      this.transparentCanvas &&
                        ((this.ctx = this.compositeCtx),
                        this.ctx.save(),
                        this.ctx.setTransform(1, 0, 0, 1, 0, 0),
                        this.ctx.drawImage(this.transparentCanvas, 0, 0),
                        this.ctx.restore(),
                        (this.transparentCanvas = null)),
                      this.cachedCanvases.clear(),
                      this.webGLContext.clear(),
                      this.imageLayer && this.imageLayer.endLayout();
                  },
                  setLineWidth: function (e) {
                    (this.current.lineWidth = e), (this.ctx.lineWidth = e);
                  },
                  setLineCap: function (e) {
                    this.ctx.lineCap = f[e];
                  },
                  setLineJoin: function (e) {
                    this.ctx.lineJoin = m[e];
                  },
                  setMiterLimit: function (e) {
                    this.ctx.miterLimit = e;
                  },
                  setDash: function (e, t) {
                    var n = this.ctx;
                    void 0 !== n.setLineDash &&
                      (n.setLineDash(e), (n.lineDashOffset = t));
                  },
                  setRenderingIntent: function (e) {},
                  setFlatness: function (e) {},
                  setGState: function (e) {
                    for (var t = 0, n = e.length; t < n; t++) {
                      var o = e[t],
                        i = o[0],
                        a = o[1];
                      switch (i) {
                        case "LW":
                          this.setLineWidth(a);
                          break;
                        case "LC":
                          this.setLineCap(a);
                          break;
                        case "LJ":
                          this.setLineJoin(a);
                          break;
                        case "ML":
                          this.setMiterLimit(a);
                          break;
                        case "D":
                          this.setDash(a[0], a[1]);
                          break;
                        case "RI":
                          this.setRenderingIntent(a);
                          break;
                        case "FL":
                          this.setFlatness(a);
                          break;
                        case "Font":
                          this.setFont(a[0], a[1]);
                          break;
                        case "CA":
                          this.current.strokeAlpha = o[1];
                          break;
                        case "ca":
                          (this.current.fillAlpha = o[1]),
                            (this.ctx.globalAlpha = o[1]);
                          break;
                        case "BM":
                          this.ctx.globalCompositeOperation = a;
                          break;
                        case "SMask":
                          this.current.activeSMask &&
                            (this.stateStack.length > 0 &&
                            this.stateStack[this.stateStack.length - 1]
                              .activeSMask === this.current.activeSMask
                              ? this.suspendSMaskGroup()
                              : this.endSMaskGroup()),
                            (this.current.activeSMask = a
                              ? this.tempSMask
                              : null),
                            this.current.activeSMask && this.beginSMaskGroup(),
                            (this.tempSMask = null);
                      }
                    }
                  },
                  beginSMaskGroup: function () {
                    var e = this.current.activeSMask,
                      t = e.canvas.width,
                      n = e.canvas.height,
                      o = "smaskGroupAt" + this.groupLevel,
                      i = this.cachedCanvases.getCanvas(o, t, n, !0),
                      a = this.ctx,
                      r = a.mozCurrentTransform;
                    this.ctx.save();
                    var s = i.context;
                    s.scale(1 / e.scaleX, 1 / e.scaleY),
                      s.translate(-e.offsetX, -e.offsetY),
                      s.transform.apply(s, r),
                      (e.startTransformInverse = s.mozCurrentTransformInverse),
                      c(a, s),
                      (this.ctx = s),
                      this.setGState([
                        ["BM", "source-over"],
                        ["ca", 1],
                        ["CA", 1],
                      ]),
                      this.groupStack.push(a),
                      this.groupLevel++;
                  },
                  suspendSMaskGroup: function () {
                    var e = this.ctx;
                    this.groupLevel--,
                      (this.ctx = this.groupStack.pop()),
                      (this.composeSmask || h)(
                        this.ctx,
                        this.current.activeSMask,
                        e,
                        this.webGLContext
                      ),
                      this.ctx.restore(),
                      this.ctx.save(),
                      c(e, this.ctx),
                      (this.current.resumeSMaskCtx = e);
                    var t = o.Util.transform(
                      this.current.activeSMask.startTransformInverse,
                      e.mozCurrentTransform
                    );
                    this.ctx.transform.apply(this.ctx, t),
                      e.save(),
                      e.setTransform(1, 0, 0, 1, 0, 0),
                      e.clearRect(0, 0, e.canvas.width, e.canvas.height),
                      e.restore();
                  },
                  resumeSMaskGroup: function () {
                    var e = this.current.resumeSMaskCtx,
                      t = this.ctx;
                    (this.ctx = e), this.groupStack.push(t), this.groupLevel++;
                  },
                  endSMaskGroup: function () {
                    var e = this.ctx;
                    this.groupLevel--,
                      (this.ctx = this.groupStack.pop()),
                      (this.composeSmask || h)(
                        this.ctx,
                        this.current.activeSMask,
                        e,
                        this.webGLContext
                      ),
                      this.ctx.restore(),
                      c(e, this.ctx);
                    var t = o.Util.transform(
                      this.current.activeSMask.startTransformInverse,
                      e.mozCurrentTransform
                    );
                    this.ctx.transform.apply(this.ctx, t);
                  },
                  save: function () {
                    this.ctx.save();
                    var e = this.current;
                    this.stateStack.push(e),
                      (this.current = e.clone()),
                      (this.current.resumeSMaskCtx = null);
                  },
                  restore: function () {
                    this.current.resumeSMaskCtx && this.resumeSMaskGroup(),
                      null === this.current.activeSMask ||
                        (0 !== this.stateStack.length &&
                          this.stateStack[this.stateStack.length - 1]
                            .activeSMask === this.current.activeSMask) ||
                        this.endSMaskGroup(),
                      0 !== this.stateStack.length &&
                        ((this.current = this.stateStack.pop()),
                        this.ctx.restore(),
                        (this.pendingClip = null),
                        (this._cachedGetSinglePixelWidth = null));
                  },
                  transform: function (e, t, n, o, i, a) {
                    this.ctx.transform(e, t, n, o, i, a),
                      (this._cachedGetSinglePixelWidth = null);
                  },
                  constructPath: function (e, t) {
                    for (
                      var n = this.ctx,
                        i = this.current,
                        a = i.x,
                        r = i.y,
                        s = 0,
                        l = 0,
                        c = e.length;
                      s < c;
                      s++
                    )
                      switch (0 | e[s]) {
                        case o.OPS.rectangle:
                          (a = t[l++]), (r = t[l++]);
                          var d = t[l++],
                            u = t[l++];
                          0 === d && (d = this.getSinglePixelWidth()),
                            0 === u && (u = this.getSinglePixelWidth());
                          var p = a + d,
                            g = r + u;
                          this.ctx.moveTo(a, r),
                            this.ctx.lineTo(p, r),
                            this.ctx.lineTo(p, g),
                            this.ctx.lineTo(a, g),
                            this.ctx.lineTo(a, r),
                            this.ctx.closePath();
                          break;
                        case o.OPS.moveTo:
                          (a = t[l++]), (r = t[l++]), n.moveTo(a, r);
                          break;
                        case o.OPS.lineTo:
                          (a = t[l++]), (r = t[l++]), n.lineTo(a, r);
                          break;
                        case o.OPS.curveTo:
                          (a = t[l + 4]),
                            (r = t[l + 5]),
                            n.bezierCurveTo(
                              t[l],
                              t[l + 1],
                              t[l + 2],
                              t[l + 3],
                              a,
                              r
                            ),
                            (l += 6);
                          break;
                        case o.OPS.curveTo2:
                          n.bezierCurveTo(
                            a,
                            r,
                            t[l],
                            t[l + 1],
                            t[l + 2],
                            t[l + 3]
                          ),
                            (a = t[l + 2]),
                            (r = t[l + 3]),
                            (l += 4);
                          break;
                        case o.OPS.curveTo3:
                          (a = t[l + 2]),
                            (r = t[l + 3]),
                            n.bezierCurveTo(t[l], t[l + 1], a, r, a, r),
                            (l += 4);
                          break;
                        case o.OPS.closePath:
                          n.closePath();
                      }
                    i.setCurrentPoint(a, r);
                  },
                  closePath: function () {
                    this.ctx.closePath();
                  },
                  stroke: function (e) {
                    e = void 0 === e || e;
                    var t = this.ctx,
                      n = this.current.strokeColor;
                    (t.lineWidth = this.current.lineWidth),
                      (t.globalAlpha = this.current.strokeAlpha),
                      n && n.hasOwnProperty("type") && "Pattern" === n.type
                        ? (t.save(),
                          (t.strokeStyle = n.getPattern(t, this)),
                          t.stroke(),
                          t.restore())
                        : t.stroke(),
                      e && this.consumePath(),
                      (t.globalAlpha = this.current.fillAlpha);
                  },
                  closeStroke: function () {
                    this.closePath(), this.stroke();
                  },
                  fill: function (e) {
                    e = void 0 === e || e;
                    var t = this.ctx,
                      n = this.current.fillColor,
                      o = !1;
                    this.current.patternFill &&
                      (t.save(),
                      this.baseTransform &&
                        t.setTransform.apply(t, this.baseTransform),
                      (t.fillStyle = n.getPattern(t, this)),
                      (o = !0)),
                      this.pendingEOFill
                        ? (t.fill("evenodd"), (this.pendingEOFill = !1))
                        : t.fill(),
                      o && t.restore(),
                      e && this.consumePath();
                  },
                  eoFill: function () {
                    (this.pendingEOFill = !0), this.fill();
                  },
                  fillStroke: function () {
                    this.fill(!1), this.stroke(!1), this.consumePath();
                  },
                  eoFillStroke: function () {
                    (this.pendingEOFill = !0), this.fillStroke();
                  },
                  closeFillStroke: function () {
                    this.closePath(), this.fillStroke();
                  },
                  closeEOFillStroke: function () {
                    (this.pendingEOFill = !0),
                      this.closePath(),
                      this.fillStroke();
                  },
                  endPath: function () {
                    this.consumePath();
                  },
                  clip: function () {
                    this.pendingClip = y;
                  },
                  eoClip: function () {
                    this.pendingClip = v;
                  },
                  beginText: function () {
                    (this.current.textMatrix = o.IDENTITY_MATRIX),
                      (this.current.textMatrixScale = 1),
                      (this.current.x = this.current.lineX = 0),
                      (this.current.y = this.current.lineY = 0);
                  },
                  endText: function () {
                    var e = this.pendingTextPaths,
                      t = this.ctx;
                    if (void 0 !== e) {
                      t.save(), t.beginPath();
                      for (var n = 0; n < e.length; n++) {
                        var o = e[n];
                        t.setTransform.apply(t, o.transform),
                          t.translate(o.x, o.y);
                        try {
                          o.addToPath(t, o.fontSize);
                        } catch (e) {
                          console.warn("Couldn't add to path:" + e.message);
                        }
                      }
                      t.restore(),
                        t.clip(),
                        t.beginPath(),
                        delete this.pendingTextPaths;
                    } else t.beginPath();
                  },
                  setCharSpacing: function (e) {
                    this.current.charSpacing = e;
                  },
                  setWordSpacing: function (e) {
                    this.current.wordSpacing = e;
                  },
                  setHScale: function (e) {
                    this.current.textHScale = e / 100;
                  },
                  setLeading: function (e) {
                    this.current.leading = -e;
                  },
                  setFont: function (e, t) {
                    var n = this.commonObjs.get(e),
                      i = this.current;
                    if (!n) throw new Error("Can't find font for ".concat(e));
                    if (
                      ((i.fontMatrix = n.fontMatrix
                        ? n.fontMatrix
                        : o.FONT_IDENTITY_MATRIX),
                      (0 !== i.fontMatrix[0] && 0 !== i.fontMatrix[3]) ||
                        (0, o.warn)("Invalid font matrix for font " + e),
                      t < 0
                        ? ((t = -t), (i.fontDirection = -1))
                        : (i.fontDirection = 1),
                      (this.current.font = n),
                      (this.current.fontSize = t),
                      !n.isType3Font)
                    ) {
                      var a = n.loadedName || "sans-serif",
                        r = n.black ? "900" : n.bold ? "bold" : "normal",
                        s = n.italic ? "italic" : "normal",
                        l = '"'.concat(a, '", ').concat(n.fallbackName),
                        c = t < 16 ? 16 : t > 100 ? 100 : t;
                      (this.current.fontSizeScale = t / c),
                        (this.ctx.font = ""
                          .concat(s, " ")
                          .concat(r, " ")
                          .concat(c, "px ")
                          .concat(l));
                    }
                  },
                  setTextRenderingMode: function (e) {
                    this.current.textRenderingMode = e;
                  },
                  setTextRise: function (e) {
                    this.current.textRise = e;
                  },
                  moveText: function (e, t) {
                    (this.current.x = this.current.lineX += e),
                      (this.current.y = this.current.lineY += t);
                  },
                  setLeadingMoveText: function (e, t) {
                    this.setLeading(-t), this.moveText(e, t);
                  },
                  setTextMatrix: function (e, t, n, o, i, a) {
                    (this.current.textMatrix = [e, t, n, o, i, a]),
                      (this.current.textMatrixScale = Math.sqrt(e * e + t * t)),
                      (this.current.x = this.current.lineX = 0),
                      (this.current.y = this.current.lineY = 0);
                  },
                  nextLine: function () {
                    this.moveText(0, this.current.leading);
                  },
                  paintChar: function (e, t, n, i, a) {
                    var r,
                      s = this.ctx,
                      l = this.current,
                      c = l.font,
                      d = l.textRenderingMode,
                      u = l.fontSize / l.fontSizeScale,
                      p = d & o.TextRenderingMode.FILL_STROKE_MASK,
                      g = !!(d & o.TextRenderingMode.ADD_TO_PATH_FLAG),
                      h = l.patternFill && c.data;
                    (c.disableFontFace || g || h) &&
                      (r = c.getPathGenerator(this.commonObjs, e)),
                      c.disableFontFace || h
                        ? (s.save(),
                          s.translate(t, n),
                          s.beginPath(),
                          r(s, u),
                          i && s.setTransform.apply(s, i),
                          (p !== o.TextRenderingMode.FILL &&
                            p !== o.TextRenderingMode.FILL_STROKE) ||
                            s.fill(),
                          (p !== o.TextRenderingMode.STROKE &&
                            p !== o.TextRenderingMode.FILL_STROKE) ||
                            s.stroke(),
                          s.restore())
                        : ((p !== o.TextRenderingMode.FILL &&
                            p !== o.TextRenderingMode.FILL_STROKE) ||
                            s.fillText(e, t, n, a),
                          (p !== o.TextRenderingMode.STROKE &&
                            p !== o.TextRenderingMode.FILL_STROKE) ||
                            s.strokeText(e, t, n, a)),
                      g &&
                        (
                          this.pendingTextPaths || (this.pendingTextPaths = [])
                        ).push({
                          transform: s.mozCurrentTransform,
                          x: t,
                          y: n,
                          fontSize: u,
                          addToPath: r,
                        });
                  },
                  get isFontSubpixelAAEnabled() {
                    var e = this.canvasFactory.create(10, 10).context;
                    e.scale(1.5, 1), e.fillText("I", 0, 10);
                    for (
                      var t = e.getImageData(0, 0, 10, 10).data, n = !1, i = 3;
                      i < t.length;
                      i += 4
                    )
                      if (t[i] > 0 && t[i] < 255) {
                        n = !0;
                        break;
                      }
                    return (0, o.shadow)(this, "isFontSubpixelAAEnabled", n);
                  },
                  showText: function (e) {
                    var t = this.current,
                      n = t.font;
                    if (n && n.isType3Font) return this.showType3Text(e);
                    var i = t.fontSize;
                    if (0 !== i) {
                      var a,
                        r = this.ctx,
                        s = t.fontSizeScale,
                        l = t.charSpacing,
                        c = t.wordSpacing,
                        d = t.fontDirection,
                        u = t.textHScale * d,
                        p = e.length,
                        g = n.vertical,
                        h = g ? 1 : -1,
                        f = n.defaultVMetrics,
                        m = i * t.fontMatrix[0],
                        y =
                          t.textRenderingMode === o.TextRenderingMode.FILL &&
                          !n.disableFontFace &&
                          !t.patternFill;
                      if ((r.save(), t.patternFill)) {
                        r.save();
                        var v = t.fillColor.getPattern(r, this);
                        (a = r.mozCurrentTransform),
                          r.restore(),
                          (r.fillStyle = v);
                      }
                      r.transform.apply(r, t.textMatrix),
                        r.translate(t.x, t.y + t.textRise),
                        d > 0 ? r.scale(u, -1) : r.scale(u, 1);
                      var _ = t.lineWidth,
                        b = t.textMatrixScale;
                      if (0 === b || 0 === _) {
                        var w =
                          t.textRenderingMode &
                          o.TextRenderingMode.FILL_STROKE_MASK;
                        (w !== o.TextRenderingMode.STROKE &&
                          w !== o.TextRenderingMode.FILL_STROKE) ||
                          ((this._cachedGetSinglePixelWidth = null),
                          (_ = 0.65 * this.getSinglePixelWidth()));
                      } else _ /= b;
                      1 !== s && (r.scale(s, s), (_ /= s)), (r.lineWidth = _);
                      var C,
                        x = 0;
                      for (C = 0; C < p; ++C) {
                        var S = e[C];
                        if ((0, o.isNum)(S)) x += (h * S * i) / 1e3;
                        else {
                          var E,
                            A,
                            T,
                            G,
                            P,
                            D,
                            L,
                            I = !1,
                            k = (S.isSpace ? c : 0) + l,
                            O = S.unicode,
                            F = S.accent,
                            R = S.width;
                          if (
                            (g
                              ? ((P = S.vmetric || f),
                                (D = -(D = S.vmetric ? P[1] : 0.5 * R) * m),
                                (L = P[2] * m),
                                (R = P ? -P[0] : R),
                                (E = D / s),
                                (A = (x + L) / s))
                              : ((E = x / s), (A = 0)),
                            n.remeasure && R > 0)
                          ) {
                            var M = ((1e3 * r.measureText(O).width) / i) * s;
                            if (R < M && this.isFontSubpixelAAEnabled) {
                              var N = R / M;
                              (I = !0), r.save(), r.scale(N, 1), (E /= N);
                            } else R !== M && (E += (((R - M) / 2e3) * i) / s);
                          }
                          var B = R * m + k * d;
                          (S.isInFont || n.missingFile) &&
                            (y && !F
                              ? r.fillText(O, E, A, B)
                              : (this.paintChar(O, E, A, a, B),
                                F &&
                                  ((T = E + F.offset.x / s),
                                  (G = A - F.offset.y / s),
                                  this.paintChar(F.fontChar, T, G, a, B)))),
                            (x += B),
                            I && r.restore();
                        }
                      }
                      g ? (t.y -= x * u) : (t.x += x * u), r.restore();
                    }
                  },
                  showType3Text: function (e) {
                    var t,
                      n,
                      i,
                      a,
                      r = this.ctx,
                      s = this.current,
                      l = s.font,
                      c = s.fontSize,
                      d = s.fontDirection,
                      u = l.vertical ? 1 : -1,
                      p = s.charSpacing,
                      g = s.wordSpacing,
                      h = s.textHScale * d,
                      f = s.fontMatrix || o.FONT_IDENTITY_MATRIX,
                      m = e.length;
                    if (
                      s.textRenderingMode !== o.TextRenderingMode.INVISIBLE &&
                      0 !== c
                    ) {
                      for (
                        this._cachedGetSinglePixelWidth = null,
                          r.save(),
                          r.transform.apply(r, s.textMatrix),
                          r.translate(s.x, s.y),
                          r.scale(h, d),
                          t = 0;
                        t < m;
                        ++t
                      )
                        if (((n = e[t]), (0, o.isNum)(n)))
                          (a = (u * n * c) / 1e3),
                            this.ctx.translate(a, 0),
                            (s.x += a * h);
                        else {
                          var y = (n.isSpace ? g : 0) + p,
                            v = l.charProcOperatorList[n.operatorListId];
                          v
                            ? ((this.processingType3 = n),
                              this.save(),
                              r.scale(c, c),
                              r.transform.apply(r, f),
                              this.executeOperatorList(v),
                              this.restore(),
                              (i =
                                o.Util.applyTransform([n.width, 0], f)[0] * c +
                                y),
                              r.translate(i, 0),
                              (s.x += i * h))
                            : (0, o.warn)(
                                'Type3 character "'.concat(
                                  n.operatorListId,
                                  '" is not available.'
                                )
                              );
                        }
                      r.restore(), (this.processingType3 = null);
                    }
                  },
                  setCharWidth: function (e, t) {},
                  setCharWidthAndBounds: function (e, t, n, o, i, a) {
                    this.ctx.rect(n, o, i - n, a - o),
                      this.clip(),
                      this.endPath();
                  },
                  getColorN_Pattern: function (e) {
                    var t,
                      n = this;
                    if ("TilingPattern" === e[0]) {
                      var o = e[1],
                        a =
                          this.baseTransform ||
                          this.ctx.mozCurrentTransform.slice(),
                        r = this,
                        s = {
                          createCanvasGraphics: function (e) {
                            return new r.constructor(
                              e,
                              n.commonObjs,
                              n.objs,
                              n.canvasFactory,
                              n.webGLContext
                            );
                          },
                        };
                      t = new i.TilingPattern(e, o, this.ctx, s, a);
                    } else t = (0, i.getShadingPatternFromIR)(e);
                    return t;
                  },
                  setStrokeColorN: function () {
                    this.current.strokeColor =
                      this.getColorN_Pattern(arguments);
                  },
                  setFillColorN: function () {
                    (this.current.fillColor =
                      this.getColorN_Pattern(arguments)),
                      (this.current.patternFill = !0);
                  },
                  setStrokeRGBColor: function (e, t, n) {
                    var i = o.Util.makeCssRgb(e, t, n);
                    (this.ctx.strokeStyle = i), (this.current.strokeColor = i);
                  },
                  setFillRGBColor: function (e, t, n) {
                    var i = o.Util.makeCssRgb(e, t, n);
                    (this.ctx.fillStyle = i),
                      (this.current.fillColor = i),
                      (this.current.patternFill = !1);
                  },
                  setStrokeCMYKColor: function (e, t, n, i) {
                    var a = o.Util.makeCssCMYK(e, t, n, i);
                    (this.ctx.strokeStyle = a), (this.current.strokeColor = a);
                  },
                  setFillCMYKColor: function (e, t, n, i) {
                    var a = o.Util.makeCssCMYK(e, t, n, i);
                    (this.ctx.fillStyle = a),
                      (this.current.fillColor = a),
                      (this.current.patternFill = !1);
                  },
                  shadingFill: function (e) {
                    var t = this.ctx;
                    this.save();
                    var n = (0, i.getShadingPatternFromIR)(e);
                    t.fillStyle = n.getPattern(t, this, !0);
                    var a = t.mozCurrentTransformInverse;
                    if (a) {
                      var r = t.canvas,
                        s = r.width,
                        l = r.height,
                        c = o.Util.applyTransform([0, 0], a),
                        d = o.Util.applyTransform([0, l], a),
                        u = o.Util.applyTransform([s, 0], a),
                        p = o.Util.applyTransform([s, l], a),
                        g = Math.min(c[0], d[0], u[0], p[0]),
                        h = Math.min(c[1], d[1], u[1], p[1]),
                        f = Math.max(c[0], d[0], u[0], p[0]),
                        m = Math.max(c[1], d[1], u[1], p[1]);
                      this.ctx.fillRect(g, h, f - g, m - h);
                    } else this.ctx.fillRect(-1e10, -1e10, 2e10, 2e10);
                    this.restore();
                  },
                  beginInlineImage: function () {
                    (0, o.unreachable)("Should not call beginInlineImage");
                  },
                  beginImageData: function () {
                    (0, o.unreachable)("Should not call beginImageData");
                  },
                  paintFormXObjectBegin: function (e, t) {
                    if (
                      (this.save(),
                      this.baseTransformStack.push(this.baseTransform),
                      Array.isArray(e) &&
                        6 === e.length &&
                        this.transform.apply(this, e),
                      (this.baseTransform = this.ctx.mozCurrentTransform),
                      t)
                    ) {
                      var n = t[2] - t[0],
                        o = t[3] - t[1];
                      this.ctx.rect(t[0], t[1], n, o),
                        this.clip(),
                        this.endPath();
                    }
                  },
                  paintFormXObjectEnd: function () {
                    this.restore(),
                      (this.baseTransform = this.baseTransformStack.pop());
                  },
                  beginGroup: function (e) {
                    this.save();
                    var t = this.ctx;
                    e.isolated ||
                      (0, o.info)("TODO: Support non-isolated groups."),
                      e.knockout &&
                        (0, o.warn)("Knockout groups not supported.");
                    var n = t.mozCurrentTransform;
                    if ((e.matrix && t.transform.apply(t, e.matrix), !e.bbox))
                      throw new Error("Bounding box is required.");
                    var i = o.Util.getAxialAlignedBoundingBox(
                        e.bbox,
                        t.mozCurrentTransform
                      ),
                      a = [0, 0, t.canvas.width, t.canvas.height];
                    i = o.Util.intersect(i, a) || [0, 0, 0, 0];
                    var r = Math.floor(i[0]),
                      s = Math.floor(i[1]),
                      l = Math.max(Math.ceil(i[2]) - r, 1),
                      d = Math.max(Math.ceil(i[3]) - s, 1),
                      u = 1,
                      p = 1;
                    l > 4096 && ((u = l / 4096), (l = 4096)),
                      d > 4096 && ((p = d / 4096), (d = 4096));
                    var g = "groupAt" + this.groupLevel;
                    e.smask && (g += "_smask_" + (this.smaskCounter++ % 2));
                    var h = this.cachedCanvases.getCanvas(g, l, d, !0),
                      f = h.context;
                    f.scale(1 / u, 1 / p),
                      f.translate(-r, -s),
                      f.transform.apply(f, n),
                      e.smask
                        ? this.smaskStack.push({
                            canvas: h.canvas,
                            context: f,
                            offsetX: r,
                            offsetY: s,
                            scaleX: u,
                            scaleY: p,
                            subtype: e.smask.subtype,
                            backdrop: e.smask.backdrop,
                            transferMap: e.smask.transferMap || null,
                            startTransformInverse: null,
                          })
                        : (t.setTransform(1, 0, 0, 1, 0, 0),
                          t.translate(r, s),
                          t.scale(u, p)),
                      c(t, f),
                      (this.ctx = f),
                      this.setGState([
                        ["BM", "source-over"],
                        ["ca", 1],
                        ["CA", 1],
                      ]),
                      this.groupStack.push(t),
                      this.groupLevel++,
                      (this.current.activeSMask = null);
                  },
                  endGroup: function (e) {
                    this.groupLevel--;
                    var t = this.ctx;
                    (this.ctx = this.groupStack.pop()),
                      void 0 !== this.ctx.imageSmoothingEnabled
                        ? (this.ctx.imageSmoothingEnabled = !1)
                        : (this.ctx.mozImageSmoothingEnabled = !1),
                      e.smask
                        ? (this.tempSMask = this.smaskStack.pop())
                        : this.ctx.drawImage(t.canvas, 0, 0),
                      this.restore();
                  },
                  beginAnnotations: function () {
                    this.save(),
                      this.baseTransform &&
                        this.ctx.setTransform.apply(
                          this.ctx,
                          this.baseTransform
                        );
                  },
                  endAnnotations: function () {
                    this.restore();
                  },
                  beginAnnotation: function (e, t, n) {
                    if (
                      (this.save(),
                      d(this.ctx),
                      (this.current = new l()),
                      Array.isArray(e) && 4 === e.length)
                    ) {
                      var o = e[2] - e[0],
                        i = e[3] - e[1];
                      this.ctx.rect(e[0], e[1], o, i),
                        this.clip(),
                        this.endPath();
                    }
                    this.transform.apply(this, t),
                      this.transform.apply(this, n);
                  },
                  endAnnotation: function () {
                    this.restore();
                  },
                  paintJpegXObject: function (e, t, n) {
                    var i = this.objs.get(e);
                    if (i) {
                      this.save();
                      var a = this.ctx;
                      if (
                        (a.scale(1 / t, -1 / n),
                        a.drawImage(i, 0, 0, i.width, i.height, 0, -n, t, n),
                        this.imageLayer)
                      ) {
                        var r = a.mozCurrentTransformInverse,
                          s = this.getCanvasPosition(0, 0);
                        this.imageLayer.appendImage({
                          objId: e,
                          left: s[0],
                          top: s[1],
                          width: t / r[0],
                          height: n / r[3],
                        });
                      }
                      this.restore();
                    } else (0, o.warn)("Dependent image isn't ready yet");
                  },
                  paintImageMaskXObject: function (e) {
                    var t = this.ctx,
                      o = e.width,
                      i = e.height,
                      a = this.current.fillColor,
                      r = this.current.patternFill,
                      s = this.processingType3;
                    if (
                      (s &&
                        void 0 === s.compiled &&
                        (s.compiled =
                          o <= 1e3 && i <= 1e3
                            ? (function (e) {
                                var t,
                                  n,
                                  o,
                                  i,
                                  a = e.width,
                                  r = e.height,
                                  s = a + 1,
                                  l = new Uint8Array(s * (r + 1)),
                                  c = new Uint8Array([
                                    0, 2, 4, 0, 1, 0, 5, 4, 8, 10, 0, 8, 0, 2,
                                    1, 0,
                                  ]),
                                  d = (a + 7) & -8,
                                  u = e.data,
                                  p = new Uint8Array(d * r),
                                  g = 0;
                                for (t = 0, i = u.length; t < i; t++)
                                  for (var h = 128, f = u[t]; h > 0; )
                                    (p[g++] = f & h ? 0 : 255), (h >>= 1);
                                var m = 0;
                                for (
                                  0 !== p[(g = 0)] && ((l[0] = 1), ++m), n = 1;
                                  n < a;
                                  n++
                                )
                                  p[g] !== p[g + 1] &&
                                    ((l[n] = p[g] ? 2 : 1), ++m),
                                    g++;
                                for (
                                  0 !== p[g] && ((l[n] = 2), ++m), t = 1;
                                  t < r;
                                  t++
                                ) {
                                  (o = t * s),
                                    p[(g = t * d) - d] !== p[g] &&
                                      ((l[o] = p[g] ? 1 : 8), ++m);
                                  var y = (p[g] ? 4 : 0) + (p[g - d] ? 8 : 0);
                                  for (n = 1; n < a; n++)
                                    c[
                                      (y =
                                        (y >> 2) +
                                        (p[g + 1] ? 4 : 0) +
                                        (p[g - d + 1] ? 8 : 0))
                                    ] && ((l[o + n] = c[y]), ++m),
                                      g++;
                                  if (
                                    (p[g - d] !== p[g] &&
                                      ((l[o + n] = p[g] ? 2 : 4), ++m),
                                    m > 1e3)
                                  )
                                    return null;
                                }
                                for (
                                  o = t * s,
                                    0 !== p[(g = d * (r - 1))] &&
                                      ((l[o] = 8), ++m),
                                    n = 1;
                                  n < a;
                                  n++
                                )
                                  p[g] !== p[g + 1] &&
                                    ((l[o + n] = p[g] ? 4 : 8), ++m),
                                    g++;
                                if (
                                  (0 !== p[g] && ((l[o + n] = 4), ++m), m > 1e3)
                                )
                                  return null;
                                var v = new Int32Array([
                                    0,
                                    s,
                                    -1,
                                    0,
                                    -s,
                                    0,
                                    0,
                                    0,
                                    1,
                                  ]),
                                  _ = [];
                                for (t = 0; m && t <= r; t++) {
                                  for (
                                    var b = t * s, w = b + a;
                                    b < w && !l[b];

                                  )
                                    b++;
                                  if (b !== w) {
                                    var C,
                                      x = [b % s, t],
                                      S = l[b],
                                      E = b;
                                    do {
                                      var A = v[S];
                                      do {
                                        b += A;
                                      } while (!l[b]);
                                      5 !== (C = l[b]) && 10 !== C
                                        ? ((S = C), (l[b] = 0))
                                        : ((S = C & ((51 * S) >> 4)),
                                          (l[b] &= (S >> 2) | (S << 2))),
                                        x.push(b % s),
                                        x.push((b / s) | 0),
                                        --m;
                                    } while (E !== b);
                                    _.push(x), --t;
                                  }
                                }
                                return function (e) {
                                  e.save(),
                                    e.scale(1 / a, -1 / r),
                                    e.translate(0, -r),
                                    e.beginPath();
                                  for (var t = 0, n = _.length; t < n; t++) {
                                    var o = _[t];
                                    e.moveTo(o[0], o[1]);
                                    for (var i = 2, s = o.length; i < s; i += 2)
                                      e.lineTo(o[i], o[i + 1]);
                                  }
                                  e.fill(), e.beginPath(), e.restore();
                                };
                              })({ data: e.data, width: o, height: i })
                            : null),
                      s && s.compiled)
                    )
                      s.compiled(t);
                    else {
                      var l = this.cachedCanvases.getCanvas("maskCanvas", o, i),
                        c = l.context;
                      c.save(),
                        n(c, e),
                        (c.globalCompositeOperation = "source-in"),
                        (c.fillStyle = r ? a.getPattern(c, this) : a),
                        c.fillRect(0, 0, o, i),
                        c.restore(),
                        this.paintInlineImageXObject(l.canvas);
                    }
                  },
                  paintImageMaskXObjectRepeat: function (e, t, o, i) {
                    var a = e.width,
                      r = e.height,
                      s = this.current.fillColor,
                      l = this.current.patternFill,
                      c = this.cachedCanvases.getCanvas("maskCanvas", a, r),
                      d = c.context;
                    d.save(),
                      n(d, e),
                      (d.globalCompositeOperation = "source-in"),
                      (d.fillStyle = l ? s.getPattern(d, this) : s),
                      d.fillRect(0, 0, a, r),
                      d.restore();
                    for (var u = this.ctx, p = 0, g = i.length; p < g; p += 2)
                      u.save(),
                        u.transform(t, 0, 0, o, i[p], i[p + 1]),
                        u.scale(1, -1),
                        u.drawImage(c.canvas, 0, 0, a, r, 0, -1, 1, 1),
                        u.restore();
                  },
                  paintImageMaskXObjectGroup: function (e) {
                    for (
                      var t = this.ctx,
                        o = this.current.fillColor,
                        i = this.current.patternFill,
                        a = 0,
                        r = e.length;
                      a < r;
                      a++
                    ) {
                      var s = e[a],
                        l = s.width,
                        c = s.height,
                        d = this.cachedCanvases.getCanvas("maskCanvas", l, c),
                        u = d.context;
                      u.save(),
                        n(u, s),
                        (u.globalCompositeOperation = "source-in"),
                        (u.fillStyle = i ? o.getPattern(u, this) : o),
                        u.fillRect(0, 0, l, c),
                        u.restore(),
                        t.save(),
                        t.transform.apply(t, s.transform),
                        t.scale(1, -1),
                        t.drawImage(d.canvas, 0, 0, l, c, 0, -1, 1, 1),
                        t.restore();
                    }
                  },
                  paintImageXObject: function (e) {
                    var t = this.objs.get(e);
                    t
                      ? this.paintInlineImageXObject(t)
                      : (0, o.warn)("Dependent image isn't ready yet");
                  },
                  paintImageXObjectRepeat: function (e, t, n, i) {
                    var a = this.objs.get(e);
                    if (a) {
                      for (
                        var r = a.width,
                          s = a.height,
                          l = [],
                          c = 0,
                          d = i.length;
                        c < d;
                        c += 2
                      )
                        l.push({
                          transform: [t, 0, 0, n, i[c], i[c + 1]],
                          x: 0,
                          y: 0,
                          w: r,
                          h: s,
                        });
                      this.paintInlineImageXObjectGroup(a, l);
                    } else (0, o.warn)("Dependent image isn't ready yet");
                  },
                  paintInlineImageXObject: function (e) {
                    var n = e.width,
                      o = e.height,
                      i = this.ctx;
                    this.save(), i.scale(1 / n, -1 / o);
                    var a,
                      r,
                      s = i.mozCurrentTransformInverse,
                      l = s[0],
                      c = s[1],
                      d = Math.max(Math.sqrt(l * l + c * c), 1),
                      u = s[2],
                      p = s[3],
                      g = Math.max(Math.sqrt(u * u + p * p), 1);
                    if (
                      ("function" == typeof HTMLElement &&
                        e instanceof HTMLElement) ||
                      !e.data
                    )
                      a = e;
                    else {
                      var h = (r = this.cachedCanvases.getCanvas(
                        "inlineImage",
                        n,
                        o
                      )).context;
                      t(h, e), (a = r.canvas);
                    }
                    for (
                      var f = n, m = o, y = "prescale1";
                      (d > 2 && f > 1) || (g > 2 && m > 1);

                    ) {
                      var v = f,
                        _ = m;
                      d > 2 && f > 1 && (d /= f / (v = Math.ceil(f / 2))),
                        g > 2 && m > 1 && (g /= m / (_ = Math.ceil(m / 2))),
                        (h = (r = this.cachedCanvases.getCanvas(y, v, _))
                          .context).clearRect(0, 0, v, _),
                        h.drawImage(a, 0, 0, f, m, 0, 0, v, _),
                        (a = r.canvas),
                        (f = v),
                        (m = _),
                        (y = "prescale1" === y ? "prescale2" : "prescale1");
                    }
                    if (
                      (i.drawImage(a, 0, 0, f, m, 0, -o, n, o), this.imageLayer)
                    ) {
                      var b = this.getCanvasPosition(0, -o);
                      this.imageLayer.appendImage({
                        imgData: e,
                        left: b[0],
                        top: b[1],
                        width: n / s[0],
                        height: o / s[3],
                      });
                    }
                    this.restore();
                  },
                  paintInlineImageXObjectGroup: function (e, n) {
                    var o = this.ctx,
                      i = e.width,
                      a = e.height,
                      r = this.cachedCanvases.getCanvas("inlineImage", i, a);
                    t(r.context, e);
                    for (var s = 0, l = n.length; s < l; s++) {
                      var c = n[s];
                      if (
                        (o.save(),
                        o.transform.apply(o, c.transform),
                        o.scale(1, -1),
                        o.drawImage(r.canvas, c.x, c.y, c.w, c.h, 0, -1, 1, 1),
                        this.imageLayer)
                      ) {
                        var d = this.getCanvasPosition(c.x, c.y);
                        this.imageLayer.appendImage({
                          imgData: e,
                          left: d[0],
                          top: d[1],
                          width: i,
                          height: a,
                        });
                      }
                      o.restore();
                    }
                  },
                  paintSolidColorImageMask: function () {
                    this.ctx.fillRect(0, 0, 1, 1);
                  },
                  paintXObject: function () {
                    (0, o.warn)("Unsupported 'paintXObject' command.");
                  },
                  markPoint: function (e) {},
                  markPointProps: function (e, t) {},
                  beginMarkedContent: function (e) {},
                  beginMarkedContentProps: function (e, t) {},
                  endMarkedContent: function () {},
                  beginCompat: function () {},
                  endCompat: function () {},
                  consumePath: function () {
                    var e = this.ctx;
                    this.pendingClip &&
                      (this.pendingClip === v ? e.clip("evenodd") : e.clip(),
                      (this.pendingClip = null)),
                      e.beginPath();
                  },
                  getSinglePixelWidth: function (e) {
                    if (null === this._cachedGetSinglePixelWidth) {
                      var t = this.ctx.mozCurrentTransformInverse;
                      this._cachedGetSinglePixelWidth = Math.sqrt(
                        Math.max(
                          t[0] * t[0] + t[1] * t[1],
                          t[2] * t[2] + t[3] * t[3]
                        )
                      );
                    }
                    return this._cachedGetSinglePixelWidth;
                  },
                  getCanvasPosition: function (e, t) {
                    var n = this.ctx.mozCurrentTransform;
                    return [
                      n[0] * e + n[2] * t + n[4],
                      n[1] * e + n[3] * t + n[5],
                    ];
                  },
                }),
                o.OPS))
                  e.prototype[o.OPS[_]] = e.prototype[_];
                return e;
              })();
            t.CanvasGraphics = c;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.getShadingPatternFromIR = function (e) {
                var t = i[e[0]];
                if (!t) throw new Error("Unknown IR type: ".concat(e[0]));
                return t.fromIR(e);
              }),
              (t.TilingPattern = void 0);
            var o = n(1),
              i = {
                RadialAxial: {
                  fromIR: function (e) {
                    var t = e[1],
                      n = e[2],
                      o = e[3],
                      i = e[4],
                      a = e[5],
                      r = e[6],
                      s = e[7];
                    return {
                      type: "Pattern",
                      getPattern: function (e) {
                        var l;
                        "axial" === t
                          ? (l = e.createLinearGradient(
                              o[0],
                              o[1],
                              i[0],
                              i[1],
                              s
                            ))
                          : "radial" === t &&
                            (l = e.createRadialGradient(
                              o[0],
                              o[1],
                              a,
                              i[0],
                              i[1],
                              r,
                              s
                            ));
                        for (var c = 0, d = n.length; c < d; ++c) {
                          var u = n[c];
                          l.addColorStop(u[0], u[1]);
                        }
                        return l;
                      },
                    };
                  },
                },
              },
              a = (function () {
                function e(e, t, n, o, i, a, r, s) {
                  var l,
                    c = t.coords,
                    d = t.colors,
                    u = e.data,
                    p = 4 * e.width;
                  c[n + 1] > c[o + 1] &&
                    ((l = n), (n = o), (o = l), (l = a), (a = r), (r = l)),
                    c[o + 1] > c[i + 1] &&
                      ((l = o), (o = i), (i = l), (l = r), (r = s), (s = l)),
                    c[n + 1] > c[o + 1] &&
                      ((l = n), (n = o), (o = l), (l = a), (a = r), (r = l));
                  var g = (c[n] + t.offsetX) * t.scaleX,
                    h = (c[n + 1] + t.offsetY) * t.scaleY,
                    f = (c[o] + t.offsetX) * t.scaleX,
                    m = (c[o + 1] + t.offsetY) * t.scaleY,
                    y = (c[i] + t.offsetX) * t.scaleX,
                    v = (c[i + 1] + t.offsetY) * t.scaleY;
                  if (!(h >= v))
                    for (
                      var _,
                        b,
                        w,
                        C,
                        x,
                        S,
                        E,
                        A,
                        T,
                        G = d[a],
                        P = d[a + 1],
                        D = d[a + 2],
                        L = d[r],
                        I = d[r + 1],
                        k = d[r + 2],
                        O = d[s],
                        F = d[s + 1],
                        R = d[s + 2],
                        M = Math.round(h),
                        N = Math.round(v),
                        B = M;
                      B <= N;
                      B++
                    ) {
                      B < m
                        ? ((_ =
                            g -
                            (g - f) *
                              (T =
                                B < h ? 0 : h === m ? 1 : (h - B) / (h - m))),
                          (b = G - (G - L) * T),
                          (w = P - (P - I) * T),
                          (C = D - (D - k) * T))
                        : ((_ =
                            f -
                            (f - y) *
                              (T =
                                B > v ? 1 : m === v ? 0 : (m - B) / (m - v))),
                          (b = L - (L - O) * T),
                          (w = I - (I - F) * T),
                          (C = k - (k - R) * T)),
                        (x =
                          g -
                          (g - y) *
                            (T = B < h ? 0 : B > v ? 1 : (h - B) / (h - v))),
                        (S = G - (G - O) * T),
                        (E = P - (P - F) * T),
                        (A = D - (D - R) * T);
                      for (
                        var U = Math.round(Math.min(_, x)),
                          $ = Math.round(Math.max(_, x)),
                          j = p * B + 4 * U,
                          K = U;
                        K <= $;
                        K++
                      )
                        (T = (T = (_ - K) / (_ - x)) < 0 ? 0 : T > 1 ? 1 : T),
                          (u[j++] = (b - (b - S) * T) | 0),
                          (u[j++] = (w - (w - E) * T) | 0),
                          (u[j++] = (C - (C - A) * T) | 0),
                          (u[j++] = 255);
                    }
                }
                function t(t, n, o) {
                  var i,
                    a,
                    r = n.coords,
                    s = n.colors;
                  switch (n.type) {
                    case "lattice":
                      var l = n.verticesPerRow,
                        c = Math.floor(r.length / l) - 1,
                        d = l - 1;
                      for (i = 0; i < c; i++)
                        for (var u = i * l, p = 0; p < d; p++, u++)
                          e(
                            t,
                            o,
                            r[u],
                            r[u + 1],
                            r[u + l],
                            s[u],
                            s[u + 1],
                            s[u + l]
                          ),
                            e(
                              t,
                              o,
                              r[u + l + 1],
                              r[u + 1],
                              r[u + l],
                              s[u + l + 1],
                              s[u + 1],
                              s[u + l]
                            );
                      break;
                    case "triangles":
                      for (i = 0, a = r.length; i < a; i += 3)
                        e(
                          t,
                          o,
                          r[i],
                          r[i + 1],
                          r[i + 2],
                          s[i],
                          s[i + 1],
                          s[i + 2]
                        );
                      break;
                    default:
                      throw new Error("illegal figure");
                  }
                }
                return function (e, n, o, i, a, r, s, l) {
                  var c,
                    d,
                    u,
                    p,
                    g = Math.floor(e[0]),
                    h = Math.floor(e[1]),
                    f = Math.ceil(e[2]) - g,
                    m = Math.ceil(e[3]) - h,
                    y = Math.min(Math.ceil(Math.abs(f * n[0] * 1.1)), 3e3),
                    v = Math.min(Math.ceil(Math.abs(m * n[1] * 1.1)), 3e3),
                    _ = f / y,
                    b = m / v,
                    w = {
                      coords: o,
                      colors: i,
                      offsetX: -g,
                      offsetY: -h,
                      scaleX: 1 / _,
                      scaleY: 1 / b,
                    },
                    C = y + 4,
                    x = v + 4;
                  if (l.isEnabled)
                    (c = l.drawFigures({
                      width: y,
                      height: v,
                      backgroundColor: r,
                      figures: a,
                      context: w,
                    })),
                      (d = s.getCanvas("mesh", C, x, !1)).context.drawImage(
                        c,
                        2,
                        2
                      ),
                      (c = d.canvas);
                  else {
                    var S = (d = s.getCanvas("mesh", C, x, !1)).context,
                      E = S.createImageData(y, v);
                    if (r) {
                      var A = E.data;
                      for (u = 0, p = A.length; u < p; u += 4)
                        (A[u] = r[0]),
                          (A[u + 1] = r[1]),
                          (A[u + 2] = r[2]),
                          (A[u + 3] = 255);
                    }
                    for (u = 0; u < a.length; u++) t(E, a[u], w);
                    S.putImageData(E, 2, 2), (c = d.canvas);
                  }
                  return {
                    canvas: c,
                    offsetX: g - 2 * _,
                    offsetY: h - 2 * b,
                    scaleX: _,
                    scaleY: b,
                  };
                };
              })();
            (i.Mesh = {
              fromIR: function (e) {
                var t = e[2],
                  n = e[3],
                  i = e[4],
                  r = e[5],
                  s = e[6],
                  l = e[8];
                return {
                  type: "Pattern",
                  getPattern: function (e, c, d) {
                    var u;
                    if (d)
                      u = o.Util.singularValueDecompose2dScale(
                        e.mozCurrentTransform
                      );
                    else if (
                      ((u = o.Util.singularValueDecompose2dScale(
                        c.baseTransform
                      )),
                      s)
                    ) {
                      var p = o.Util.singularValueDecompose2dScale(s);
                      u = [u[0] * p[0], u[1] * p[1]];
                    }
                    var g = a(
                      r,
                      u,
                      t,
                      n,
                      i,
                      d ? null : l,
                      c.cachedCanvases,
                      c.webGLContext
                    );
                    return (
                      d ||
                        (e.setTransform.apply(e, c.baseTransform),
                        s && e.transform.apply(e, s)),
                      e.translate(g.offsetX, g.offsetY),
                      e.scale(g.scaleX, g.scaleY),
                      e.createPattern(g.canvas, "no-repeat")
                    );
                  },
                };
              },
            }),
              (i.Dummy = {
                fromIR: function () {
                  return {
                    type: "Pattern",
                    getPattern: function () {
                      return "hotpink";
                    },
                  };
                },
              });
            var r = (function () {
              var e = 1,
                t = 2;
              function n(e, t, n, o, i) {
                (this.operatorList = e[2]),
                  (this.matrix = e[3] || [1, 0, 0, 1, 0, 0]),
                  (this.bbox = e[4]),
                  (this.xstep = e[5]),
                  (this.ystep = e[6]),
                  (this.paintType = e[7]),
                  (this.tilingType = e[8]),
                  (this.color = t),
                  (this.canvasGraphicsFactory = o),
                  (this.baseTransform = i),
                  (this.type = "Pattern"),
                  (this.ctx = n);
              }
              return (
                (n.prototype = {
                  createPatternCanvas: function (e) {
                    var t = this.operatorList,
                      n = this.bbox,
                      i = this.xstep,
                      a = this.ystep,
                      r = this.paintType,
                      s = this.tilingType,
                      l = this.color,
                      c = this.canvasGraphicsFactory;
                    (0, o.info)("TilingType: " + s);
                    var d = n[0],
                      u = n[1],
                      p = n[2],
                      g = n[3],
                      h = [d, u],
                      f = [d + i, u + a],
                      m = f[0] - h[0],
                      y = f[1] - h[1],
                      v = o.Util.singularValueDecompose2dScale(this.matrix),
                      _ = o.Util.singularValueDecompose2dScale(
                        this.baseTransform
                      ),
                      b = [v[0] * _[0], v[1] * _[1]];
                    (m = Math.min(Math.ceil(Math.abs(m * b[0])), 3e3)),
                      (y = Math.min(Math.ceil(Math.abs(y * b[1])), 3e3));
                    var w = e.cachedCanvases.getCanvas("pattern", m, y, !0),
                      C = w.context,
                      x = c.createCanvasGraphics(C);
                    (x.groupLevel = e.groupLevel),
                      this.setFillAndStrokeStyleToContext(x, r, l),
                      this.setScale(m, y, i, a),
                      this.transformToScale(x);
                    var S = [1, 0, 0, 1, -h[0], -h[1]];
                    return (
                      x.transform.apply(x, S),
                      this.clipBbox(x, n, d, u, p, g),
                      x.executeOperatorList(t),
                      w.canvas
                    );
                  },
                  setScale: function (e, t, n, o) {
                    this.scale = [e / n, t / o];
                  },
                  transformToScale: function (e) {
                    var t = this.scale,
                      n = [t[0], 0, 0, t[1], 0, 0];
                    e.transform.apply(e, n);
                  },
                  scaleToContext: function () {
                    var e = this.scale;
                    this.ctx.scale(1 / e[0], 1 / e[1]);
                  },
                  clipBbox: function (e, t, n, o, i, a) {
                    if (Array.isArray(t) && 4 === t.length) {
                      var r = i - n,
                        s = a - o;
                      e.ctx.rect(n, o, r, s), e.clip(), e.endPath();
                    }
                  },
                  setFillAndStrokeStyleToContext: function (n, i, a) {
                    var r = n.ctx,
                      s = n.current;
                    switch (i) {
                      case e:
                        var l = this.ctx;
                        (r.fillStyle = l.fillStyle),
                          (r.strokeStyle = l.strokeStyle),
                          (s.fillColor = l.fillStyle),
                          (s.strokeColor = l.strokeStyle);
                        break;
                      case t:
                        var c = o.Util.makeCssRgb(a[0], a[1], a[2]);
                        (r.fillStyle = c),
                          (r.strokeStyle = c),
                          (s.fillColor = c),
                          (s.strokeColor = c);
                        break;
                      default:
                        throw new o.FormatError(
                          "Unsupported paint type: ".concat(i)
                        );
                    }
                  },
                  getPattern: function (e, t) {
                    var n = this.createPatternCanvas(t);
                    return (
                      (e = this.ctx).setTransform.apply(e, this.baseTransform),
                      e.transform.apply(e, this.matrix),
                      this.scaleToContext(),
                      e.createPattern(n, "repeat")
                    );
                  },
                }),
                n
              );
            })();
            t.TilingPattern = r;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.GlobalWorkerOptions = void 0);
            var o = Object.create(null);
            (t.GlobalWorkerOptions = o),
              (o.workerPort = void 0 === o.workerPort ? null : o.workerPort),
              (o.workerSrc = void 0 === o.workerSrc ? "" : o.workerSrc);
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.MessageHandler = h);
            var o,
              i = (o = n(147)) && o.__esModule ? o : { default: o },
              a = n(1);
            function r(e) {
              return (r =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            function s(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function l(e) {
              return function () {
                var t = this,
                  n = arguments;
                return new Promise(function (o, i) {
                  var a = e.apply(t, n);
                  function r(e) {
                    s(a, o, i, r, l, "next", e);
                  }
                  function l(e) {
                    s(a, o, i, r, l, "throw", e);
                  }
                  r(void 0);
                });
              };
            }
            function c(e, t) {
              return d.apply(this, arguments);
            }
            function d() {
              return (d = l(
                i.default.mark(function e(t, n) {
                  var o,
                    a = arguments;
                  return i.default.wrap(
                    function (e) {
                      for (;;)
                        switch ((e.prev = e.next)) {
                          case 0:
                            if (
                              ((o =
                                a.length > 2 && void 0 !== a[2] ? a[2] : null),
                              t)
                            ) {
                              e.next = 3;
                              break;
                            }
                            return e.abrupt("return");
                          case 3:
                            return e.abrupt("return", t.apply(o, n));
                          case 4:
                          case "end":
                            return e.stop();
                        }
                    },
                    e,
                    this
                  );
                })
              )).apply(this, arguments);
            }
            function u(e) {
              if ("object" !== r(e)) return e;
              switch (e.name) {
                case "AbortException":
                  return new a.AbortException(e.message);
                case "MissingPDFException":
                  return new a.MissingPDFException(e.message);
                case "UnexpectedResponseException":
                  return new a.UnexpectedResponseException(e.message, e.status);
                default:
                  return new a.UnknownErrorException(e.message, e.details);
              }
            }
            function p(e) {
              return !(e instanceof Error) ||
                e instanceof a.AbortException ||
                e instanceof a.MissingPDFException ||
                e instanceof a.UnexpectedResponseException ||
                e instanceof a.UnknownErrorException
                ? e
                : new a.UnknownErrorException(e.message, e.toString());
            }
            function g(e, t, n) {
              t ? e.resolve() : e.reject(n);
            }
            function h(e, t, n) {
              var o = this;
              (this.sourceName = e),
                (this.targetName = t),
                (this.comObj = n),
                (this.callbackId = 1),
                (this.streamId = 1),
                (this.postMessageTransfers = !0),
                (this.streamSinks = Object.create(null)),
                (this.streamControllers = Object.create(null));
              var i = (this.callbacksCapabilities = Object.create(null)),
                a = (this.actionHandler = Object.create(null));
              (this._onComObjOnMessage = function (e) {
                var t = e.data;
                if (t.targetName === o.sourceName)
                  if (t.stream) o._processStreamMessage(t);
                  else if (t.isReply) {
                    var r = t.callbackId;
                    if (!(t.callbackId in i))
                      throw new Error("Cannot resolve callback ".concat(r));
                    var s = i[r];
                    delete i[r],
                      "error" in t ? s.reject(u(t.error)) : s.resolve(t.data);
                  } else {
                    if (!(t.action in a))
                      throw new Error(
                        "Unknown action from worker: ".concat(t.action)
                      );
                    var l = a[t.action];
                    if (t.callbackId) {
                      var c = o.sourceName,
                        d = t.sourceName;
                      Promise.resolve()
                        .then(function () {
                          return l[0].call(l[1], t.data);
                        })
                        .then(
                          function (e) {
                            n.postMessage({
                              sourceName: c,
                              targetName: d,
                              isReply: !0,
                              callbackId: t.callbackId,
                              data: e,
                            });
                          },
                          function (e) {
                            n.postMessage({
                              sourceName: c,
                              targetName: d,
                              isReply: !0,
                              callbackId: t.callbackId,
                              error: p(e),
                            });
                          }
                        );
                    } else
                      t.streamId
                        ? o._createStreamSink(t)
                        : l[0].call(l[1], t.data);
                  }
              }),
                n.addEventListener("message", this._onComObjOnMessage);
            }
            h.prototype = {
              on: function (e, t, n) {
                var o = this.actionHandler;
                if (o[e])
                  throw new Error(
                    'There is already an actionName called "'.concat(e, '"')
                  );
                o[e] = [t, n];
              },
              send: function (e, t, n) {
                var o = {
                  sourceName: this.sourceName,
                  targetName: this.targetName,
                  action: e,
                  data: t,
                };
                this.postMessage(o, n);
              },
              sendWithPromise: function (e, t, n) {
                var o = this.callbackId++,
                  i = {
                    sourceName: this.sourceName,
                    targetName: this.targetName,
                    action: e,
                    data: t,
                    callbackId: o,
                  },
                  r = (0, a.createPromiseCapability)();
                this.callbacksCapabilities[o] = r;
                try {
                  this.postMessage(i, n);
                } catch (e) {
                  r.reject(e);
                }
                return r.promise;
              },
              sendWithStream: function (e, t, n, o) {
                var i = this,
                  r = this.streamId++,
                  s = this.sourceName,
                  l = this.targetName;
                return new a.ReadableStream(
                  {
                    start: function (n) {
                      var o = (0, a.createPromiseCapability)();
                      return (
                        (i.streamControllers[r] = {
                          controller: n,
                          startCall: o,
                          isClosed: !1,
                        }),
                        i.postMessage({
                          sourceName: s,
                          targetName: l,
                          action: e,
                          streamId: r,
                          data: t,
                          desiredSize: n.desiredSize,
                        }),
                        o.promise
                      );
                    },
                    pull: function (e) {
                      var t = (0, a.createPromiseCapability)();
                      return (
                        (i.streamControllers[r].pullCall = t),
                        i.postMessage({
                          sourceName: s,
                          targetName: l,
                          stream: "pull",
                          streamId: r,
                          desiredSize: e.desiredSize,
                        }),
                        t.promise
                      );
                    },
                    cancel: function (e) {
                      var t = (0, a.createPromiseCapability)();
                      return (
                        (i.streamControllers[r].cancelCall = t),
                        (i.streamControllers[r].isClosed = !0),
                        i.postMessage({
                          sourceName: s,
                          targetName: l,
                          stream: "cancel",
                          reason: e,
                          streamId: r,
                        }),
                        t.promise
                      );
                    },
                  },
                  n
                );
              },
              _createStreamSink: function (e) {
                var t = this,
                  n = this,
                  o = this.actionHandler[e.action],
                  i = e.streamId,
                  r = e.desiredSize,
                  s = this.sourceName,
                  l = e.sourceName,
                  d = (0, a.createPromiseCapability)(),
                  u = function (e) {
                    var n = e.stream,
                      o = e.chunk,
                      a = e.transfers,
                      r = e.success,
                      c = e.reason;
                    t.postMessage(
                      {
                        sourceName: s,
                        targetName: l,
                        stream: n,
                        streamId: i,
                        chunk: o,
                        success: r,
                        reason: c,
                      },
                      a
                    );
                  },
                  p = {
                    enqueue: function (e) {
                      var t =
                          arguments.length > 1 && void 0 !== arguments[1]
                            ? arguments[1]
                            : 1,
                        n = arguments.length > 2 ? arguments[2] : void 0;
                      if (!this.isCancelled) {
                        var o = this.desiredSize;
                        (this.desiredSize -= t),
                          o > 0 &&
                            this.desiredSize <= 0 &&
                            ((this.sinkCapability = (0,
                            a.createPromiseCapability)()),
                            (this.ready = this.sinkCapability.promise)),
                          u({ stream: "enqueue", chunk: e, transfers: n });
                      }
                    },
                    close: function () {
                      this.isCancelled ||
                        ((this.isCancelled = !0),
                        u({ stream: "close" }),
                        delete n.streamSinks[i]);
                    },
                    error: function (e) {
                      this.isCancelled ||
                        ((this.isCancelled = !0),
                        u({ stream: "error", reason: e }));
                    },
                    sinkCapability: d,
                    onPull: null,
                    onCancel: null,
                    isCancelled: !1,
                    desiredSize: r,
                    ready: null,
                  };
                p.sinkCapability.resolve(),
                  (p.ready = p.sinkCapability.promise),
                  (this.streamSinks[i] = p),
                  c(o[0], [e.data, p], o[1]).then(
                    function () {
                      u({ stream: "start_complete", success: !0 });
                    },
                    function (e) {
                      u({ stream: "start_complete", success: !1, reason: e });
                    }
                  );
              },
              _processStreamMessage: function (e) {
                var t = this,
                  n = this.sourceName,
                  o = e.sourceName,
                  i = e.streamId,
                  r = function (e) {
                    var a = e.stream,
                      r = e.success,
                      s = e.reason;
                    t.comObj.postMessage({
                      sourceName: n,
                      targetName: o,
                      stream: a,
                      success: r,
                      streamId: i,
                      reason: s,
                    });
                  },
                  s = function () {
                    Promise.all(
                      [
                        t.streamControllers[e.streamId].startCall,
                        t.streamControllers[e.streamId].pullCall,
                        t.streamControllers[e.streamId].cancelCall,
                      ].map(function (e) {
                        return (
                          e &&
                          ((t = e.promise),
                          Promise.resolve(t).catch(function () {}))
                        );
                        var t;
                      })
                    ).then(function () {
                      delete t.streamControllers[e.streamId];
                    });
                  };
                switch (e.stream) {
                  case "start_complete":
                    g(
                      this.streamControllers[e.streamId].startCall,
                      e.success,
                      u(e.reason)
                    );
                    break;
                  case "pull_complete":
                    g(
                      this.streamControllers[e.streamId].pullCall,
                      e.success,
                      u(e.reason)
                    );
                    break;
                  case "pull":
                    if (!this.streamSinks[e.streamId]) {
                      r({ stream: "pull_complete", success: !0 });
                      break;
                    }
                    this.streamSinks[e.streamId].desiredSize <= 0 &&
                      e.desiredSize > 0 &&
                      this.streamSinks[e.streamId].sinkCapability.resolve(),
                      (this.streamSinks[e.streamId].desiredSize =
                        e.desiredSize),
                      c(this.streamSinks[e.streamId].onPull).then(
                        function () {
                          r({ stream: "pull_complete", success: !0 });
                        },
                        function (e) {
                          r({
                            stream: "pull_complete",
                            success: !1,
                            reason: e,
                          });
                        }
                      );
                    break;
                  case "enqueue":
                    (0, a.assert)(
                      this.streamControllers[e.streamId],
                      "enqueue should have stream controller"
                    ),
                      this.streamControllers[e.streamId].isClosed ||
                        this.streamControllers[e.streamId].controller.enqueue(
                          e.chunk
                        );
                    break;
                  case "close":
                    if (
                      ((0, a.assert)(
                        this.streamControllers[e.streamId],
                        "close should have stream controller"
                      ),
                      this.streamControllers[e.streamId].isClosed)
                    )
                      break;
                    (this.streamControllers[e.streamId].isClosed = !0),
                      this.streamControllers[e.streamId].controller.close(),
                      s();
                    break;
                  case "error":
                    (0, a.assert)(
                      this.streamControllers[e.streamId],
                      "error should have stream controller"
                    ),
                      this.streamControllers[e.streamId].controller.error(
                        u(e.reason)
                      ),
                      s();
                    break;
                  case "cancel_complete":
                    g(
                      this.streamControllers[e.streamId].cancelCall,
                      e.success,
                      u(e.reason)
                    ),
                      s();
                    break;
                  case "cancel":
                    if (!this.streamSinks[e.streamId]) break;
                    c(this.streamSinks[e.streamId].onCancel, [
                      u(e.reason),
                    ]).then(
                      function () {
                        r({ stream: "cancel_complete", success: !0 });
                      },
                      function (e) {
                        r({
                          stream: "cancel_complete",
                          success: !1,
                          reason: e,
                        });
                      }
                    ),
                      this.streamSinks[e.streamId].sinkCapability.reject(
                        u(e.reason)
                      ),
                      (this.streamSinks[e.streamId].isCancelled = !0),
                      delete this.streamSinks[e.streamId];
                    break;
                  default:
                    throw new Error("Unexpected stream case");
                }
              },
              postMessage: function (e, t) {
                t && this.postMessageTransfers
                  ? this.comObj.postMessage(e, t)
                  : this.comObj.postMessage(e);
              },
              destroy: function () {
                this.comObj.removeEventListener(
                  "message",
                  this._onComObjOnMessage
                );
              },
            };
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.Metadata = void 0);
            var o = n(1),
              i = n(159);
            function a(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            var r = (function () {
              function e(t) {
                !(function (e, t) {
                  if (!(e instanceof t))
                    throw new TypeError("Cannot call a class as a function");
                })(this, e),
                  (0, o.assert)(
                    "string" == typeof t,
                    "Metadata: input is not a string"
                  ),
                  (t = this._repair(t));
                var n = new i.SimpleXMLParser().parseFromString(t);
                (this._metadata = Object.create(null)), n && this._parse(n);
              }
              var t, n, r;
              return (
                (t = e),
                (n = [
                  {
                    key: "_repair",
                    value: function (e) {
                      return e
                        .replace(/^([^<]+)/, "")
                        .replace(/>\\376\\377([^<]+)/g, function (e, t) {
                          for (
                            var n = t
                                .replace(
                                  /\\([0-3])([0-7])([0-7])/g,
                                  function (e, t, n, o) {
                                    return String.fromCharCode(
                                      64 * t + 8 * n + 1 * o
                                    );
                                  }
                                )
                                .replace(
                                  /&(amp|apos|gt|lt|quot);/g,
                                  function (e, t) {
                                    switch (t) {
                                      case "amp":
                                        return "&";
                                      case "apos":
                                        return "'";
                                      case "gt":
                                        return ">";
                                      case "lt":
                                        return "<";
                                      case "quot":
                                        return '"';
                                    }
                                    throw new Error(
                                      "_repair: ".concat(t, " isn't defined.")
                                    );
                                  }
                                ),
                              o = "",
                              i = 0,
                              a = n.length;
                            i < a;
                            i += 2
                          ) {
                            var r = 256 * n.charCodeAt(i) + n.charCodeAt(i + 1);
                            o +=
                              r >= 32 &&
                              r < 127 &&
                              60 !== r &&
                              62 !== r &&
                              38 !== r
                                ? String.fromCharCode(r)
                                : "&#x" +
                                  (65536 + r).toString(16).substring(1) +
                                  ";";
                          }
                          return ">" + o;
                        });
                    },
                  },
                  {
                    key: "_parse",
                    value: function (e) {
                      var t = e.documentElement;
                      if ("rdf:rdf" !== t.nodeName.toLowerCase())
                        for (
                          t = t.firstChild;
                          t && "rdf:rdf" !== t.nodeName.toLowerCase();

                        )
                          t = t.nextSibling;
                      var n = t ? t.nodeName.toLowerCase() : null;
                      if (t && "rdf:rdf" === n && t.hasChildNodes())
                        for (
                          var o = t.childNodes, i = 0, a = o.length;
                          i < a;
                          i++
                        ) {
                          var r = o[i];
                          if ("rdf:description" === r.nodeName.toLowerCase())
                            for (var s = 0, l = r.childNodes.length; s < l; s++)
                              if (
                                "#text" !==
                                r.childNodes[s].nodeName.toLowerCase()
                              ) {
                                var c = r.childNodes[s],
                                  d = c.nodeName.toLowerCase();
                                this._metadata[d] = c.textContent.trim();
                              }
                        }
                    },
                  },
                  {
                    key: "get",
                    value: function (e) {
                      var t = this._metadata[e];
                      return void 0 !== t ? t : null;
                    },
                  },
                  {
                    key: "getAll",
                    value: function () {
                      return this._metadata;
                    },
                  },
                  {
                    key: "has",
                    value: function (e) {
                      return void 0 !== this._metadata[e];
                    },
                  },
                ]) && a(t.prototype, n),
                r && a(t, r),
                e
              );
            })();
            t.Metadata = r;
          },
          function (e, t, n) {
            "use strict";
            function o(e) {
              return (o =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            function i(e, t) {
              return (
                (function (e) {
                  if (Array.isArray(e)) return e;
                })(e) ||
                (function (e, t) {
                  var n = [],
                    o = !0,
                    i = !1,
                    a = void 0;
                  try {
                    for (
                      var r, s = e[Symbol.iterator]();
                      !(o = (r = s.next()).done) &&
                      (n.push(r.value), !t || n.length !== t);
                      o = !0
                    );
                  } catch (e) {
                    (i = !0), (a = e);
                  } finally {
                    try {
                      o || null == s.return || s.return();
                    } finally {
                      if (i) throw a;
                    }
                  }
                  return n;
                })(e, t) ||
                (function () {
                  throw new TypeError(
                    "Invalid attempt to destructure non-iterable instance"
                  );
                })()
              );
            }
            function a(e, t) {
              return !t || ("object" !== o(t) && "function" != typeof t)
                ? (function (e) {
                    if (void 0 === e)
                      throw new ReferenceError(
                        "this hasn't been initialised - super() hasn't been called"
                      );
                    return e;
                  })(e)
                : t;
            }
            function r(e, t, n) {
              return (r =
                "undefined" != typeof Reflect && Reflect.get
                  ? Reflect.get
                  : function (e, t, n) {
                      var o = (function (e, t) {
                        for (
                          ;
                          !Object.prototype.hasOwnProperty.call(e, t) &&
                          null !== (e = s(e));

                        );
                        return e;
                      })(e, t);
                      if (o) {
                        var i = Object.getOwnPropertyDescriptor(o, t);
                        return i.get ? i.get.call(n) : i.value;
                      }
                    })(e, t, n || e);
            }
            function s(e) {
              return (s = Object.setPrototypeOf
                ? Object.getPrototypeOf
                : function (e) {
                    return e.__proto__ || Object.getPrototypeOf(e);
                  })(e);
            }
            function l(e, t) {
              return (l =
                Object.setPrototypeOf ||
                function (e, t) {
                  return (e.__proto__ = t), e;
                })(e, t);
            }
            function c(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function d(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function u(e, t, n) {
              return t && d(e.prototype, t), n && d(e, n), e;
            }
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.SimpleXMLParser = void 0);
            var p = 0,
              g = -2,
              h = -3,
              f = -4,
              m = -5,
              y = -6,
              v = -9;
            function _(e, t) {
              var n = e[t];
              return " " === n || "\n" === n || "\r" === n || "\t" === n;
            }
            var b = (function () {
                function e() {
                  c(this, e);
                }
                return (
                  u(e, [
                    {
                      key: "_resolveEntities",
                      value: function (e) {
                        var t = this;
                        return e.replace(/&([^;]+);/g, function (e, n) {
                          if ("#x" === n.substring(0, 2))
                            return String.fromCharCode(
                              parseInt(n.substring(2), 16)
                            );
                          if ("#" === n.substring(0, 1))
                            return String.fromCharCode(
                              parseInt(n.substring(1), 10)
                            );
                          switch (n) {
                            case "lt":
                              return "<";
                            case "gt":
                              return ">";
                            case "amp":
                              return "&";
                            case "quot":
                              return '"';
                          }
                          return t.onResolveEntity(n);
                        });
                      },
                    },
                    {
                      key: "_parseContent",
                      value: function (e, t) {
                        var n,
                          o = t,
                          i = [];
                        function a() {
                          for (; o < e.length && _(e, o); ) ++o;
                        }
                        for (
                          ;
                          o < e.length &&
                          !_(e, o) &&
                          ">" !== e[o] &&
                          "/" !== e[o];

                        )
                          ++o;
                        for (
                          n = e.substring(t, o), a();
                          o < e.length &&
                          ">" !== e[o] &&
                          "/" !== e[o] &&
                          "?" !== e[o];

                        ) {
                          a();
                          for (
                            var r, s = "";
                            o < e.length && !_(e, o) && "=" !== e[o];

                          )
                            (s += e[o]), ++o;
                          if ((a(), "=" !== e[o])) return null;
                          ++o, a();
                          var l = e[o];
                          if ('"' !== l && "'" !== l) return null;
                          var c = e.indexOf(l, ++o);
                          if (c < 0) return null;
                          (r = e.substring(o, c)),
                            i.push({
                              name: s,
                              value: this._resolveEntities(r),
                            }),
                            (o = c + 1),
                            a();
                        }
                        return { name: n, attributes: i, parsed: o - t };
                      },
                    },
                    {
                      key: "_parseProcessingInstruction",
                      value: function (e, t) {
                        for (
                          var n, o = t;
                          o < e.length &&
                          !_(e, o) &&
                          ">" !== e[o] &&
                          "/" !== e[o];

                        )
                          ++o;
                        (n = e.substring(t, o)),
                          (function () {
                            for (; o < e.length && _(e, o); ) ++o;
                          })();
                        for (
                          var i = o;
                          o < e.length && ("?" !== e[o] || ">" !== e[o + 1]);

                        )
                          ++o;
                        return {
                          name: n,
                          value: e.substring(i, o),
                          parsed: o - t,
                        };
                      },
                    },
                    {
                      key: "parseXml",
                      value: function (e) {
                        for (var t = 0; t < e.length; ) {
                          var n = t;
                          if ("<" === e[t]) {
                            var o = void 0;
                            switch (e[++n]) {
                              case "/":
                                if ((++n, (o = e.indexOf(">", n)) < 0))
                                  return void this.onError(v);
                                this.onEndElement(e.substring(n, o)),
                                  (n = o + 1);
                                break;
                              case "?":
                                ++n;
                                var i = this._parseProcessingInstruction(e, n);
                                if (
                                  "?>" !==
                                  e.substring(n + i.parsed, n + i.parsed + 2)
                                )
                                  return void this.onError(h);
                                this.onPi(i.name, i.value), (n += i.parsed + 2);
                                break;
                              case "!":
                                if ("--" === e.substring(n + 1, n + 3)) {
                                  if ((o = e.indexOf("--\x3e", n + 3)) < 0)
                                    return void this.onError(m);
                                  this.onComment(e.substring(n + 3, o)),
                                    (n = o + 3);
                                } else if (
                                  "[CDATA[" === e.substring(n + 1, n + 8)
                                ) {
                                  if ((o = e.indexOf("]]>", n + 8)) < 0)
                                    return void this.onError(g);
                                  this.onCdata(e.substring(n + 8, o)),
                                    (n = o + 3);
                                } else {
                                  if ("DOCTYPE" !== e.substring(n + 1, n + 8))
                                    return void this.onError(y);
                                  var a = e.indexOf("[", n + 8),
                                    r = !1;
                                  if ((o = e.indexOf(">", n + 8)) < 0)
                                    return void this.onError(f);
                                  if (a > 0 && o > a) {
                                    if ((o = e.indexOf("]>", n + 8)) < 0)
                                      return void this.onError(f);
                                    r = !0;
                                  }
                                  var s = e.substring(n + 8, o + (r ? 1 : 0));
                                  this.onDoctype(s), (n = o + (r ? 2 : 1));
                                }
                                break;
                              default:
                                var l = this._parseContent(e, n);
                                if (null === l) return void this.onError(y);
                                var c = !1;
                                if (
                                  "/>" ===
                                  e.substring(n + l.parsed, n + l.parsed + 2)
                                )
                                  c = !0;
                                else if (
                                  ">" !==
                                  e.substring(n + l.parsed, n + l.parsed + 1)
                                )
                                  return void this.onError(v);
                                this.onBeginElement(l.name, l.attributes, c),
                                  (n += l.parsed + (c ? 2 : 1));
                            }
                          } else {
                            for (; n < e.length && "<" !== e[n]; ) n++;
                            var d = e.substring(t, n);
                            this.onText(this._resolveEntities(d));
                          }
                          t = n;
                        }
                      },
                    },
                    {
                      key: "onResolveEntity",
                      value: function (e) {
                        return "&".concat(e, ";");
                      },
                    },
                    { key: "onPi", value: function (e, t) {} },
                    { key: "onComment", value: function (e) {} },
                    { key: "onCdata", value: function (e) {} },
                    { key: "onDoctype", value: function (e) {} },
                    { key: "onText", value: function (e) {} },
                    { key: "onBeginElement", value: function (e, t, n) {} },
                    { key: "onEndElement", value: function (e) {} },
                    { key: "onError", value: function (e) {} },
                  ]),
                  e
                );
              })(),
              w = (function () {
                function e(t, n) {
                  c(this, e),
                    (this.nodeName = t),
                    (this.nodeValue = n),
                    Object.defineProperty(this, "parentNode", {
                      value: null,
                      writable: !0,
                    });
                }
                return (
                  u(e, [
                    {
                      key: "hasChildNodes",
                      value: function () {
                        return this.childNodes && this.childNodes.length > 0;
                      },
                    },
                    {
                      key: "firstChild",
                      get: function () {
                        return this.childNodes && this.childNodes[0];
                      },
                    },
                    {
                      key: "nextSibling",
                      get: function () {
                        var e = this.parentNode.childNodes;
                        if (e) {
                          var t = e.indexOf(this);
                          if (-1 !== t) return e[t + 1];
                        }
                      },
                    },
                    {
                      key: "textContent",
                      get: function () {
                        return this.childNodes
                          ? this.childNodes
                              .map(function (e) {
                                return e.textContent;
                              })
                              .join("")
                          : this.nodeValue || "";
                      },
                    },
                  ]),
                  e
                );
              })(),
              C = (function (e) {
                function t() {
                  var e;
                  return (
                    c(this, t),
                    ((e = a(this, s(t).call(this)))._currentFragment = null),
                    (e._stack = null),
                    (e._errorCode = p),
                    e
                  );
                }
                return (
                  (function (e, t) {
                    if ("function" != typeof t && null !== t)
                      throw new TypeError(
                        "Super expression must either be null or a function"
                      );
                    (e.prototype = Object.create(t && t.prototype, {
                      constructor: { value: e, writable: !0, configurable: !0 },
                    })),
                      t && l(e, t);
                  })(t, e),
                  u(t, [
                    {
                      key: "parseFromString",
                      value: function (e) {
                        if (
                          ((this._currentFragment = []),
                          (this._stack = []),
                          (this._errorCode = p),
                          this.parseXml(e),
                          this._errorCode === p)
                        ) {
                          var t = i(this._currentFragment, 1)[0];
                          if (t) return { documentElement: t };
                        }
                      },
                    },
                    {
                      key: "onResolveEntity",
                      value: function (e) {
                        switch (e) {
                          case "apos":
                            return "'";
                        }
                        return r(s(t.prototype), "onResolveEntity", this).call(
                          this,
                          e
                        );
                      },
                    },
                    {
                      key: "onText",
                      value: function (e) {
                        if (
                          !(function (e) {
                            for (var t = 0, n = e.length; t < n; t++)
                              if (!_(e, t)) return !1;
                            return !0;
                          })(e)
                        ) {
                          var t = new w("#text", e);
                          this._currentFragment.push(t);
                        }
                      },
                    },
                    {
                      key: "onCdata",
                      value: function (e) {
                        var t = new w("#text", e);
                        this._currentFragment.push(t);
                      },
                    },
                    {
                      key: "onBeginElement",
                      value: function (e, t, n) {
                        var o = new w(e);
                        (o.childNodes = []),
                          this._currentFragment.push(o),
                          n ||
                            (this._stack.push(this._currentFragment),
                            (this._currentFragment = o.childNodes));
                      },
                    },
                    {
                      key: "onEndElement",
                      value: function (e) {
                        this._currentFragment = this._stack.pop() || [];
                        var t =
                          this._currentFragment[
                            this._currentFragment.length - 1
                          ];
                        if (t)
                          for (var n = 0, o = t.childNodes.length; n < o; n++)
                            t.childNodes[n].parentNode = t;
                      },
                    },
                    {
                      key: "onError",
                      value: function (e) {
                        this._errorCode = e;
                      },
                    },
                  ]),
                  t
                );
              })(b);
            t.SimpleXMLParser = C;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.PDFDataTransportStream = void 0);
            var o,
              i = (o = n(147)) && o.__esModule ? o : { default: o },
              a = n(1);
            function r(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function s(e) {
              return function () {
                var t = this,
                  n = arguments;
                return new Promise(function (o, i) {
                  var a = e.apply(t, n);
                  function s(e) {
                    r(a, o, i, s, l, "next", e);
                  }
                  function l(e) {
                    r(a, o, i, s, l, "throw", e);
                  }
                  s(void 0);
                });
              };
            }
            var l = (function () {
              function e(e, t) {
                var n = this;
                (0, a.assert)(t), (this._queuedChunks = []);
                var o = e.initialData;
                if (o && o.length > 0) {
                  var i = new Uint8Array(o).buffer;
                  this._queuedChunks.push(i);
                }
                (this._pdfDataRangeTransport = t),
                  (this._isStreamingSupported = !e.disableStream),
                  (this._isRangeSupported = !e.disableRange),
                  (this._contentLength = e.length),
                  (this._fullRequestReader = null),
                  (this._rangeReaders = []),
                  this._pdfDataRangeTransport.addRangeListener(function (e, t) {
                    n._onReceiveData({ begin: e, chunk: t });
                  }),
                  this._pdfDataRangeTransport.addProgressListener(function (e) {
                    n._onProgress({ loaded: e });
                  }),
                  this._pdfDataRangeTransport.addProgressiveReadListener(
                    function (e) {
                      n._onReceiveData({ chunk: e });
                    }
                  ),
                  this._pdfDataRangeTransport.transportReady();
              }
              function t(e, t) {
                (this._stream = e),
                  (this._done = !1),
                  (this._filename = null),
                  (this._queuedChunks = t || []),
                  (this._requests = []),
                  (this._headersReady = Promise.resolve()),
                  (e._fullRequestReader = this),
                  (this.onProgress = null);
              }
              var n, o;
              function r(e, t, n) {
                (this._stream = e),
                  (this._begin = t),
                  (this._end = n),
                  (this._queuedChunk = null),
                  (this._requests = []),
                  (this._done = !1),
                  (this.onProgress = null);
              }
              return (
                (e.prototype = {
                  _onReceiveData: function (e) {
                    var t = new Uint8Array(e.chunk).buffer;
                    if (void 0 === e.begin)
                      this._fullRequestReader
                        ? this._fullRequestReader._enqueue(t)
                        : this._queuedChunks.push(t);
                    else {
                      var n = this._rangeReaders.some(function (n) {
                        return n._begin === e.begin && (n._enqueue(t), !0);
                      });
                      (0, a.assert)(n);
                    }
                  },
                  _onProgress: function (e) {
                    if (this._rangeReaders.length > 0) {
                      var t = this._rangeReaders[0];
                      t.onProgress && t.onProgress({ loaded: e.loaded });
                    }
                  },
                  _removeRangeReader: function (e) {
                    var t = this._rangeReaders.indexOf(e);
                    t >= 0 && this._rangeReaders.splice(t, 1);
                  },
                  getFullReader: function () {
                    (0, a.assert)(!this._fullRequestReader);
                    var e = this._queuedChunks;
                    return (this._queuedChunks = null), new t(this, e);
                  },
                  getRangeReader: function (e, t) {
                    var n = new r(this, e, t);
                    return (
                      this._pdfDataRangeTransport.requestDataRange(e, t),
                      this._rangeReaders.push(n),
                      n
                    );
                  },
                  cancelAllRequests: function (e) {
                    this._fullRequestReader &&
                      this._fullRequestReader.cancel(e),
                      this._rangeReaders.slice(0).forEach(function (t) {
                        t.cancel(e);
                      }),
                      this._pdfDataRangeTransport.abort();
                  },
                }),
                (t.prototype = {
                  _enqueue: function (e) {
                    this._done ||
                      (this._requests.length > 0
                        ? this._requests.shift().resolve({ value: e, done: !1 })
                        : this._queuedChunks.push(e));
                  },
                  get headersReady() {
                    return this._headersReady;
                  },
                  get filename() {
                    return this._filename;
                  },
                  get isRangeSupported() {
                    return this._stream._isRangeSupported;
                  },
                  get isStreamingSupported() {
                    return this._stream._isStreamingSupported;
                  },
                  get contentLength() {
                    return this._stream._contentLength;
                  },
                  read:
                    ((n = s(
                      i.default.mark(function e() {
                        var t, n;
                        return i.default.wrap(
                          function (e) {
                            for (;;)
                              switch ((e.prev = e.next)) {
                                case 0:
                                  if (!(this._queuedChunks.length > 0)) {
                                    e.next = 3;
                                    break;
                                  }
                                  return (
                                    (t = this._queuedChunks.shift()),
                                    e.abrupt("return", { value: t, done: !1 })
                                  );
                                case 3:
                                  if (!this._done) {
                                    e.next = 5;
                                    break;
                                  }
                                  return e.abrupt("return", {
                                    value: void 0,
                                    done: !0,
                                  });
                                case 5:
                                  return (
                                    (n = (0, a.createPromiseCapability)()),
                                    this._requests.push(n),
                                    e.abrupt("return", n.promise)
                                  );
                                case 8:
                                case "end":
                                  return e.stop();
                              }
                          },
                          e,
                          this
                        );
                      })
                    )),
                    function () {
                      return n.apply(this, arguments);
                    }),
                  cancel: function (e) {
                    (this._done = !0),
                      this._requests.forEach(function (e) {
                        e.resolve({ value: void 0, done: !0 });
                      }),
                      (this._requests = []);
                  },
                }),
                (r.prototype = {
                  _enqueue: function (e) {
                    this._done ||
                      (0 === this._requests.length
                        ? (this._queuedChunk = e)
                        : (this._requests
                            .shift()
                            .resolve({ value: e, done: !1 }),
                          this._requests.forEach(function (e) {
                            e.resolve({ value: void 0, done: !0 });
                          }),
                          (this._requests = [])),
                      (this._done = !0),
                      this._stream._removeRangeReader(this));
                  },
                  get isStreamingSupported() {
                    return !1;
                  },
                  read:
                    ((o = s(
                      i.default.mark(function e() {
                        var t, n;
                        return i.default.wrap(
                          function (e) {
                            for (;;)
                              switch ((e.prev = e.next)) {
                                case 0:
                                  if (!this._queuedChunk) {
                                    e.next = 4;
                                    break;
                                  }
                                  return (
                                    (t = this._queuedChunk),
                                    (this._queuedChunk = null),
                                    e.abrupt("return", { value: t, done: !1 })
                                  );
                                case 4:
                                  if (!this._done) {
                                    e.next = 6;
                                    break;
                                  }
                                  return e.abrupt("return", {
                                    value: void 0,
                                    done: !0,
                                  });
                                case 6:
                                  return (
                                    (n = (0, a.createPromiseCapability)()),
                                    this._requests.push(n),
                                    e.abrupt("return", n.promise)
                                  );
                                case 9:
                                case "end":
                                  return e.stop();
                              }
                          },
                          e,
                          this
                        );
                      })
                    )),
                    function () {
                      return o.apply(this, arguments);
                    }),
                  cancel: function (e) {
                    (this._done = !0),
                      this._requests.forEach(function (e) {
                        e.resolve({ value: void 0, done: !0 });
                      }),
                      (this._requests = []),
                      this._stream._removeRangeReader(this);
                  },
                }),
                e
              );
            })();
            t.PDFDataTransportStream = l;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.WebGLContext = void 0);
            var o = n(1);
            function i(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            var a = (function () {
              function e(t) {
                var n = t.enable,
                  o = void 0 !== n && n;
                !(function (e, t) {
                  if (!(e instanceof t))
                    throw new TypeError("Cannot call a class as a function");
                })(this, e),
                  (this._enabled = !0 === o);
              }
              var t, n, a;
              return (
                (t = e),
                (n = [
                  {
                    key: "composeSMask",
                    value: function (e) {
                      var t = e.layer,
                        n = e.mask,
                        o = e.properties;
                      return r.composeSMask(t, n, o);
                    },
                  },
                  {
                    key: "drawFigures",
                    value: function (e) {
                      var t = e.width,
                        n = e.height,
                        o = e.backgroundColor,
                        i = e.figures,
                        a = e.context;
                      return r.drawFigures(t, n, o, i, a);
                    },
                  },
                  {
                    key: "clear",
                    value: function () {
                      r.cleanup();
                    },
                  },
                  {
                    key: "isEnabled",
                    get: function () {
                      var e = this._enabled;
                      return (
                        e && (e = r.tryInitGL()),
                        (0, o.shadow)(this, "isEnabled", e)
                      );
                    },
                  },
                ]) && i(t.prototype, n),
                a && i(t, a),
                e
              );
            })();
            t.WebGLContext = a;
            var r = (function () {
              function e(e, t, n) {
                var o = e.createShader(n);
                if (
                  (e.shaderSource(o, t),
                  e.compileShader(o),
                  !e.getShaderParameter(o, e.COMPILE_STATUS))
                ) {
                  var i = e.getShaderInfoLog(o);
                  throw new Error("Error during shader compilation: " + i);
                }
                return o;
              }
              function t(t, n) {
                return e(t, n, t.VERTEX_SHADER);
              }
              function n(t, n) {
                return e(t, n, t.FRAGMENT_SHADER);
              }
              function o(e, t) {
                for (var n = e.createProgram(), o = 0, i = t.length; o < i; ++o)
                  e.attachShader(n, t[o]);
                if (
                  (e.linkProgram(n), !e.getProgramParameter(n, e.LINK_STATUS))
                ) {
                  var a = e.getProgramInfoLog(n);
                  throw new Error("Error during program linking: " + a);
                }
                return n;
              }
              function i(e, t, n) {
                e.activeTexture(n);
                var o = e.createTexture();
                return (
                  e.bindTexture(e.TEXTURE_2D, o),
                  e.texParameteri(
                    e.TEXTURE_2D,
                    e.TEXTURE_WRAP_S,
                    e.CLAMP_TO_EDGE
                  ),
                  e.texParameteri(
                    e.TEXTURE_2D,
                    e.TEXTURE_WRAP_T,
                    e.CLAMP_TO_EDGE
                  ),
                  e.texParameteri(
                    e.TEXTURE_2D,
                    e.TEXTURE_MIN_FILTER,
                    e.NEAREST
                  ),
                  e.texParameteri(
                    e.TEXTURE_2D,
                    e.TEXTURE_MAG_FILTER,
                    e.NEAREST
                  ),
                  e.texImage2D(
                    e.TEXTURE_2D,
                    0,
                    e.RGBA,
                    e.RGBA,
                    e.UNSIGNED_BYTE,
                    t
                  ),
                  o
                );
              }
              var a, r;
              function s() {
                a ||
                  ((r = document.createElement("canvas")),
                  (a = r.getContext("webgl", { premultipliedalpha: !1 })));
              }
              var l = null,
                c = null;
              return {
                tryInitGL: function () {
                  try {
                    return s(), !!a;
                  } catch (e) {}
                  return !1;
                },
                composeSMask: function (e, c, d) {
                  var u = e.width,
                    p = e.height;
                  l ||
                    (function () {
                      var e, i;
                      s(), (e = r), (r = null), (i = a), (a = null);
                      var c = o(i, [
                        t(
                          i,
                          "  attribute vec2 a_position;                                      attribute vec2 a_texCoord;                                                                                                      uniform vec2 u_resolution;                                                                                                      varying vec2 v_texCoord;                                                                                                        void main() {                                                     vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;       gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);                                                                              v_texCoord = a_texCoord;                                      }                                                             "
                        ),
                        n(
                          i,
                          "  precision mediump float;                                                                                                        uniform vec4 u_backdrop;                                        uniform int u_subtype;                                          uniform sampler2D u_image;                                      uniform sampler2D u_mask;                                                                                                       varying vec2 v_texCoord;                                                                                                        void main() {                                                     vec4 imageColor = texture2D(u_image, v_texCoord);               vec4 maskColor = texture2D(u_mask, v_texCoord);                 if (u_backdrop.a > 0.0) {                                         maskColor.rgb = maskColor.rgb * maskColor.a +                                   u_backdrop.rgb * (1.0 - maskColor.a);         }                                                               float lum;                                                      if (u_subtype == 0) {                                             lum = maskColor.a;                                            } else {                                                          lum = maskColor.r * 0.3 + maskColor.g * 0.59 +                        maskColor.b * 0.11;                                     }                                                               imageColor.a *= lum;                                            imageColor.rgb *= imageColor.a;                                 gl_FragColor = imageColor;                                    }                                                             "
                        ),
                      ]);
                      i.useProgram(c);
                      var d = {};
                      (d.gl = i),
                        (d.canvas = e),
                        (d.resolutionLocation = i.getUniformLocation(
                          c,
                          "u_resolution"
                        )),
                        (d.positionLocation = i.getAttribLocation(
                          c,
                          "a_position"
                        )),
                        (d.backdropLocation = i.getUniformLocation(
                          c,
                          "u_backdrop"
                        )),
                        (d.subtypeLocation = i.getUniformLocation(
                          c,
                          "u_subtype"
                        ));
                      var u = i.getAttribLocation(c, "a_texCoord"),
                        p = i.getUniformLocation(c, "u_image"),
                        g = i.getUniformLocation(c, "u_mask"),
                        h = i.createBuffer();
                      i.bindBuffer(i.ARRAY_BUFFER, h),
                        i.bufferData(
                          i.ARRAY_BUFFER,
                          new Float32Array([
                            0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1,
                          ]),
                          i.STATIC_DRAW
                        ),
                        i.enableVertexAttribArray(u),
                        i.vertexAttribPointer(u, 2, i.FLOAT, !1, 0, 0),
                        i.uniform1i(p, 0),
                        i.uniform1i(g, 1),
                        (l = d);
                    })();
                  var g = l,
                    h = g.canvas,
                    f = g.gl;
                  (h.width = u),
                    (h.height = p),
                    f.viewport(
                      0,
                      0,
                      f.drawingBufferWidth,
                      f.drawingBufferHeight
                    ),
                    f.uniform2f(g.resolutionLocation, u, p),
                    d.backdrop
                      ? f.uniform4f(
                          g.resolutionLocation,
                          d.backdrop[0],
                          d.backdrop[1],
                          d.backdrop[2],
                          1
                        )
                      : f.uniform4f(g.resolutionLocation, 0, 0, 0, 0),
                    f.uniform1i(
                      g.subtypeLocation,
                      "Luminosity" === d.subtype ? 1 : 0
                    );
                  var m = i(f, e, f.TEXTURE0),
                    y = i(f, c, f.TEXTURE1),
                    v = f.createBuffer();
                  return (
                    f.bindBuffer(f.ARRAY_BUFFER, v),
                    f.bufferData(
                      f.ARRAY_BUFFER,
                      new Float32Array([0, 0, u, 0, 0, p, 0, p, u, 0, u, p]),
                      f.STATIC_DRAW
                    ),
                    f.enableVertexAttribArray(g.positionLocation),
                    f.vertexAttribPointer(
                      g.positionLocation,
                      2,
                      f.FLOAT,
                      !1,
                      0,
                      0
                    ),
                    f.clearColor(0, 0, 0, 0),
                    f.enable(f.BLEND),
                    f.blendFunc(f.ONE, f.ONE_MINUS_SRC_ALPHA),
                    f.clear(f.COLOR_BUFFER_BIT),
                    f.drawArrays(f.TRIANGLES, 0, 6),
                    f.flush(),
                    f.deleteTexture(m),
                    f.deleteTexture(y),
                    f.deleteBuffer(v),
                    h
                  );
                },
                drawFigures: function (e, i, l, d, u) {
                  c ||
                    (function () {
                      var e, i;
                      s(), (e = r), (r = null), (i = a), (a = null);
                      var l = o(i, [
                        t(
                          i,
                          "  attribute vec2 a_position;                                      attribute vec3 a_color;                                                                                                         uniform vec2 u_resolution;                                      uniform vec2 u_scale;                                           uniform vec2 u_offset;                                                                                                          varying vec4 v_color;                                                                                                           void main() {                                                     vec2 position = (a_position + u_offset) * u_scale;              vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;         gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);                                                                              v_color = vec4(a_color / 255.0, 1.0);                         }                                                             "
                        ),
                        n(
                          i,
                          "  precision mediump float;                                                                                                        varying vec4 v_color;                                                                                                           void main() {                                                     gl_FragColor = v_color;                                       }                                                             "
                        ),
                      ]);
                      i.useProgram(l);
                      var d = {};
                      (d.gl = i),
                        (d.canvas = e),
                        (d.resolutionLocation = i.getUniformLocation(
                          l,
                          "u_resolution"
                        )),
                        (d.scaleLocation = i.getUniformLocation(l, "u_scale")),
                        (d.offsetLocation = i.getUniformLocation(
                          l,
                          "u_offset"
                        )),
                        (d.positionLocation = i.getAttribLocation(
                          l,
                          "a_position"
                        )),
                        (d.colorLocation = i.getAttribLocation(l, "a_color")),
                        (c = d);
                    })();
                  var p = c,
                    g = p.canvas,
                    h = p.gl;
                  (g.width = e),
                    (g.height = i),
                    h.viewport(
                      0,
                      0,
                      h.drawingBufferWidth,
                      h.drawingBufferHeight
                    ),
                    h.uniform2f(p.resolutionLocation, e, i);
                  var f,
                    m,
                    y,
                    v = 0;
                  for (f = 0, m = d.length; f < m; f++)
                    switch (d[f].type) {
                      case "lattice":
                        v +=
                          ((y =
                            (d[f].coords.length / d[f].verticesPerRow) | 0) -
                            1) *
                          (d[f].verticesPerRow - 1) *
                          6;
                        break;
                      case "triangles":
                        v += d[f].coords.length;
                    }
                  var _ = new Float32Array(2 * v),
                    b = new Uint8Array(3 * v),
                    w = u.coords,
                    C = u.colors,
                    x = 0,
                    S = 0;
                  for (f = 0, m = d.length; f < m; f++) {
                    var E = d[f],
                      A = E.coords,
                      T = E.colors;
                    switch (E.type) {
                      case "lattice":
                        var G = E.verticesPerRow;
                        y = (A.length / G) | 0;
                        for (var P = 1; P < y; P++)
                          for (var D = P * G + 1, L = 1; L < G; L++, D++)
                            (_[x] = w[A[D - G - 1]]),
                              (_[x + 1] = w[A[D - G - 1] + 1]),
                              (_[x + 2] = w[A[D - G]]),
                              (_[x + 3] = w[A[D - G] + 1]),
                              (_[x + 4] = w[A[D - 1]]),
                              (_[x + 5] = w[A[D - 1] + 1]),
                              (b[S] = C[T[D - G - 1]]),
                              (b[S + 1] = C[T[D - G - 1] + 1]),
                              (b[S + 2] = C[T[D - G - 1] + 2]),
                              (b[S + 3] = C[T[D - G]]),
                              (b[S + 4] = C[T[D - G] + 1]),
                              (b[S + 5] = C[T[D - G] + 2]),
                              (b[S + 6] = C[T[D - 1]]),
                              (b[S + 7] = C[T[D - 1] + 1]),
                              (b[S + 8] = C[T[D - 1] + 2]),
                              (_[x + 6] = _[x + 2]),
                              (_[x + 7] = _[x + 3]),
                              (_[x + 8] = _[x + 4]),
                              (_[x + 9] = _[x + 5]),
                              (_[x + 10] = w[A[D]]),
                              (_[x + 11] = w[A[D] + 1]),
                              (b[S + 9] = b[S + 3]),
                              (b[S + 10] = b[S + 4]),
                              (b[S + 11] = b[S + 5]),
                              (b[S + 12] = b[S + 6]),
                              (b[S + 13] = b[S + 7]),
                              (b[S + 14] = b[S + 8]),
                              (b[S + 15] = C[T[D]]),
                              (b[S + 16] = C[T[D] + 1]),
                              (b[S + 17] = C[T[D] + 2]),
                              (x += 12),
                              (S += 18);
                        break;
                      case "triangles":
                        for (var I = 0, k = A.length; I < k; I++)
                          (_[x] = w[A[I]]),
                            (_[x + 1] = w[A[I] + 1]),
                            (b[S] = C[T[I]]),
                            (b[S + 1] = C[T[I] + 1]),
                            (b[S + 2] = C[T[I] + 2]),
                            (x += 2),
                            (S += 3);
                    }
                  }
                  l
                    ? h.clearColor(l[0] / 255, l[1] / 255, l[2] / 255, 1)
                    : h.clearColor(0, 0, 0, 0),
                    h.clear(h.COLOR_BUFFER_BIT);
                  var O = h.createBuffer();
                  h.bindBuffer(h.ARRAY_BUFFER, O),
                    h.bufferData(h.ARRAY_BUFFER, _, h.STATIC_DRAW),
                    h.enableVertexAttribArray(p.positionLocation),
                    h.vertexAttribPointer(
                      p.positionLocation,
                      2,
                      h.FLOAT,
                      !1,
                      0,
                      0
                    );
                  var F = h.createBuffer();
                  return (
                    h.bindBuffer(h.ARRAY_BUFFER, F),
                    h.bufferData(h.ARRAY_BUFFER, b, h.STATIC_DRAW),
                    h.enableVertexAttribArray(p.colorLocation),
                    h.vertexAttribPointer(
                      p.colorLocation,
                      3,
                      h.UNSIGNED_BYTE,
                      !1,
                      0,
                      0
                    ),
                    h.uniform2f(p.scaleLocation, u.scaleX, u.scaleY),
                    h.uniform2f(p.offsetLocation, u.offsetX, u.offsetY),
                    h.drawArrays(h.TRIANGLES, 0, v),
                    h.flush(),
                    h.deleteBuffer(O),
                    h.deleteBuffer(F),
                    g
                  );
                },
                cleanup: function () {
                  l &&
                    l.canvas &&
                    ((l.canvas.width = 0), (l.canvas.height = 0)),
                    c &&
                      c.canvas &&
                      ((c.canvas.width = 0), (c.canvas.height = 0)),
                    (l = null),
                    (c = null);
                },
              };
            })();
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.renderTextLayer = void 0);
            var o,
              i = n(1),
              a = (o = n(3)) && o.__esModule ? o : { default: o },
              r = (function () {
                var e = /\S/,
                  t = [
                    "left: ",
                    0,
                    "px; top: ",
                    0,
                    "px; font-size: ",
                    0,
                    "px; font-family: ",
                    "",
                    ";",
                  ];
                function n(n, o, a) {
                  var r,
                    s = document.createElement("span"),
                    l = {
                      style: null,
                      angle: 0,
                      canvasWidth: 0,
                      isWhitespace: !1,
                      originalTransform: null,
                      paddingBottom: 0,
                      paddingLeft: 0,
                      paddingRight: 0,
                      paddingTop: 0,
                      scale: 1,
                    };
                  if ((n._textDivs.push(s), (r = o.str), !e.test(r)))
                    return (
                      (l.isWhitespace = !0), void n._textDivProperties.set(s, l)
                    );
                  var c = i.Util.transform(n._viewport.transform, o.transform),
                    d = Math.atan2(c[1], c[0]),
                    u = a[o.fontName];
                  u.vertical && (d += Math.PI / 2);
                  var p,
                    g,
                    h = Math.sqrt(c[2] * c[2] + c[3] * c[3]),
                    f = h;
                  if (
                    (u.ascent
                      ? (f = u.ascent * f)
                      : u.descent && (f = (1 + u.descent) * f),
                    0 === d
                      ? ((p = c[4]), (g = c[5] - f))
                      : ((p = c[4] + f * Math.sin(d)),
                        (g = c[5] - f * Math.cos(d))),
                    (t[1] = p),
                    (t[3] = g),
                    (t[5] = h),
                    (t[7] = u.fontFamily),
                    (l.style = t.join("")),
                    s.setAttribute("style", l.style),
                    (s.textContent = o.str),
                    n._fontInspectorEnabled &&
                      (s.dataset.fontName = o.fontName),
                    0 !== d && (l.angle = d * (180 / Math.PI)),
                    o.str.length > 1 &&
                      (u.vertical
                        ? (l.canvasWidth = o.height * n._viewport.scale)
                        : (l.canvasWidth = o.width * n._viewport.scale)),
                    n._textDivProperties.set(s, l),
                    n._textContentStream && n._layoutText(s),
                    n._enhanceTextSelection)
                  ) {
                    var m = 1,
                      y = 0;
                    0 !== d && ((m = Math.cos(d)), (y = Math.sin(d)));
                    var v,
                      _,
                      b = (u.vertical ? o.height : o.width) * n._viewport.scale,
                      w = h;
                    0 !== d
                      ? ((v = [m, y, -y, m, p, g]),
                        (_ = i.Util.getAxialAlignedBoundingBox(
                          [0, 0, b, w],
                          v
                        )))
                      : (_ = [p, g, p + b, g + w]),
                      n._bounds.push({
                        left: _[0],
                        top: _[1],
                        right: _[2],
                        bottom: _[3],
                        div: s,
                        size: [b, w],
                        m: v,
                      });
                  }
                }
                function o(e) {
                  if (!e._canceled) {
                    var t = e._textDivs,
                      n = e._capability,
                      o = t.length;
                    if (o > 1e5)
                      return (e._renderingDone = !0), void n.resolve();
                    if (!e._textContentStream)
                      for (var i = 0; i < o; i++) e._layoutText(t[i]);
                    (e._renderingDone = !0), n.resolve();
                  }
                }
                function r(e) {
                  for (
                    var t = e._bounds,
                      n = e._viewport,
                      o = (function (e, t, n) {
                        var o = n.map(function (e, t) {
                          return {
                            x1: e.left,
                            y1: e.top,
                            x2: e.right,
                            y2: e.bottom,
                            index: t,
                            x1New: void 0,
                            x2New: void 0,
                          };
                        });
                        s(e, o);
                        var i = new Array(n.length);
                        return (
                          o.forEach(function (e) {
                            var t = e.index;
                            i[t] = {
                              left: e.x1New,
                              top: 0,
                              right: e.x2New,
                              bottom: 0,
                            };
                          }),
                          n.map(function (t, n) {
                            var a = i[n],
                              r = o[n];
                            (r.x1 = t.top),
                              (r.y1 = e - a.right),
                              (r.x2 = t.bottom),
                              (r.y2 = e - a.left),
                              (r.index = n),
                              (r.x1New = void 0),
                              (r.x2New = void 0);
                          }),
                          s(t, o),
                          o.forEach(function (e) {
                            var t = e.index;
                            (i[t].top = e.x1New), (i[t].bottom = e.x2New);
                          }),
                          i
                        );
                      })(n.width, n.height, t),
                      a = 0;
                    a < o.length;
                    a++
                  ) {
                    var r = t[a].div,
                      l = e._textDivProperties.get(r);
                    if (0 !== l.angle) {
                      var c = o[a],
                        d = t[a],
                        u = d.m,
                        p = u[0],
                        g = u[1],
                        h = [[0, 0], [0, d.size[1]], [d.size[0], 0], d.size],
                        f = new Float64Array(64);
                      h.forEach(function (e, t) {
                        var n = i.Util.applyTransform(e, u);
                        (f[t + 0] = p && (c.left - n[0]) / p),
                          (f[t + 4] = g && (c.top - n[1]) / g),
                          (f[t + 8] = p && (c.right - n[0]) / p),
                          (f[t + 12] = g && (c.bottom - n[1]) / g),
                          (f[t + 16] = g && (c.left - n[0]) / -g),
                          (f[t + 20] = p && (c.top - n[1]) / p),
                          (f[t + 24] = g && (c.right - n[0]) / -g),
                          (f[t + 28] = p && (c.bottom - n[1]) / p),
                          (f[t + 32] = p && (c.left - n[0]) / -p),
                          (f[t + 36] = g && (c.top - n[1]) / -g),
                          (f[t + 40] = p && (c.right - n[0]) / -p),
                          (f[t + 44] = g && (c.bottom - n[1]) / -g),
                          (f[t + 48] = g && (c.left - n[0]) / g),
                          (f[t + 52] = p && (c.top - n[1]) / -p),
                          (f[t + 56] = g && (c.right - n[0]) / g),
                          (f[t + 60] = p && (c.bottom - n[1]) / -p);
                      });
                      var m = function (e, t, n) {
                          for (var o = 0, i = 0; i < n; i++) {
                            var a = e[t++];
                            a > 0 && (o = o ? Math.min(a, o) : a);
                          }
                          return o;
                        },
                        y = 1 + Math.min(Math.abs(p), Math.abs(g));
                      (l.paddingLeft = m(f, 32, 16) / y),
                        (l.paddingTop = m(f, 48, 16) / y),
                        (l.paddingRight = m(f, 0, 16) / y),
                        (l.paddingBottom = m(f, 16, 16) / y),
                        e._textDivProperties.set(r, l);
                    } else
                      (l.paddingLeft = t[a].left - o[a].left),
                        (l.paddingTop = t[a].top - o[a].top),
                        (l.paddingRight = o[a].right - t[a].right),
                        (l.paddingBottom = o[a].bottom - t[a].bottom),
                        e._textDivProperties.set(r, l);
                  }
                }
                function s(e, t) {
                  t.sort(function (e, t) {
                    return e.x1 - t.x1 || e.index - t.index;
                  });
                  var n = [
                    {
                      start: -1 / 0,
                      end: 1 / 0,
                      boundary: {
                        x1: -1 / 0,
                        y1: -1 / 0,
                        x2: 0,
                        y2: 1 / 0,
                        index: -1,
                        x1New: 0,
                        x2New: 0,
                      },
                    },
                  ];
                  t.forEach(function (e) {
                    for (var t = 0; t < n.length && n[t].end <= e.y1; ) t++;
                    for (
                      var o, i, a = n.length - 1;
                      a >= 0 && n[a].start >= e.y2;

                    )
                      a--;
                    var r,
                      s,
                      l = -1 / 0;
                    for (r = t; r <= a; r++) {
                      var c;
                      (c =
                        (i = (o = n[r]).boundary).x2 > e.x1
                          ? i.index > e.index
                            ? i.x1New
                            : e.x1
                          : void 0 === i.x2New
                          ? (i.x2 + e.x1) / 2
                          : i.x2New) > l && (l = c);
                    }
                    for (e.x1New = l, r = t; r <= a; r++)
                      void 0 === (i = (o = n[r]).boundary).x2New
                        ? i.x2 > e.x1
                          ? i.index > e.index && (i.x2New = i.x2)
                          : (i.x2New = l)
                        : i.x2New > l && (i.x2New = Math.max(l, i.x2));
                    var d = [],
                      u = null;
                    for (r = t; r <= a; r++) {
                      var p = (i = (o = n[r]).boundary).x2 > e.x2 ? i : e;
                      u === p
                        ? (d[d.length - 1].end = o.end)
                        : (d.push({ start: o.start, end: o.end, boundary: p }),
                          (u = p));
                    }
                    for (
                      n[t].start < e.y1 &&
                        ((d[0].start = e.y1),
                        d.unshift({
                          start: n[t].start,
                          end: e.y1,
                          boundary: n[t].boundary,
                        })),
                        e.y2 < n[a].end &&
                          ((d[d.length - 1].end = e.y2),
                          d.push({
                            start: e.y2,
                            end: n[a].end,
                            boundary: n[a].boundary,
                          })),
                        r = t;
                      r <= a;
                      r++
                    )
                      if (void 0 === (i = (o = n[r]).boundary).x2New) {
                        var g = !1;
                        for (s = t - 1; !g && s >= 0 && n[s].start >= i.y1; s--)
                          g = n[s].boundary === i;
                        for (
                          s = a + 1;
                          !g && s < n.length && n[s].end <= i.y2;
                          s++
                        )
                          g = n[s].boundary === i;
                        for (s = 0; !g && s < d.length; s++)
                          g = d[s].boundary === i;
                        g || (i.x2New = l);
                      }
                    Array.prototype.splice.apply(n, [t, a - t + 1].concat(d));
                  }),
                    n.forEach(function (t) {
                      var n = t.boundary;
                      void 0 === n.x2New && (n.x2New = Math.max(e, n.x2));
                    });
                }
                function l(e) {
                  var t = e.textContent,
                    n = e.textContentStream,
                    o = e.container,
                    r = e.viewport,
                    s = e.textDivs,
                    l = e.textContentItemsStr,
                    c = e.enhanceTextSelection;
                  (this._textContent = t),
                    (this._textContentStream = n),
                    (this._container = o),
                    (this._viewport = r),
                    (this._textDivs = s || []),
                    (this._textContentItemsStr = l || []),
                    (this._enhanceTextSelection = !!c),
                    (this._fontInspectorEnabled = !(
                      !a.default.FontInspector ||
                      !a.default.FontInspector.enabled
                    )),
                    (this._reader = null),
                    (this._layoutTextLastFontSize = null),
                    (this._layoutTextLastFontFamily = null),
                    (this._layoutTextCtx = null),
                    (this._textDivProperties = new WeakMap()),
                    (this._renderingDone = !1),
                    (this._canceled = !1),
                    (this._capability = (0, i.createPromiseCapability)()),
                    (this._renderTimer = null),
                    (this._bounds = []);
                }
                return (
                  (l.prototype = {
                    get promise() {
                      return this._capability.promise;
                    },
                    cancel: function () {
                      this._reader &&
                        (this._reader.cancel(
                          new i.AbortException("text layer task cancelled")
                        ),
                        (this._reader = null)),
                        (this._canceled = !0),
                        null !== this._renderTimer &&
                          (clearTimeout(this._renderTimer),
                          (this._renderTimer = null)),
                        this._capability.reject("canceled");
                    },
                    _processItems: function (e, t) {
                      for (var o = 0, i = e.length; o < i; o++)
                        this._textContentItemsStr.push(e[o].str),
                          n(this, e[o], t);
                    },
                    _layoutText: function (e) {
                      var t = this._container,
                        n = this._textDivProperties.get(e);
                      if (!n.isWhitespace) {
                        var o = e.style.fontSize,
                          i = e.style.fontFamily;
                        (o === this._layoutTextLastFontSize &&
                          i === this._layoutTextLastFontFamily) ||
                          ((this._layoutTextCtx.font = o + " " + i),
                          (this._layoutTextLastFontSize = o),
                          (this._layoutTextLastFontFamily = i));
                        var a = this._layoutTextCtx.measureText(
                            e.textContent
                          ).width,
                          r = "";
                        0 !== n.canvasWidth &&
                          a > 0 &&
                          ((n.scale = n.canvasWidth / a),
                          (r = "scaleX(".concat(n.scale, ")"))),
                          0 !== n.angle &&
                            (r = "rotate(".concat(n.angle, "deg) ").concat(r)),
                          r.length > 0 &&
                            ((n.originalTransform = r),
                            (e.style.transform = r)),
                          this._textDivProperties.set(e, n),
                          t.appendChild(e);
                      }
                    },
                    _render: function (e) {
                      var t = this,
                        n = (0, i.createPromiseCapability)(),
                        a = Object.create(null),
                        r = document.createElement("canvas");
                      if (
                        ((r.mozOpaque = !0),
                        (this._layoutTextCtx = r.getContext("2d", {
                          alpha: !1,
                        })),
                        this._textContent)
                      ) {
                        var s = this._textContent.items,
                          l = this._textContent.styles;
                        this._processItems(s, l), n.resolve();
                      } else {
                        if (!this._textContentStream)
                          throw new Error(
                            'Neither "textContent" nor "textContentStream" parameters specified.'
                          );
                        (this._reader = this._textContentStream.getReader()),
                          (function e() {
                            t._reader.read().then(function (o) {
                              var i = o.value;
                              o.done
                                ? n.resolve()
                                : (Object.assign(a, i.styles),
                                  t._processItems(i.items, a),
                                  e());
                            }, n.reject);
                          })();
                      }
                      n.promise.then(function () {
                        (a = null),
                          e
                            ? (t._renderTimer = setTimeout(function () {
                                o(t), (t._renderTimer = null);
                              }, e))
                            : o(t);
                      }, this._capability.reject);
                    },
                    expandTextDivs: function (e) {
                      if (this._enhanceTextSelection && this._renderingDone) {
                        null !== this._bounds &&
                          (r(this), (this._bounds = null));
                        for (var t = 0, n = this._textDivs.length; t < n; t++) {
                          var o = this._textDivs[t],
                            i = this._textDivProperties.get(o);
                          if (!i.isWhitespace)
                            if (e) {
                              var a = "",
                                s = "";
                              1 !== i.scale && (a = "scaleX(" + i.scale + ")"),
                                0 !== i.angle &&
                                  (a = "rotate(" + i.angle + "deg) " + a),
                                0 !== i.paddingLeft &&
                                  ((s +=
                                    " padding-left: " +
                                    i.paddingLeft / i.scale +
                                    "px;"),
                                  (a +=
                                    " translateX(" +
                                    -i.paddingLeft / i.scale +
                                    "px)")),
                                0 !== i.paddingTop &&
                                  ((s +=
                                    " padding-top: " + i.paddingTop + "px;"),
                                  (a +=
                                    " translateY(" + -i.paddingTop + "px)")),
                                0 !== i.paddingRight &&
                                  (s +=
                                    " padding-right: " +
                                    i.paddingRight / i.scale +
                                    "px;"),
                                0 !== i.paddingBottom &&
                                  (s +=
                                    " padding-bottom: " +
                                    i.paddingBottom +
                                    "px;"),
                                "" !== s &&
                                  o.setAttribute("style", i.style + s),
                                "" !== a && (o.style.transform = a);
                            } else
                              (o.style.padding = 0),
                                (o.style.transform = i.originalTransform || "");
                        }
                      }
                    },
                  }),
                  function (e) {
                    var t = new l({
                      textContent: e.textContent,
                      textContentStream: e.textContentStream,
                      container: e.container,
                      viewport: e.viewport,
                      textDivs: e.textDivs,
                      textContentItemsStr: e.textContentItemsStr,
                      enhanceTextSelection: e.enhanceTextSelection,
                    });
                    return t._render(e.timeout), t;
                  }
                );
              })();
            t.renderTextLayer = r;
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.AnnotationLayer = void 0);
            var o = n(151),
              i = n(1);
            function a(e, t, n) {
              return (a =
                "undefined" != typeof Reflect && Reflect.get
                  ? Reflect.get
                  : function (e, t, n) {
                      var o = (function (e, t) {
                        for (
                          ;
                          !Object.prototype.hasOwnProperty.call(e, t) &&
                          null !== (e = c(e));

                        );
                        return e;
                      })(e, t);
                      if (o) {
                        var i = Object.getOwnPropertyDescriptor(o, t);
                        return i.get ? i.get.call(n) : i.value;
                      }
                    })(e, t, n || e);
            }
            function r(e) {
              return (r =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            function s(e, t) {
              return !t || ("object" !== r(t) && "function" != typeof t)
                ? l(e)
                : t;
            }
            function l(e) {
              if (void 0 === e)
                throw new ReferenceError(
                  "this hasn't been initialised - super() hasn't been called"
                );
              return e;
            }
            function c(e) {
              return (c = Object.setPrototypeOf
                ? Object.getPrototypeOf
                : function (e) {
                    return e.__proto__ || Object.getPrototypeOf(e);
                  })(e);
            }
            function d(e, t) {
              if ("function" != typeof t && null !== t)
                throw new TypeError(
                  "Super expression must either be null or a function"
                );
              (e.prototype = Object.create(t && t.prototype, {
                constructor: { value: e, writable: !0, configurable: !0 },
              })),
                t && u(e, t);
            }
            function u(e, t) {
              return (u =
                Object.setPrototypeOf ||
                function (e, t) {
                  return (e.__proto__ = t), e;
                })(e, t);
            }
            function p(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function g(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function h(e, t, n) {
              return t && g(e.prototype, t), n && g(e, n), e;
            }
            var f = (function () {
                function e() {
                  p(this, e);
                }
                return (
                  h(e, null, [
                    {
                      key: "create",
                      value: function (e) {
                        switch (e.data.annotationType) {
                          case i.AnnotationType.LINK:
                            return new y(e);
                          case i.AnnotationType.TEXT:
                            return new v(e);
                          case i.AnnotationType.WIDGET:
                            switch (e.data.fieldType) {
                              case "Tx":
                                return new b(e);
                              case "Btn":
                                return e.data.radioButton
                                  ? new C(e)
                                  : e.data.checkBox
                                  ? new w(e)
                                  : new x(e);
                              case "Ch":
                                return new S(e);
                            }
                            return new _(e);
                          case i.AnnotationType.POPUP:
                            return new E(e);
                          case i.AnnotationType.LINE:
                            return new T(e);
                          case i.AnnotationType.SQUARE:
                            return new G(e);
                          case i.AnnotationType.CIRCLE:
                            return new P(e);
                          case i.AnnotationType.POLYLINE:
                            return new D(e);
                          case i.AnnotationType.INK:
                            return new I(e);
                          case i.AnnotationType.POLYGON:
                            return new L(e);
                          case i.AnnotationType.HIGHLIGHT:
                            return new k(e);
                          case i.AnnotationType.UNDERLINE:
                            return new O(e);
                          case i.AnnotationType.SQUIGGLY:
                            return new F(e);
                          case i.AnnotationType.STRIKEOUT:
                            return new R(e);
                          case i.AnnotationType.STAMP:
                            return new M(e);
                          case i.AnnotationType.FILEATTACHMENT:
                            return new N(e);
                          default:
                            return new m(e);
                        }
                      },
                    },
                  ]),
                  e
                );
              })(),
              m = (function () {
                function e(t) {
                  var n =
                      arguments.length > 1 &&
                      void 0 !== arguments[1] &&
                      arguments[1],
                    o =
                      arguments.length > 2 &&
                      void 0 !== arguments[2] &&
                      arguments[2];
                  p(this, e),
                    (this.isRenderable = n),
                    (this.data = t.data),
                    (this.layer = t.layer),
                    (this.page = t.page),
                    (this.viewport = t.viewport),
                    (this.linkService = t.linkService),
                    (this.downloadManager = t.downloadManager),
                    (this.imageResourcesPath = t.imageResourcesPath),
                    (this.renderInteractiveForms = t.renderInteractiveForms),
                    (this.svgFactory = t.svgFactory),
                    n && (this.container = this._createContainer(o));
                }
                return (
                  h(e, [
                    {
                      key: "_createContainer",
                      value: function () {
                        var e =
                            arguments.length > 0 &&
                            void 0 !== arguments[0] &&
                            arguments[0],
                          t = this.data,
                          n = this.page,
                          o = this.viewport,
                          a = document.createElement("section"),
                          r = t.rect[2] - t.rect[0],
                          s = t.rect[3] - t.rect[1];
                        a.setAttribute("data-annotation-id", t.id);
                        var l = i.Util.normalizeRect([
                          t.rect[0],
                          n.view[3] - t.rect[1] + n.view[1],
                          t.rect[2],
                          n.view[3] - t.rect[3] + n.view[1],
                        ]);
                        if (
                          ((a.style.transform =
                            "matrix(" + o.transform.join(",") + ")"),
                          (a.style.transformOrigin =
                            -l[0] + "px " + -l[1] + "px"),
                          !e && t.borderStyle.width > 0)
                        ) {
                          (a.style.borderWidth = t.borderStyle.width + "px"),
                            t.borderStyle.style !==
                              i.AnnotationBorderStyleType.UNDERLINE &&
                              ((r -= 2 * t.borderStyle.width),
                              (s -= 2 * t.borderStyle.width));
                          var c = t.borderStyle.horizontalCornerRadius,
                            d = t.borderStyle.verticalCornerRadius;
                          if (c > 0 || d > 0) {
                            var u = c + "px / " + d + "px";
                            a.style.borderRadius = u;
                          }
                          switch (t.borderStyle.style) {
                            case i.AnnotationBorderStyleType.SOLID:
                              a.style.borderStyle = "solid";
                              break;
                            case i.AnnotationBorderStyleType.DASHED:
                              a.style.borderStyle = "dashed";
                              break;
                            case i.AnnotationBorderStyleType.BEVELED:
                              (0, i.warn)(
                                "Unimplemented border style: beveled"
                              );
                              break;
                            case i.AnnotationBorderStyleType.INSET:
                              (0, i.warn)("Unimplemented border style: inset");
                              break;
                            case i.AnnotationBorderStyleType.UNDERLINE:
                              a.style.borderBottomStyle = "solid";
                          }
                          t.color
                            ? (a.style.borderColor = i.Util.makeCssRgb(
                                0 | t.color[0],
                                0 | t.color[1],
                                0 | t.color[2]
                              ))
                            : (a.style.borderWidth = 0);
                        }
                        return (
                          (a.style.left = l[0] + "px"),
                          (a.style.top = l[1] + "px"),
                          (a.style.width = r + "px"),
                          (a.style.height = s + "px"),
                          a
                        );
                      },
                    },
                    {
                      key: "_createPopup",
                      value: function (e, t, n) {
                        t ||
                          (((t = document.createElement("div")).style.height =
                            e.style.height),
                          (t.style.width = e.style.width),
                          e.appendChild(t));
                        var o = new A({
                          container: e,
                          trigger: t,
                          color: n.color,
                          title: n.title,
                          contents: n.contents,
                          hideWrapper: !0,
                        }).render();
                        (o.style.left = e.style.width), e.appendChild(o);
                      },
                    },
                    {
                      key: "render",
                      value: function () {
                        (0, i.unreachable)(
                          "Abstract method `AnnotationElement.render` called"
                        );
                      },
                    },
                  ]),
                  e
                );
              })(),
              y = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(e.data.url || e.data.dest || e.data.action);
                  return s(this, c(t).call(this, e, n));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "linkAnnotation";
                        var e = this.data,
                          t = this.linkService,
                          n = document.createElement("a");
                        return (
                          (0, o.addLinkAttributes)(n, {
                            url: e.url,
                            target: e.newWindow
                              ? o.LinkTarget.BLANK
                              : t.externalLinkTarget,
                            rel: t.externalLinkRel,
                          }),
                          e.url ||
                            (e.action
                              ? this._bindNamedAction(n, e.action)
                              : this._bindLink(n, e.dest)),
                          this.container.appendChild(n),
                          this.container
                        );
                      },
                    },
                    {
                      key: "_bindLink",
                      value: function (e, t) {
                        var n = this;
                        (e.href = this.linkService.getDestinationHash(t)),
                          (e.onclick = function () {
                            return t && n.linkService.navigateTo(t), !1;
                          }),
                          t && (e.className = "internalLink");
                      },
                    },
                    {
                      key: "_bindNamedAction",
                      value: function (e, t) {
                        var n = this;
                        (e.href = this.linkService.getAnchorUrl("")),
                          (e.onclick = function () {
                            return n.linkService.executeNamedAction(t), !1;
                          }),
                          (e.className = "internalLink");
                      },
                    },
                  ]),
                  t
                );
              })(m),
              v = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "textAnnotation";
                        var e = document.createElement("img");
                        return (
                          (e.style.height = this.container.style.height),
                          (e.style.width = this.container.style.width),
                          (e.src =
                            this.imageResourcesPath +
                            "annotation-" +
                            this.data.name.toLowerCase() +
                            ".svg"),
                          (e.alt = "[{{type}} Annotation]"),
                          (e.dataset.l10nId = "text_annotation_type"),
                          (e.dataset.l10nArgs = JSON.stringify({
                            type: this.data.name,
                          })),
                          this.data.hasPopup ||
                            this._createPopup(this.container, e, this.data),
                          this.container.appendChild(e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              _ = (function (e) {
                function t() {
                  return p(this, t), s(this, c(t).apply(this, arguments));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return this.container;
                      },
                    },
                  ]),
                  t
                );
              })(m),
              b = (function (e) {
                function t(e) {
                  p(this, t);
                  var n =
                    e.renderInteractiveForms ||
                    (!e.data.hasAppearance && !!e.data.fieldValue);
                  return s(this, c(t).call(this, e, n));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "textWidgetAnnotation";
                        var e = null;
                        if (this.renderInteractiveForms) {
                          if (
                            (this.data.multiLine
                              ? ((e =
                                  document.createElement(
                                    "textarea"
                                  )).textContent = this.data.fieldValue)
                              : (((e = document.createElement("input")).type =
                                  "text"),
                                e.setAttribute("value", this.data.fieldValue)),
                            (e.disabled = this.data.readOnly),
                            null !== this.data.maxLen &&
                              (e.maxLength = this.data.maxLen),
                            this.data.comb)
                          ) {
                            var t =
                              (this.data.rect[2] - this.data.rect[0]) /
                              this.data.maxLen;
                            e.classList.add("comb"),
                              (e.style.letterSpacing =
                                "calc(" + t + "px - 1ch)");
                          }
                        } else {
                          ((e = document.createElement("div")).textContent =
                            this.data.fieldValue),
                            (e.style.verticalAlign = "middle"),
                            (e.style.display = "table-cell");
                          var n = null;
                          this.data.fontRefName &&
                            this.page.commonObjs.has(this.data.fontRefName) &&
                            (n = this.page.commonObjs.get(
                              this.data.fontRefName
                            )),
                            this._setTextStyle(e, n);
                        }
                        return (
                          null !== this.data.textAlignment &&
                            (e.style.textAlign = ["left", "center", "right"][
                              this.data.textAlignment
                            ]),
                          this.container.appendChild(e),
                          this.container
                        );
                      },
                    },
                    {
                      key: "_setTextStyle",
                      value: function (e, t) {
                        var n = e.style;
                        if (
                          ((n.fontSize = this.data.fontSize + "px"),
                          (n.direction =
                            this.data.fontDirection < 0 ? "rtl" : "ltr"),
                          t)
                        ) {
                          (n.fontWeight = t.black
                            ? t.bold
                              ? "900"
                              : "bold"
                            : t.bold
                            ? "bold"
                            : "normal"),
                            (n.fontStyle = t.italic ? "italic" : "normal");
                          var o = t.loadedName
                              ? '"' + t.loadedName + '", '
                              : "",
                            i = t.fallbackName || "Helvetica, sans-serif";
                          n.fontFamily = o + i;
                        }
                      },
                    },
                  ]),
                  t
                );
              })(_),
              w = (function (e) {
                function t(e) {
                  return (
                    p(this, t),
                    s(this, c(t).call(this, e, e.renderInteractiveForms))
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className =
                          "buttonWidgetAnnotation checkBox";
                        var e = document.createElement("input");
                        return (
                          (e.disabled = this.data.readOnly),
                          (e.type = "checkbox"),
                          this.data.fieldValue &&
                            "Off" !== this.data.fieldValue &&
                            e.setAttribute("checked", !0),
                          this.container.appendChild(e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(_),
              C = (function (e) {
                function t(e) {
                  return (
                    p(this, t),
                    s(this, c(t).call(this, e, e.renderInteractiveForms))
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className =
                          "buttonWidgetAnnotation radioButton";
                        var e = document.createElement("input");
                        return (
                          (e.disabled = this.data.readOnly),
                          (e.type = "radio"),
                          (e.name = this.data.fieldName),
                          this.data.fieldValue === this.data.buttonValue &&
                            e.setAttribute("checked", !0),
                          this.container.appendChild(e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(_),
              x = (function (e) {
                function t() {
                  return p(this, t), s(this, c(t).apply(this, arguments));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        var e = a(c(t.prototype), "render", this).call(this);
                        return (
                          (e.className = "buttonWidgetAnnotation pushButton"), e
                        );
                      },
                    },
                  ]),
                  t
                );
              })(y),
              S = (function (e) {
                function t(e) {
                  return (
                    p(this, t),
                    s(this, c(t).call(this, e, e.renderInteractiveForms))
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "choiceWidgetAnnotation";
                        var e = document.createElement("select");
                        (e.disabled = this.data.readOnly),
                          this.data.combo ||
                            ((e.size = this.data.options.length),
                            this.data.multiSelect && (e.multiple = !0));
                        for (
                          var t = 0, n = this.data.options.length;
                          t < n;
                          t++
                        ) {
                          var o = this.data.options[t],
                            i = document.createElement("option");
                          (i.textContent = o.displayValue),
                            (i.value = o.exportValue),
                            this.data.fieldValue.includes(o.displayValue) &&
                              i.setAttribute("selected", !0),
                            e.appendChild(i);
                        }
                        return this.container.appendChild(e), this.container;
                      },
                    },
                  ]),
                  t
                );
              })(_),
              E = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !(!e.data.title && !e.data.contents);
                  return s(this, c(t).call(this, e, n));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        if (
                          ((this.container.className = "popupAnnotation"),
                          [
                            "Line",
                            "Square",
                            "Circle",
                            "PolyLine",
                            "Polygon",
                            "Ink",
                          ].includes(this.data.parentType))
                        )
                          return this.container;
                        var e =
                            '[data-annotation-id="' + this.data.parentId + '"]',
                          t = this.layer.querySelector(e);
                        if (!t) return this.container;
                        var n = new A({
                            container: this.container,
                            trigger: t,
                            color: this.data.color,
                            title: this.data.title,
                            contents: this.data.contents,
                          }),
                          o = parseFloat(t.style.left),
                          i = parseFloat(t.style.width);
                        return (
                          (this.container.style.transformOrigin =
                            -(o + i) + "px -" + t.style.top),
                          (this.container.style.left = o + i + "px"),
                          this.container.appendChild(n.render()),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              A = (function () {
                function e(t) {
                  p(this, e),
                    (this.container = t.container),
                    (this.trigger = t.trigger),
                    (this.color = t.color),
                    (this.title = t.title),
                    (this.contents = t.contents),
                    (this.hideWrapper = t.hideWrapper || !1),
                    (this.pinned = !1);
                }
                return (
                  h(e, [
                    {
                      key: "render",
                      value: function () {
                        var e = document.createElement("div");
                        (e.className = "popupWrapper"),
                          (this.hideElement = this.hideWrapper
                            ? e
                            : this.container),
                          this.hideElement.setAttribute("hidden", !0);
                        var t = document.createElement("div");
                        t.className = "popup";
                        var n = this.color;
                        if (n) {
                          var o = 0.7 * (255 - n[0]) + n[0],
                            a = 0.7 * (255 - n[1]) + n[1],
                            r = 0.7 * (255 - n[2]) + n[2];
                          t.style.backgroundColor = i.Util.makeCssRgb(
                            0 | o,
                            0 | a,
                            0 | r
                          );
                        }
                        var s = this._formatContents(this.contents),
                          l = document.createElement("h1");
                        return (
                          (l.textContent = this.title),
                          this.trigger.addEventListener(
                            "click",
                            this._toggle.bind(this)
                          ),
                          this.trigger.addEventListener(
                            "mouseover",
                            this._show.bind(this, !1)
                          ),
                          this.trigger.addEventListener(
                            "mouseout",
                            this._hide.bind(this, !1)
                          ),
                          t.addEventListener(
                            "click",
                            this._hide.bind(this, !0)
                          ),
                          t.appendChild(l),
                          t.appendChild(s),
                          e.appendChild(t),
                          e
                        );
                      },
                    },
                    {
                      key: "_formatContents",
                      value: function (e) {
                        for (
                          var t = document.createElement("p"),
                            n = e.split(/(?:\r\n?|\n)/),
                            o = 0,
                            i = n.length;
                          o < i;
                          ++o
                        ) {
                          var a = n[o];
                          t.appendChild(document.createTextNode(a)),
                            o < i - 1 &&
                              t.appendChild(document.createElement("br"));
                        }
                        return t;
                      },
                    },
                    {
                      key: "_toggle",
                      value: function () {
                        this.pinned ? this._hide(!0) : this._show(!0);
                      },
                    },
                    {
                      key: "_show",
                      value: function () {
                        var e =
                          arguments.length > 0 &&
                          void 0 !== arguments[0] &&
                          arguments[0];
                        e && (this.pinned = !0),
                          this.hideElement.hasAttribute("hidden") &&
                            (this.hideElement.removeAttribute("hidden"),
                            (this.container.style.zIndex += 1));
                      },
                    },
                    {
                      key: "_hide",
                      value: function () {
                        var e =
                          !(arguments.length > 0 && void 0 !== arguments[0]) ||
                          arguments[0];
                        e && (this.pinned = !1),
                          this.hideElement.hasAttribute("hidden") ||
                            this.pinned ||
                            (this.hideElement.setAttribute("hidden", !0),
                            (this.container.style.zIndex -= 1));
                      },
                    },
                  ]),
                  e
                );
              })(),
              T = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "lineAnnotation";
                        var e = this.data,
                          t = e.rect[2] - e.rect[0],
                          n = e.rect[3] - e.rect[1],
                          o = this.svgFactory.create(t, n),
                          i = this.svgFactory.createElement("svg:line");
                        return (
                          i.setAttribute(
                            "x1",
                            e.rect[2] - e.lineCoordinates[0]
                          ),
                          i.setAttribute(
                            "y1",
                            e.rect[3] - e.lineCoordinates[1]
                          ),
                          i.setAttribute(
                            "x2",
                            e.rect[2] - e.lineCoordinates[2]
                          ),
                          i.setAttribute(
                            "y2",
                            e.rect[3] - e.lineCoordinates[3]
                          ),
                          i.setAttribute("stroke-width", e.borderStyle.width),
                          i.setAttribute("stroke", "transparent"),
                          o.appendChild(i),
                          this.container.append(o),
                          this._createPopup(this.container, i, e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              G = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "squareAnnotation";
                        var e = this.data,
                          t = e.rect[2] - e.rect[0],
                          n = e.rect[3] - e.rect[1],
                          o = this.svgFactory.create(t, n),
                          i = e.borderStyle.width,
                          a = this.svgFactory.createElement("svg:rect");
                        return (
                          a.setAttribute("x", i / 2),
                          a.setAttribute("y", i / 2),
                          a.setAttribute("width", t - i),
                          a.setAttribute("height", n - i),
                          a.setAttribute("stroke-width", i),
                          a.setAttribute("stroke", "transparent"),
                          a.setAttribute("fill", "none"),
                          o.appendChild(a),
                          this.container.append(o),
                          this._createPopup(this.container, a, e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              P = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "circleAnnotation";
                        var e = this.data,
                          t = e.rect[2] - e.rect[0],
                          n = e.rect[3] - e.rect[1],
                          o = this.svgFactory.create(t, n),
                          i = e.borderStyle.width,
                          a = this.svgFactory.createElement("svg:ellipse");
                        return (
                          a.setAttribute("cx", t / 2),
                          a.setAttribute("cy", n / 2),
                          a.setAttribute("rx", t / 2 - i / 2),
                          a.setAttribute("ry", n / 2 - i / 2),
                          a.setAttribute("stroke-width", i),
                          a.setAttribute("stroke", "transparent"),
                          a.setAttribute("fill", "none"),
                          o.appendChild(a),
                          this.container.append(o),
                          this._createPopup(this.container, a, e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              D = (function (e) {
                function t(e) {
                  var n;
                  p(this, t);
                  var o = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return (
                    ((n = s(
                      this,
                      c(t).call(this, e, o, !0)
                    )).containerClassName = "polylineAnnotation"),
                    (n.svgElementName = "svg:polyline"),
                    n
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = this.containerClassName;
                        for (
                          var e = this.data,
                            t = e.rect[2] - e.rect[0],
                            n = e.rect[3] - e.rect[1],
                            o = this.svgFactory.create(t, n),
                            i = e.vertices,
                            a = [],
                            r = 0,
                            s = i.length;
                          r < s;
                          r++
                        ) {
                          var l = i[r].x - e.rect[0],
                            c = e.rect[3] - i[r].y;
                          a.push(l + "," + c);
                        }
                        a = a.join(" ");
                        var d = e.borderStyle.width,
                          u = this.svgFactory.createElement(
                            this.svgElementName
                          );
                        return (
                          u.setAttribute("points", a),
                          u.setAttribute("stroke-width", d),
                          u.setAttribute("stroke", "transparent"),
                          u.setAttribute("fill", "none"),
                          o.appendChild(u),
                          this.container.append(o),
                          this._createPopup(this.container, u, e),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              L = (function (e) {
                function t(e) {
                  var n;
                  return (
                    p(this, t),
                    ((n = s(this, c(t).call(this, e))).containerClassName =
                      "polygonAnnotation"),
                    (n.svgElementName = "svg:polygon"),
                    n
                  );
                }
                return d(t, e), t;
              })(D),
              I = (function (e) {
                function t(e) {
                  var n;
                  p(this, t);
                  var o = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return (
                    ((n = s(
                      this,
                      c(t).call(this, e, o, !0)
                    )).containerClassName = "inkAnnotation"),
                    (n.svgElementName = "svg:polyline"),
                    n
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = this.containerClassName;
                        for (
                          var e = this.data,
                            t = e.rect[2] - e.rect[0],
                            n = e.rect[3] - e.rect[1],
                            o = this.svgFactory.create(t, n),
                            i = e.inkLists,
                            a = 0,
                            r = i.length;
                          a < r;
                          a++
                        ) {
                          for (
                            var s = i[a], l = [], c = 0, d = s.length;
                            c < d;
                            c++
                          ) {
                            var u = s[c].x - e.rect[0],
                              p = e.rect[3] - s[c].y;
                            l.push(u + "," + p);
                          }
                          l = l.join(" ");
                          var g = e.borderStyle.width,
                            h = this.svgFactory.createElement(
                              this.svgElementName
                            );
                          h.setAttribute("points", l),
                            h.setAttribute("stroke-width", g),
                            h.setAttribute("stroke", "transparent"),
                            h.setAttribute("fill", "none"),
                            this._createPopup(this.container, h, e),
                            o.appendChild(h);
                        }
                        return this.container.append(o), this.container;
                      },
                    },
                  ]),
                  t
                );
              })(m),
              k = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return (
                          (this.container.className = "highlightAnnotation"),
                          this.data.hasPopup ||
                            this._createPopup(this.container, null, this.data),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              O = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return (
                          (this.container.className = "underlineAnnotation"),
                          this.data.hasPopup ||
                            this._createPopup(this.container, null, this.data),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              F = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return (
                          (this.container.className = "squigglyAnnotation"),
                          this.data.hasPopup ||
                            this._createPopup(this.container, null, this.data),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              R = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return (
                          (this.container.className = "strikeoutAnnotation"),
                          this.data.hasPopup ||
                            this._createPopup(this.container, null, this.data),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              M = (function (e) {
                function t(e) {
                  p(this, t);
                  var n = !!(
                    e.data.hasPopup ||
                    e.data.title ||
                    e.data.contents
                  );
                  return s(this, c(t).call(this, e, n, !0));
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        return (
                          (this.container.className = "stampAnnotation"),
                          this.data.hasPopup ||
                            this._createPopup(this.container, null, this.data),
                          this.container
                        );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              N = (function (e) {
                function t(e) {
                  var n;
                  p(this, t);
                  var a = (n = s(this, c(t).call(this, e, !0))).data.file,
                    r = a.filename,
                    d = a.content;
                  return (
                    (n.filename = (0, o.getFilenameFromUrl)(r)),
                    (n.content = d),
                    n.linkService.eventBus &&
                      n.linkService.eventBus.dispatch(
                        "fileattachmentannotation",
                        {
                          source: l(l(n)),
                          id: (0, i.stringToPDFString)(r),
                          filename: r,
                          content: d,
                        }
                      ),
                    n
                  );
                }
                return (
                  d(t, e),
                  h(t, [
                    {
                      key: "render",
                      value: function () {
                        this.container.className = "fileAttachmentAnnotation";
                        var e = document.createElement("div");
                        return (
                          (e.style.height = this.container.style.height),
                          (e.style.width = this.container.style.width),
                          e.addEventListener(
                            "dblclick",
                            this._download.bind(this)
                          ),
                          this.data.hasPopup ||
                            (!this.data.title && !this.data.contents) ||
                            this._createPopup(this.container, e, this.data),
                          this.container.appendChild(e),
                          this.container
                        );
                      },
                    },
                    {
                      key: "_download",
                      value: function () {
                        this.downloadManager
                          ? this.downloadManager.downloadData(
                              this.content,
                              this.filename,
                              ""
                            )
                          : (0, i.warn)(
                              "Download cannot be started due to unavailable download manager"
                            );
                      },
                    },
                  ]),
                  t
                );
              })(m),
              B = (function () {
                function e() {
                  p(this, e);
                }
                return (
                  h(e, null, [
                    {
                      key: "render",
                      value: function (e) {
                        for (var t = 0, n = e.annotations.length; t < n; t++) {
                          var i = e.annotations[t];
                          if (i) {
                            var a = f.create({
                              data: i,
                              layer: e.div,
                              page: e.page,
                              viewport: e.viewport,
                              linkService: e.linkService,
                              downloadManager: e.downloadManager,
                              imageResourcesPath: e.imageResourcesPath || "",
                              renderInteractiveForms:
                                e.renderInteractiveForms || !1,
                              svgFactory: new o.DOMSVGFactory(),
                            });
                            a.isRenderable && e.div.appendChild(a.render());
                          }
                        }
                      },
                    },
                    {
                      key: "update",
                      value: function (e) {
                        for (var t = 0, n = e.annotations.length; t < n; t++) {
                          var o = e.annotations[t],
                            i = e.div.querySelector(
                              '[data-annotation-id="' + o.id + '"]'
                            );
                          i &&
                            (i.style.transform =
                              "matrix(" + e.viewport.transform.join(",") + ")");
                        }
                        e.div.removeAttribute("hidden");
                      },
                    },
                  ]),
                  e
                );
              })();
            t.AnnotationLayer = B;
          },
          function (e, o, a) {
            "use strict";
            Object.defineProperty(o, "__esModule", { value: !0 }),
              (o.SVGGraphics = void 0);
            var r,
              s = a(1),
              l = a(151),
              c = (r = a(4)) && r.__esModule ? r : { default: r },
              d = function () {
                throw new Error("Not implemented: SVGGraphics");
              };
            o.SVGGraphics = d;
            var u = {
                fontStyle: "normal",
                fontWeight: "normal",
                fillColor: "#000000",
              },
              p = (function () {
                for (
                  var e = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
                    o = new Int32Array(256),
                    a = 0;
                  a < 256;
                  a++
                ) {
                  for (var r = a, l = 0; l < 8; l++)
                    r =
                      1 & r
                        ? 3988292384 ^ ((r >> 1) & 2147483647)
                        : (r >> 1) & 2147483647;
                  o[a] = r;
                }
                function d(e, t, n, i) {
                  var a = i,
                    r = t.length;
                  (n[a] = (r >> 24) & 255),
                    (n[a + 1] = (r >> 16) & 255),
                    (n[a + 2] = (r >> 8) & 255),
                    (n[a + 3] = 255 & r),
                    (n[(a += 4)] = 255 & e.charCodeAt(0)),
                    (n[a + 1] = 255 & e.charCodeAt(1)),
                    (n[a + 2] = 255 & e.charCodeAt(2)),
                    (n[a + 3] = 255 & e.charCodeAt(3)),
                    (a += 4),
                    n.set(t, a);
                  var s = (function (e, t, n) {
                    for (var i = -1, a = t; a < n; a++) {
                      var r = 255 & (i ^ e[a]);
                      i = (i >>> 8) ^ o[r];
                    }
                    return -1 ^ i;
                  })(n, i + 4, (a += t.length));
                  (n[a] = (s >> 24) & 255),
                    (n[a + 1] = (s >> 16) & 255),
                    (n[a + 2] = (s >> 8) & 255),
                    (n[a + 3] = 255 & s);
                }
                function u(e) {
                  var t = e.length,
                    n = Math.ceil(t / 65535),
                    o = new Uint8Array(2 + t + 5 * n + 4),
                    i = 0;
                  (o[i++] = 120), (o[i++] = 156);
                  for (var a = 0; t > 65535; )
                    (o[i++] = 0),
                      (o[i++] = 255),
                      (o[i++] = 255),
                      (o[i++] = 0),
                      (o[i++] = 0),
                      o.set(e.subarray(a, a + 65535), i),
                      (i += 65535),
                      (a += 65535),
                      (t -= 65535);
                  (o[i++] = 1),
                    (o[i++] = 255 & t),
                    (o[i++] = (t >> 8) & 255),
                    (o[i++] = 255 & ~t),
                    (o[i++] = ((65535 & ~t) >> 8) & 255),
                    o.set(e.subarray(a), i),
                    (i += e.length - a);
                  var r = (function (e, t, n) {
                    for (var o = 1, i = 0, a = t; a < n; ++a)
                      i = (i + (o = (o + (255 & e[a])) % 65521)) % 65521;
                    return (i << 16) | o;
                  })(e, 0, e.length);
                  return (
                    (o[i++] = (r >> 24) & 255),
                    (o[i++] = (r >> 16) & 255),
                    (o[i++] = (r >> 8) & 255),
                    (o[i++] = 255 & r),
                    o
                  );
                }
                function p(o, a, r, l) {
                  var p,
                    g,
                    h,
                    f = o.width,
                    m = o.height,
                    y = o.data;
                  switch (a) {
                    case s.ImageKind.GRAYSCALE_1BPP:
                      (g = 0), (p = 1), (h = (f + 7) >> 3);
                      break;
                    case s.ImageKind.RGB_24BPP:
                      (g = 2), (p = 8), (h = 3 * f);
                      break;
                    case s.ImageKind.RGBA_32BPP:
                      (g = 6), (p = 8), (h = 4 * f);
                      break;
                    default:
                      throw new Error("invalid format");
                  }
                  var v,
                    _,
                    b = new Uint8Array((1 + h) * m),
                    w = 0,
                    C = 0;
                  for (v = 0; v < m; ++v)
                    (b[w++] = 0),
                      b.set(y.subarray(C, C + h), w),
                      (C += h),
                      (w += h);
                  if (a === s.ImageKind.GRAYSCALE_1BPP && l)
                    for (w = 0, v = 0; v < m; v++)
                      for (w++, _ = 0; _ < h; _++) b[w++] ^= 255;
                  var x = new Uint8Array([
                      (f >> 24) & 255,
                      (f >> 16) & 255,
                      (f >> 8) & 255,
                      255 & f,
                      (m >> 24) & 255,
                      (m >> 16) & 255,
                      (m >> 8) & 255,
                      255 & m,
                      p,
                      g,
                      0,
                      0,
                      0,
                    ]),
                    S = (function (e) {
                      if (!(0, c.default)()) return u(e);
                      try {
                        var o;
                        o = parseInt(i.versions.node) >= 8 ? e : new t(e);
                        var a = n(1389).deflateSync(o, { level: 9 });
                        return a instanceof Uint8Array ? a : new Uint8Array(a);
                      } catch (e) {
                        (0, s.warn)(
                          "Not compressing PNG because zlib.deflateSync is unavailable: " +
                            e
                        );
                      }
                      return u(e);
                    })(b),
                    E = e.length + 36 + x.length + S.length,
                    A = new Uint8Array(E),
                    T = 0;
                  return (
                    A.set(e, T),
                    d("IHDR", x, A, (T += e.length)),
                    d("IDATA", S, A, (T += 12 + x.length)),
                    (T += 12 + S.length),
                    d("IEND", new Uint8Array(0), A, T),
                    (0, s.createObjectURL)(A, "image/png", r)
                  );
                }
                return function (e, t, n) {
                  return p(
                    e,
                    void 0 === e.kind ? s.ImageKind.GRAYSCALE_1BPP : e.kind,
                    t,
                    n
                  );
                };
              })(),
              g = (function () {
                function e() {
                  (this.fontSizeScale = 1),
                    (this.fontWeight = u.fontWeight),
                    (this.fontSize = 0),
                    (this.textMatrix = s.IDENTITY_MATRIX),
                    (this.fontMatrix = s.FONT_IDENTITY_MATRIX),
                    (this.leading = 0),
                    (this.textRenderingMode = s.TextRenderingMode.FILL),
                    (this.x = 0),
                    (this.y = 0),
                    (this.lineX = 0),
                    (this.lineY = 0),
                    (this.charSpacing = 0),
                    (this.wordSpacing = 0),
                    (this.textHScale = 1),
                    (this.textRise = 0),
                    (this.fillColor = u.fillColor),
                    (this.strokeColor = "#000000"),
                    (this.fillAlpha = 1),
                    (this.strokeAlpha = 1),
                    (this.lineWidth = 1),
                    (this.lineJoin = ""),
                    (this.lineCap = ""),
                    (this.miterLimit = 0),
                    (this.dashArray = []),
                    (this.dashPhase = 0),
                    (this.dependencies = []),
                    (this.activeClipUrl = null),
                    (this.clipGroup = null),
                    (this.maskId = "");
                }
                return (
                  (e.prototype = {
                    clone: function () {
                      return Object.create(this);
                    },
                    setCurrentPoint: function (e, t) {
                      (this.x = e), (this.y = t);
                    },
                  }),
                  e
                );
              })();
            o.SVGGraphics = d = (function () {
              function e(e) {
                if (Number.isInteger(e)) return e.toString();
                var t = e.toFixed(10),
                  n = t.length - 1;
                if ("0" !== t[n]) return t;
                do {
                  n--;
                } while ("0" === t[n]);
                return t.substring(0, "." === t[n] ? n : n + 1);
              }
              function t(t) {
                if (0 === t[4] && 0 === t[5]) {
                  if (0 === t[1] && 0 === t[2])
                    return 1 === t[0] && 1 === t[3]
                      ? ""
                      : "scale(" + e(t[0]) + " " + e(t[3]) + ")";
                  if (t[0] === t[3] && t[1] === -t[2])
                    return (
                      "rotate(" + e((180 * Math.acos(t[0])) / Math.PI) + ")"
                    );
                } else if (1 === t[0] && 0 === t[1] && 0 === t[2] && 1 === t[3])
                  return "translate(" + e(t[4]) + " " + e(t[5]) + ")";
                return (
                  "matrix(" +
                  e(t[0]) +
                  " " +
                  e(t[1]) +
                  " " +
                  e(t[2]) +
                  " " +
                  e(t[3]) +
                  " " +
                  e(t[4]) +
                  " " +
                  e(t[5]) +
                  ")"
                );
              }
              function n(e, t, n) {
                (this.svgFactory = new l.DOMSVGFactory()),
                  (this.current = new g()),
                  (this.transformMatrix = s.IDENTITY_MATRIX),
                  (this.transformStack = []),
                  (this.extraStack = []),
                  (this.commonObjs = e),
                  (this.objs = t),
                  (this.pendingClip = null),
                  (this.pendingEOFill = !1),
                  (this.embedFonts = !1),
                  (this.embeddedFonts = Object.create(null)),
                  (this.cssStyle = null),
                  (this.forceDataSchema = !!n);
              }
              var o = "http://www.w3.org/1999/xlink",
                i = ["butt", "round", "square"],
                a = ["miter", "round", "bevel"],
                r = 0,
                c = 0;
              return (
                (n.prototype = {
                  save: function () {
                    this.transformStack.push(this.transformMatrix);
                    var e = this.current;
                    this.extraStack.push(e), (this.current = e.clone());
                  },
                  restore: function () {
                    (this.transformMatrix = this.transformStack.pop()),
                      (this.current = this.extraStack.pop()),
                      (this.pendingClip = null),
                      (this.tgrp = null);
                  },
                  group: function (e) {
                    this.save(), this.executeOpTree(e), this.restore();
                  },
                  loadDependencies: function (e) {
                    for (
                      var t = this,
                        n = e.fnArray,
                        o = n.length,
                        i = e.argsArray,
                        a = 0;
                      a < o;
                      a++
                    )
                      if (s.OPS.dependency === n[a])
                        for (var r = i[a], l = 0, c = r.length; l < c; l++) {
                          var d,
                            u = r[l],
                            p = "g_" === u.substring(0, 2);
                          (d = new Promise(
                            p
                              ? function (e) {
                                  t.commonObjs.get(u, e);
                                }
                              : function (e) {
                                  t.objs.get(u, e);
                                }
                          )),
                            this.current.dependencies.push(d);
                        }
                    return Promise.all(this.current.dependencies);
                  },
                  transform: function (e, t, n, o, i, a) {
                    var r = [e, t, n, o, i, a];
                    (this.transformMatrix = s.Util.transform(
                      this.transformMatrix,
                      r
                    )),
                      (this.tgrp = null);
                  },
                  getSVG: function (e, t) {
                    var n = this;
                    this.viewport = t;
                    var o = this._initialize(t);
                    return this.loadDependencies(e).then(function () {
                      n.transformMatrix = s.IDENTITY_MATRIX;
                      var t = n.convertOpList(e);
                      return n.executeOpTree(t), o;
                    });
                  },
                  convertOpList: function (e) {
                    var t = e.argsArray,
                      n = e.fnArray,
                      o = n.length,
                      i = [],
                      a = [];
                    for (var r in s.OPS) i[s.OPS[r]] = r;
                    for (var l = 0; l < o; l++) {
                      var c = n[l];
                      a.push({ fnId: c, fn: i[c], args: t[l] });
                    }
                    return (function (e) {
                      for (var t = [], n = [], o = e.length, i = 0; i < o; i++)
                        "save" !== e[i].fn
                          ? "restore" === e[i].fn
                            ? (t = n.pop())
                            : t.push(e[i])
                          : (t.push({ fnId: 92, fn: "group", items: [] }),
                            n.push(t),
                            (t = t[t.length - 1].items));
                      return t;
                    })(a);
                  },
                  executeOpTree: function (e) {
                    for (var t = e.length, n = 0; n < t; n++) {
                      var o = e[n].fn,
                        i = e[n].fnId,
                        a = e[n].args;
                      switch (0 | i) {
                        case s.OPS.beginText:
                          this.beginText();
                          break;
                        case s.OPS.dependency:
                          break;
                        case s.OPS.setLeading:
                          this.setLeading(a);
                          break;
                        case s.OPS.setLeadingMoveText:
                          this.setLeadingMoveText(a[0], a[1]);
                          break;
                        case s.OPS.setFont:
                          this.setFont(a);
                          break;
                        case s.OPS.showText:
                        case s.OPS.showSpacedText:
                          this.showText(a[0]);
                          break;
                        case s.OPS.endText:
                          this.endText();
                          break;
                        case s.OPS.moveText:
                          this.moveText(a[0], a[1]);
                          break;
                        case s.OPS.setCharSpacing:
                          this.setCharSpacing(a[0]);
                          break;
                        case s.OPS.setWordSpacing:
                          this.setWordSpacing(a[0]);
                          break;
                        case s.OPS.setHScale:
                          this.setHScale(a[0]);
                          break;
                        case s.OPS.setTextMatrix:
                          this.setTextMatrix(
                            a[0],
                            a[1],
                            a[2],
                            a[3],
                            a[4],
                            a[5]
                          );
                          break;
                        case s.OPS.setTextRise:
                          this.setTextRise(a[0]);
                          break;
                        case s.OPS.setTextRenderingMode:
                          this.setTextRenderingMode(a[0]);
                          break;
                        case s.OPS.setLineWidth:
                          this.setLineWidth(a[0]);
                          break;
                        case s.OPS.setLineJoin:
                          this.setLineJoin(a[0]);
                          break;
                        case s.OPS.setLineCap:
                          this.setLineCap(a[0]);
                          break;
                        case s.OPS.setMiterLimit:
                          this.setMiterLimit(a[0]);
                          break;
                        case s.OPS.setFillRGBColor:
                          this.setFillRGBColor(a[0], a[1], a[2]);
                          break;
                        case s.OPS.setStrokeRGBColor:
                          this.setStrokeRGBColor(a[0], a[1], a[2]);
                          break;
                        case s.OPS.setDash:
                          this.setDash(a[0], a[1]);
                          break;
                        case s.OPS.setGState:
                          this.setGState(a[0]);
                          break;
                        case s.OPS.fill:
                          this.fill();
                          break;
                        case s.OPS.eoFill:
                          this.eoFill();
                          break;
                        case s.OPS.stroke:
                          this.stroke();
                          break;
                        case s.OPS.fillStroke:
                          this.fillStroke();
                          break;
                        case s.OPS.eoFillStroke:
                          this.eoFillStroke();
                          break;
                        case s.OPS.clip:
                          this.clip("nonzero");
                          break;
                        case s.OPS.eoClip:
                          this.clip("evenodd");
                          break;
                        case s.OPS.paintSolidColorImageMask:
                          this.paintSolidColorImageMask();
                          break;
                        case s.OPS.paintJpegXObject:
                          this.paintJpegXObject(a[0], a[1], a[2]);
                          break;
                        case s.OPS.paintImageXObject:
                          this.paintImageXObject(a[0]);
                          break;
                        case s.OPS.paintInlineImageXObject:
                          this.paintInlineImageXObject(a[0]);
                          break;
                        case s.OPS.paintImageMaskXObject:
                          this.paintImageMaskXObject(a[0]);
                          break;
                        case s.OPS.paintFormXObjectBegin:
                          this.paintFormXObjectBegin(a[0], a[1]);
                          break;
                        case s.OPS.paintFormXObjectEnd:
                          this.paintFormXObjectEnd();
                          break;
                        case s.OPS.closePath:
                          this.closePath();
                          break;
                        case s.OPS.closeStroke:
                          this.closeStroke();
                          break;
                        case s.OPS.closeFillStroke:
                          this.closeFillStroke();
                          break;
                        case s.OPS.closeEOFillStroke:
                          this.closeEOFillStroke();
                          break;
                        case s.OPS.nextLine:
                          this.nextLine();
                          break;
                        case s.OPS.transform:
                          this.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
                          break;
                        case s.OPS.constructPath:
                          this.constructPath(a[0], a[1]);
                          break;
                        case s.OPS.endPath:
                          this.endPath();
                          break;
                        case 92:
                          this.group(e[n].items);
                          break;
                        default:
                          (0, s.warn)("Unimplemented operator " + o);
                      }
                    }
                  },
                  setWordSpacing: function (e) {
                    this.current.wordSpacing = e;
                  },
                  setCharSpacing: function (e) {
                    this.current.charSpacing = e;
                  },
                  nextLine: function () {
                    this.moveText(0, this.current.leading);
                  },
                  setTextMatrix: function (t, n, o, i, a, r) {
                    var s = this.current;
                    (this.current.textMatrix = this.current.lineMatrix =
                      [t, n, o, i, a, r]),
                      (this.current.x = this.current.lineX = 0),
                      (this.current.y = this.current.lineY = 0),
                      (s.xcoords = []),
                      (s.tspan = this.svgFactory.createElement("svg:tspan")),
                      s.tspan.setAttributeNS(null, "font-family", s.fontFamily),
                      s.tspan.setAttributeNS(
                        null,
                        "font-size",
                        e(s.fontSize) + "px"
                      ),
                      s.tspan.setAttributeNS(null, "y", e(-s.y)),
                      (s.txtElement =
                        this.svgFactory.createElement("svg:text")),
                      s.txtElement.appendChild(s.tspan);
                  },
                  beginText: function () {
                    (this.current.x = this.current.lineX = 0),
                      (this.current.y = this.current.lineY = 0),
                      (this.current.textMatrix = s.IDENTITY_MATRIX),
                      (this.current.lineMatrix = s.IDENTITY_MATRIX),
                      (this.current.tspan =
                        this.svgFactory.createElement("svg:tspan")),
                      (this.current.txtElement =
                        this.svgFactory.createElement("svg:text")),
                      (this.current.txtgrp =
                        this.svgFactory.createElement("svg:g")),
                      (this.current.xcoords = []);
                  },
                  moveText: function (t, n) {
                    var o = this.current;
                    (this.current.x = this.current.lineX += t),
                      (this.current.y = this.current.lineY += n),
                      (o.xcoords = []),
                      (o.tspan = this.svgFactory.createElement("svg:tspan")),
                      o.tspan.setAttributeNS(null, "font-family", o.fontFamily),
                      o.tspan.setAttributeNS(
                        null,
                        "font-size",
                        e(o.fontSize) + "px"
                      ),
                      o.tspan.setAttributeNS(null, "y", e(-o.y));
                  },
                  showText: function (n) {
                    var o = this.current,
                      i = o.font,
                      a = o.fontSize;
                    if (0 !== a) {
                      var r,
                        l = o.charSpacing,
                        c = o.wordSpacing,
                        d = o.fontDirection,
                        p = o.textHScale * d,
                        g = n.length,
                        h = i.vertical,
                        f = a * o.fontMatrix[0],
                        m = 0;
                      for (r = 0; r < g; ++r) {
                        var y = n[r];
                        if (null !== y)
                          if ((0, s.isNum)(y)) m += -y * a * 0.001;
                          else {
                            var v = y.width,
                              _ = y.fontChar,
                              b = v * f + ((y.isSpace ? c : 0) + l) * d;
                            y.isInFont || i.missingFile
                              ? (o.xcoords.push(o.x + m * p),
                                (o.tspan.textContent += _),
                                (m += b))
                              : (m += b);
                          }
                        else m += d * c;
                      }
                      h ? (o.y -= m * p) : (o.x += m * p),
                        o.tspan.setAttributeNS(
                          null,
                          "x",
                          o.xcoords.map(e).join(" ")
                        ),
                        o.tspan.setAttributeNS(null, "y", e(-o.y)),
                        o.tspan.setAttributeNS(
                          null,
                          "font-family",
                          o.fontFamily
                        ),
                        o.tspan.setAttributeNS(
                          null,
                          "font-size",
                          e(o.fontSize) + "px"
                        ),
                        o.fontStyle !== u.fontStyle &&
                          o.tspan.setAttributeNS(
                            null,
                            "font-style",
                            o.fontStyle
                          ),
                        o.fontWeight !== u.fontWeight &&
                          o.tspan.setAttributeNS(
                            null,
                            "font-weight",
                            o.fontWeight
                          );
                      var w =
                        o.textRenderingMode &
                        s.TextRenderingMode.FILL_STROKE_MASK;
                      w === s.TextRenderingMode.FILL ||
                      w === s.TextRenderingMode.FILL_STROKE
                        ? (o.fillColor !== u.fillColor &&
                            o.tspan.setAttributeNS(null, "fill", o.fillColor),
                          o.fillAlpha < 1 &&
                            o.tspan.setAttributeNS(
                              null,
                              "fill-opacity",
                              o.fillAlpha
                            ))
                        : o.textRenderingMode ===
                          s.TextRenderingMode.ADD_TO_PATH
                        ? o.tspan.setAttributeNS(null, "fill", "transparent")
                        : o.tspan.setAttributeNS(null, "fill", "none"),
                        (w !== s.TextRenderingMode.STROKE &&
                          w !== s.TextRenderingMode.FILL_STROKE) ||
                          this._setStrokeAttributes(o.tspan);
                      var C = o.textMatrix;
                      0 !== o.textRise && ((C = C.slice())[5] += o.textRise),
                        o.txtElement.setAttributeNS(
                          null,
                          "transform",
                          t(C) + " scale(1, -1)"
                        ),
                        o.txtElement.setAttributeNS(
                          "http://www.w3.org/XML/1998/namespace",
                          "xml:space",
                          "preserve"
                        ),
                        o.txtElement.appendChild(o.tspan),
                        o.txtgrp.appendChild(o.txtElement),
                        this._ensureTransformGroup().appendChild(o.txtElement);
                    }
                  },
                  setLeadingMoveText: function (e, t) {
                    this.setLeading(-t), this.moveText(e, t);
                  },
                  addFontStyle: function (e) {
                    this.cssStyle ||
                      ((this.cssStyle =
                        this.svgFactory.createElement("svg:style")),
                      this.cssStyle.setAttributeNS(null, "type", "text/css"),
                      this.defs.appendChild(this.cssStyle));
                    var t = (0, s.createObjectURL)(
                      e.data,
                      e.mimetype,
                      this.forceDataSchema
                    );
                    this.cssStyle.textContent +=
                      '@font-face { font-family: "' +
                      e.loadedName +
                      '"; src: url(' +
                      t +
                      "); }\n";
                  },
                  setFont: function (t) {
                    var n = this.current,
                      o = this.commonObjs.get(t[0]),
                      i = t[1];
                    (this.current.font = o),
                      this.embedFonts &&
                        o.data &&
                        !this.embeddedFonts[o.loadedName] &&
                        (this.addFontStyle(o),
                        (this.embeddedFonts[o.loadedName] = o)),
                      (n.fontMatrix = o.fontMatrix
                        ? o.fontMatrix
                        : s.FONT_IDENTITY_MATRIX);
                    var a = o.black
                        ? o.bold
                          ? "bolder"
                          : "bold"
                        : o.bold
                        ? "bold"
                        : "normal",
                      r = o.italic ? "italic" : "normal";
                    i < 0
                      ? ((i = -i), (n.fontDirection = -1))
                      : (n.fontDirection = 1),
                      (n.fontSize = i),
                      (n.fontFamily = o.loadedName),
                      (n.fontWeight = a),
                      (n.fontStyle = r),
                      (n.tspan = this.svgFactory.createElement("svg:tspan")),
                      n.tspan.setAttributeNS(null, "y", e(-n.y)),
                      (n.xcoords = []);
                  },
                  endText: function () {
                    var e = this.current;
                    e.textRenderingMode &
                      s.TextRenderingMode.ADD_TO_PATH_FLAG &&
                      e.txtElement &&
                      e.txtElement.hasChildNodes() &&
                      ((e.element = e.txtElement),
                      this.clip("nonzero"),
                      this.endPath());
                  },
                  setLineWidth: function (e) {
                    e > 0 && (this.current.lineWidth = e);
                  },
                  setLineCap: function (e) {
                    this.current.lineCap = i[e];
                  },
                  setLineJoin: function (e) {
                    this.current.lineJoin = a[e];
                  },
                  setMiterLimit: function (e) {
                    this.current.miterLimit = e;
                  },
                  setStrokeAlpha: function (e) {
                    this.current.strokeAlpha = e;
                  },
                  setStrokeRGBColor: function (e, t, n) {
                    var o = s.Util.makeCssRgb(e, t, n);
                    this.current.strokeColor = o;
                  },
                  setFillAlpha: function (e) {
                    this.current.fillAlpha = e;
                  },
                  setFillRGBColor: function (e, t, n) {
                    var o = s.Util.makeCssRgb(e, t, n);
                    (this.current.fillColor = o),
                      (this.current.tspan =
                        this.svgFactory.createElement("svg:tspan")),
                      (this.current.xcoords = []);
                  },
                  setDash: function (e, t) {
                    (this.current.dashArray = e), (this.current.dashPhase = t);
                  },
                  constructPath: function (t, n) {
                    var o = this.current,
                      i = o.x,
                      a = o.y;
                    o.path = this.svgFactory.createElement("svg:path");
                    for (var r = [], l = t.length, c = 0, d = 0; c < l; c++)
                      switch (0 | t[c]) {
                        case s.OPS.rectangle:
                          (i = n[d++]), (a = n[d++]);
                          var u = i + n[d++],
                            p = a + n[d++];
                          r.push(
                            "M",
                            e(i),
                            e(a),
                            "L",
                            e(u),
                            e(a),
                            "L",
                            e(u),
                            e(p),
                            "L",
                            e(i),
                            e(p),
                            "Z"
                          );
                          break;
                        case s.OPS.moveTo:
                          (i = n[d++]), (a = n[d++]), r.push("M", e(i), e(a));
                          break;
                        case s.OPS.lineTo:
                          (i = n[d++]), (a = n[d++]), r.push("L", e(i), e(a));
                          break;
                        case s.OPS.curveTo:
                          (i = n[d + 4]),
                            (a = n[d + 5]),
                            r.push(
                              "C",
                              e(n[d]),
                              e(n[d + 1]),
                              e(n[d + 2]),
                              e(n[d + 3]),
                              e(i),
                              e(a)
                            ),
                            (d += 6);
                          break;
                        case s.OPS.curveTo2:
                          (i = n[d + 2]),
                            (a = n[d + 3]),
                            r.push(
                              "C",
                              e(i),
                              e(a),
                              e(n[d]),
                              e(n[d + 1]),
                              e(n[d + 2]),
                              e(n[d + 3])
                            ),
                            (d += 4);
                          break;
                        case s.OPS.curveTo3:
                          (i = n[d + 2]),
                            (a = n[d + 3]),
                            r.push(
                              "C",
                              e(n[d]),
                              e(n[d + 1]),
                              e(i),
                              e(a),
                              e(i),
                              e(a)
                            ),
                            (d += 4);
                          break;
                        case s.OPS.closePath:
                          r.push("Z");
                      }
                    o.path.setAttributeNS(null, "d", r.join(" ")),
                      o.path.setAttributeNS(null, "fill", "none"),
                      this._ensureTransformGroup().appendChild(o.path),
                      (o.element = o.path),
                      o.setCurrentPoint(i, a);
                  },
                  endPath: function () {
                    if (this.pendingClip) {
                      var e = this.current,
                        n = "clippath" + r;
                      r++;
                      var o = this.svgFactory.createElement("svg:clipPath");
                      o.setAttributeNS(null, "id", n),
                        o.setAttributeNS(
                          null,
                          "transform",
                          t(this.transformMatrix)
                        );
                      var i = e.element.cloneNode(!0);
                      "evenodd" === this.pendingClip
                        ? i.setAttributeNS(null, "clip-rule", "evenodd")
                        : i.setAttributeNS(null, "clip-rule", "nonzero"),
                        (this.pendingClip = null),
                        o.appendChild(i),
                        this.defs.appendChild(o),
                        e.activeClipUrl &&
                          ((e.clipGroup = null),
                          this.extraStack.forEach(function (e) {
                            e.clipGroup = null;
                          }),
                          o.setAttributeNS(null, "clip-path", e.activeClipUrl)),
                        (e.activeClipUrl = "url(#" + n + ")"),
                        (this.tgrp = null);
                    }
                  },
                  clip: function (e) {
                    this.pendingClip = e;
                  },
                  closePath: function () {
                    var e = this.current;
                    if (e.path) {
                      var t = e.path.getAttributeNS(null, "d");
                      (t += "Z"), e.path.setAttributeNS(null, "d", t);
                    }
                  },
                  setLeading: function (e) {
                    this.current.leading = -e;
                  },
                  setTextRise: function (e) {
                    this.current.textRise = e;
                  },
                  setTextRenderingMode: function (e) {
                    this.current.textRenderingMode = e;
                  },
                  setHScale: function (e) {
                    this.current.textHScale = e / 100;
                  },
                  setGState: function (e) {
                    for (var t = 0, n = e.length; t < n; t++) {
                      var o = e[t],
                        i = o[0],
                        a = o[1];
                      switch (i) {
                        case "LW":
                          this.setLineWidth(a);
                          break;
                        case "LC":
                          this.setLineCap(a);
                          break;
                        case "LJ":
                          this.setLineJoin(a);
                          break;
                        case "ML":
                          this.setMiterLimit(a);
                          break;
                        case "D":
                          this.setDash(a[0], a[1]);
                          break;
                        case "Font":
                          this.setFont(a);
                          break;
                        case "CA":
                          this.setStrokeAlpha(a);
                          break;
                        case "ca":
                          this.setFillAlpha(a);
                          break;
                        default:
                          (0, s.warn)("Unimplemented graphic state " + i);
                      }
                    }
                  },
                  fill: function () {
                    var e = this.current;
                    e.element &&
                      (e.element.setAttributeNS(null, "fill", e.fillColor),
                      e.element.setAttributeNS(
                        null,
                        "fill-opacity",
                        e.fillAlpha
                      ),
                      this.endPath());
                  },
                  stroke: function () {
                    var e = this.current;
                    e.element &&
                      (this._setStrokeAttributes(e.element),
                      e.element.setAttributeNS(null, "fill", "none"),
                      this.endPath());
                  },
                  _setStrokeAttributes: function (t) {
                    var n = this.current;
                    t.setAttributeNS(null, "stroke", n.strokeColor),
                      t.setAttributeNS(null, "stroke-opacity", n.strokeAlpha),
                      t.setAttributeNS(
                        null,
                        "stroke-miterlimit",
                        e(n.miterLimit)
                      ),
                      t.setAttributeNS(null, "stroke-linecap", n.lineCap),
                      t.setAttributeNS(null, "stroke-linejoin", n.lineJoin),
                      t.setAttributeNS(
                        null,
                        "stroke-width",
                        e(n.lineWidth) + "px"
                      ),
                      t.setAttributeNS(
                        null,
                        "stroke-dasharray",
                        n.dashArray.map(e).join(" ")
                      ),
                      t.setAttributeNS(
                        null,
                        "stroke-dashoffset",
                        e(n.dashPhase) + "px"
                      );
                  },
                  eoFill: function () {
                    this.current.element &&
                      this.current.element.setAttributeNS(
                        null,
                        "fill-rule",
                        "evenodd"
                      ),
                      this.fill();
                  },
                  fillStroke: function () {
                    this.stroke(), this.fill();
                  },
                  eoFillStroke: function () {
                    this.current.element &&
                      this.current.element.setAttributeNS(
                        null,
                        "fill-rule",
                        "evenodd"
                      ),
                      this.fillStroke();
                  },
                  closeStroke: function () {
                    this.closePath(), this.stroke();
                  },
                  closeFillStroke: function () {
                    this.closePath(), this.fillStroke();
                  },
                  closeEOFillStroke: function () {
                    this.closePath(), this.eoFillStroke();
                  },
                  paintSolidColorImageMask: function () {
                    var e = this.current,
                      t = this.svgFactory.createElement("svg:rect");
                    t.setAttributeNS(null, "x", "0"),
                      t.setAttributeNS(null, "y", "0"),
                      t.setAttributeNS(null, "width", "1px"),
                      t.setAttributeNS(null, "height", "1px"),
                      t.setAttributeNS(null, "fill", e.fillColor),
                      this._ensureTransformGroup().appendChild(t);
                  },
                  paintJpegXObject: function (t, n, i) {
                    var a = this.objs.get(t),
                      r = this.svgFactory.createElement("svg:image");
                    r.setAttributeNS(o, "xlink:href", a.src),
                      r.setAttributeNS(null, "width", e(n)),
                      r.setAttributeNS(null, "height", e(i)),
                      r.setAttributeNS(null, "x", "0"),
                      r.setAttributeNS(null, "y", e(-i)),
                      r.setAttributeNS(
                        null,
                        "transform",
                        "scale(" + e(1 / n) + " " + e(-1 / i) + ")"
                      ),
                      this._ensureTransformGroup().appendChild(r);
                  },
                  paintImageXObject: function (e) {
                    var t = this.objs.get(e);
                    t
                      ? this.paintInlineImageXObject(t)
                      : (0, s.warn)("Dependent image isn't ready yet");
                  },
                  paintInlineImageXObject: function (t, n) {
                    var i = t.width,
                      a = t.height,
                      r = p(t, this.forceDataSchema, !!n),
                      s = this.svgFactory.createElement("svg:rect");
                    s.setAttributeNS(null, "x", "0"),
                      s.setAttributeNS(null, "y", "0"),
                      s.setAttributeNS(null, "width", e(i)),
                      s.setAttributeNS(null, "height", e(a)),
                      (this.current.element = s),
                      this.clip("nonzero");
                    var l = this.svgFactory.createElement("svg:image");
                    l.setAttributeNS(o, "xlink:href", r),
                      l.setAttributeNS(null, "x", "0"),
                      l.setAttributeNS(null, "y", e(-a)),
                      l.setAttributeNS(null, "width", e(i) + "px"),
                      l.setAttributeNS(null, "height", e(a) + "px"),
                      l.setAttributeNS(
                        null,
                        "transform",
                        "scale(" + e(1 / i) + " " + e(-1 / a) + ")"
                      ),
                      n
                        ? n.appendChild(l)
                        : this._ensureTransformGroup().appendChild(l);
                  },
                  paintImageMaskXObject: function (t) {
                    var n = this.current,
                      o = t.width,
                      i = t.height,
                      a = n.fillColor;
                    n.maskId = "mask" + c++;
                    var r = this.svgFactory.createElement("svg:mask");
                    r.setAttributeNS(null, "id", n.maskId);
                    var s = this.svgFactory.createElement("svg:rect");
                    s.setAttributeNS(null, "x", "0"),
                      s.setAttributeNS(null, "y", "0"),
                      s.setAttributeNS(null, "width", e(o)),
                      s.setAttributeNS(null, "height", e(i)),
                      s.setAttributeNS(null, "fill", a),
                      s.setAttributeNS(null, "mask", "url(#" + n.maskId + ")"),
                      this.defs.appendChild(r),
                      this._ensureTransformGroup().appendChild(s),
                      this.paintInlineImageXObject(t, r);
                  },
                  paintFormXObjectBegin: function (t, n) {
                    if (
                      (Array.isArray(t) &&
                        6 === t.length &&
                        this.transform(t[0], t[1], t[2], t[3], t[4], t[5]),
                      n)
                    ) {
                      var o = n[2] - n[0],
                        i = n[3] - n[1],
                        a = this.svgFactory.createElement("svg:rect");
                      a.setAttributeNS(null, "x", n[0]),
                        a.setAttributeNS(null, "y", n[1]),
                        a.setAttributeNS(null, "width", e(o)),
                        a.setAttributeNS(null, "height", e(i)),
                        (this.current.element = a),
                        this.clip("nonzero"),
                        this.endPath();
                    }
                  },
                  paintFormXObjectEnd: function () {},
                  _initialize: function (e) {
                    var n = this.svgFactory.create(e.width, e.height),
                      o = this.svgFactory.createElement("svg:defs");
                    n.appendChild(o), (this.defs = o);
                    var i = this.svgFactory.createElement("svg:g");
                    return (
                      i.setAttributeNS(null, "transform", t(e.transform)),
                      n.appendChild(i),
                      (this.svg = i),
                      n
                    );
                  },
                  _ensureClipGroup: function () {
                    if (!this.current.clipGroup) {
                      var e = this.svgFactory.createElement("svg:g");
                      e.setAttributeNS(
                        null,
                        "clip-path",
                        this.current.activeClipUrl
                      ),
                        this.svg.appendChild(e),
                        (this.current.clipGroup = e);
                    }
                    return this.current.clipGroup;
                  },
                  _ensureTransformGroup: function () {
                    return (
                      this.tgrp ||
                        ((this.tgrp = this.svgFactory.createElement("svg:g")),
                        this.tgrp.setAttributeNS(
                          null,
                          "transform",
                          t(this.transformMatrix)
                        ),
                        this.current.activeClipUrl
                          ? this._ensureClipGroup().appendChild(this.tgrp)
                          : this.svg.appendChild(this.tgrp)),
                      this.tgrp
                    );
                  },
                }),
                n
              );
            })();
          },
          function (e, t, o) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.PDFNodeStream = void 0);
            var i,
              a = (i = o(147)) && i.__esModule ? i : { default: i },
              r = o(1),
              s = o(166);
            function l(e) {
              return (l =
                "function" == typeof Symbol &&
                "symbol" == typeof Symbol.iterator
                  ? function (e) {
                      return typeof e;
                    }
                  : function (e) {
                      return e &&
                        "function" == typeof Symbol &&
                        e.constructor === Symbol &&
                        e !== Symbol.prototype
                        ? "symbol"
                        : typeof e;
                    })(e);
            }
            function c(e, t) {
              return !t || ("object" !== l(t) && "function" != typeof t)
                ? (function (e) {
                    if (void 0 === e)
                      throw new ReferenceError(
                        "this hasn't been initialised - super() hasn't been called"
                      );
                    return e;
                  })(e)
                : t;
            }
            function d(e) {
              return (d = Object.setPrototypeOf
                ? Object.getPrototypeOf
                : function (e) {
                    return e.__proto__ || Object.getPrototypeOf(e);
                  })(e);
            }
            function u(e, t) {
              if ("function" != typeof t && null !== t)
                throw new TypeError(
                  "Super expression must either be null or a function"
                );
              (e.prototype = Object.create(t && t.prototype, {
                constructor: { value: e, writable: !0, configurable: !0 },
              })),
                t && p(e, t);
            }
            function p(e, t) {
              return (p =
                Object.setPrototypeOf ||
                function (e, t) {
                  return (e.__proto__ = t), e;
                })(e, t);
            }
            function g(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function h(e) {
              return function () {
                var t = this,
                  n = arguments;
                return new Promise(function (o, i) {
                  var a = e.apply(t, n);
                  function r(e) {
                    g(a, o, i, r, s, "next", e);
                  }
                  function s(e) {
                    g(a, o, i, r, s, "throw", e);
                  }
                  r(void 0);
                });
              };
            }
            function f(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function m(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function y(e, t, n) {
              return t && m(e.prototype, t), n && m(e, n), e;
            }
            var v = n(178),
              _ = n(571),
              b = n(572),
              w = n(570),
              C = /^file:\/\/\/[a-zA-Z]:\//,
              x = (function () {
                function e(t) {
                  var n, o;
                  f(this, e),
                    (this.source = t),
                    (this.url =
                      ((n = t.url),
                      "file:" === (o = w.parse(n)).protocol || o.host
                        ? o
                        : /^[a-z]:[/\\]/i.test(n)
                        ? w.parse("file:///".concat(n))
                        : (o.host || (o.protocol = "file:"), o))),
                    (this.isHttp =
                      "http:" === this.url.protocol ||
                      "https:" === this.url.protocol),
                    (this.isFsUrl = "file:" === this.url.protocol),
                    (this.httpHeaders = (this.isHttp && t.httpHeaders) || {}),
                    (this._fullRequest = null),
                    (this._rangeRequestReaders = []);
                }
                return (
                  y(e, [
                    {
                      key: "getFullReader",
                      value: function () {
                        return (
                          (0, r.assert)(!this._fullRequest),
                          (this._fullRequest = this.isFsUrl
                            ? new P(this)
                            : new T(this)),
                          this._fullRequest
                        );
                      },
                    },
                    {
                      key: "getRangeReader",
                      value: function (e, t) {
                        var n = this.isFsUrl
                          ? new D(this, e, t)
                          : new G(this, e, t);
                        return this._rangeRequestReaders.push(n), n;
                      },
                    },
                    {
                      key: "cancelAllRequests",
                      value: function (e) {
                        this._fullRequest && this._fullRequest.cancel(e),
                          this._rangeRequestReaders
                            .slice(0)
                            .forEach(function (t) {
                              t.cancel(e);
                            });
                      },
                    },
                  ]),
                  e
                );
              })();
            t.PDFNodeStream = x;
            var S = (function () {
                function e(t) {
                  f(this, e),
                    (this._url = t.url),
                    (this._done = !1),
                    (this._storedError = null),
                    (this.onProgress = null);
                  var n = t.source;
                  (this._contentLength = n.length),
                    (this._loaded = 0),
                    (this._filename = null),
                    (this._disableRange = n.disableRange || !1),
                    (this._rangeChunkSize = n.rangeChunkSize),
                    this._rangeChunkSize ||
                      this._disableRange ||
                      (this._disableRange = !0),
                    (this._isStreamingSupported = !n.disableStream),
                    (this._isRangeSupported = !n.disableRange),
                    (this._readableStream = null),
                    (this._readCapability = (0, r.createPromiseCapability)()),
                    (this._headersCapability = (0,
                    r.createPromiseCapability)());
                }
                var t;
                return (
                  y(e, [
                    {
                      key: "read",
                      value:
                        ((t = h(
                          a.default.mark(function e() {
                            var t, n;
                            return a.default.wrap(
                              function (e) {
                                for (;;)
                                  switch ((e.prev = e.next)) {
                                    case 0:
                                      return (
                                        (e.next = 2),
                                        this._readCapability.promise
                                      );
                                    case 2:
                                      if (!this._done) {
                                        e.next = 4;
                                        break;
                                      }
                                      return e.abrupt("return", {
                                        value: void 0,
                                        done: !0,
                                      });
                                    case 4:
                                      if (!this._storedError) {
                                        e.next = 6;
                                        break;
                                      }
                                      throw this._storedError;
                                    case 6:
                                      if (
                                        null !==
                                        (t = this._readableStream.read())
                                      ) {
                                        e.next = 10;
                                        break;
                                      }
                                      return (
                                        (this._readCapability = (0,
                                        r.createPromiseCapability)()),
                                        e.abrupt("return", this.read())
                                      );
                                    case 10:
                                      return (
                                        (this._loaded += t.length),
                                        this.onProgress &&
                                          this.onProgress({
                                            loaded: this._loaded,
                                            total: this._contentLength,
                                          }),
                                        (n = new Uint8Array(t).buffer),
                                        e.abrupt("return", {
                                          value: n,
                                          done: !1,
                                        })
                                      );
                                    case 14:
                                    case "end":
                                      return e.stop();
                                  }
                              },
                              e,
                              this
                            );
                          })
                        )),
                        function () {
                          return t.apply(this, arguments);
                        }),
                    },
                    {
                      key: "cancel",
                      value: function (e) {
                        this._readableStream
                          ? this._readableStream.destroy(e)
                          : this._error(e);
                      },
                    },
                    {
                      key: "_error",
                      value: function (e) {
                        (this._storedError = e), this._readCapability.resolve();
                      },
                    },
                    {
                      key: "_setReadableStream",
                      value: function (e) {
                        var t = this;
                        (this._readableStream = e),
                          e.on("readable", function () {
                            t._readCapability.resolve();
                          }),
                          e.on("end", function () {
                            e.destroy(),
                              (t._done = !0),
                              t._readCapability.resolve();
                          }),
                          e.on("error", function (e) {
                            t._error(e);
                          }),
                          !this._isStreamingSupported &&
                            this._isRangeSupported &&
                            this._error(
                              new r.AbortException("streaming is disabled")
                            ),
                          this._storedError &&
                            this._readableStream.destroy(this._storedError);
                      },
                    },
                    {
                      key: "headersReady",
                      get: function () {
                        return this._headersCapability.promise;
                      },
                    },
                    {
                      key: "filename",
                      get: function () {
                        return this._filename;
                      },
                    },
                    {
                      key: "contentLength",
                      get: function () {
                        return this._contentLength;
                      },
                    },
                    {
                      key: "isRangeSupported",
                      get: function () {
                        return this._isRangeSupported;
                      },
                    },
                    {
                      key: "isStreamingSupported",
                      get: function () {
                        return this._isStreamingSupported;
                      },
                    },
                  ]),
                  e
                );
              })(),
              E = (function () {
                function e(t) {
                  f(this, e),
                    (this._url = t.url),
                    (this._done = !1),
                    (this._storedError = null),
                    (this.onProgress = null),
                    (this._loaded = 0),
                    (this._readableStream = null),
                    (this._readCapability = (0, r.createPromiseCapability)());
                  var n = t.source;
                  this._isStreamingSupported = !n.disableStream;
                }
                var t;
                return (
                  y(e, [
                    {
                      key: "read",
                      value:
                        ((t = h(
                          a.default.mark(function e() {
                            var t, n;
                            return a.default.wrap(
                              function (e) {
                                for (;;)
                                  switch ((e.prev = e.next)) {
                                    case 0:
                                      return (
                                        (e.next = 2),
                                        this._readCapability.promise
                                      );
                                    case 2:
                                      if (!this._done) {
                                        e.next = 4;
                                        break;
                                      }
                                      return e.abrupt("return", {
                                        value: void 0,
                                        done: !0,
                                      });
                                    case 4:
                                      if (!this._storedError) {
                                        e.next = 6;
                                        break;
                                      }
                                      throw this._storedError;
                                    case 6:
                                      if (
                                        null !==
                                        (t = this._readableStream.read())
                                      ) {
                                        e.next = 10;
                                        break;
                                      }
                                      return (
                                        (this._readCapability = (0,
                                        r.createPromiseCapability)()),
                                        e.abrupt("return", this.read())
                                      );
                                    case 10:
                                      return (
                                        (this._loaded += t.length),
                                        this.onProgress &&
                                          this.onProgress({
                                            loaded: this._loaded,
                                          }),
                                        (n = new Uint8Array(t).buffer),
                                        e.abrupt("return", {
                                          value: n,
                                          done: !1,
                                        })
                                      );
                                    case 14:
                                    case "end":
                                      return e.stop();
                                  }
                              },
                              e,
                              this
                            );
                          })
                        )),
                        function () {
                          return t.apply(this, arguments);
                        }),
                    },
                    {
                      key: "cancel",
                      value: function (e) {
                        this._readableStream
                          ? this._readableStream.destroy(e)
                          : this._error(e);
                      },
                    },
                    {
                      key: "_error",
                      value: function (e) {
                        (this._storedError = e), this._readCapability.resolve();
                      },
                    },
                    {
                      key: "_setReadableStream",
                      value: function (e) {
                        var t = this;
                        (this._readableStream = e),
                          e.on("readable", function () {
                            t._readCapability.resolve();
                          }),
                          e.on("end", function () {
                            e.destroy(),
                              (t._done = !0),
                              t._readCapability.resolve();
                          }),
                          e.on("error", function (e) {
                            t._error(e);
                          }),
                          this._storedError &&
                            this._readableStream.destroy(this._storedError);
                      },
                    },
                    {
                      key: "isStreamingSupported",
                      get: function () {
                        return this._isStreamingSupported;
                      },
                    },
                  ]),
                  e
                );
              })();
            function A(e, t) {
              return {
                protocol: e.protocol,
                auth: e.auth,
                host: e.hostname,
                port: e.port,
                path: e.path,
                method: "GET",
                headers: t,
              };
            }
            var T = (function (e) {
                function t(e) {
                  var n;
                  f(this, t);
                  var o = function (t) {
                    if (404 === t.statusCode) {
                      var o = new r.MissingPDFException(
                        'Missing PDF "'.concat(n._url, '".')
                      );
                      return (
                        (n._storedError = o),
                        void n._headersCapability.reject(o)
                      );
                    }
                    n._headersCapability.resolve(), n._setReadableStream(t);
                    var i = function (e) {
                        return n._readableStream.headers[e.toLowerCase()];
                      },
                      a = (0, s.validateRangeRequestCapabilities)({
                        getResponseHeader: i,
                        isHttp: e.isHttp,
                        rangeChunkSize: n._rangeChunkSize,
                        disableRange: n._disableRange,
                      }),
                      l = a.allowRangeRequests,
                      c = a.suggestedLength;
                    (n._isRangeSupported = l),
                      (n._contentLength = c || n._contentLength),
                      (n._filename = (0, s.extractFilenameFromHeader)(i));
                  };
                  return (
                    ((n = c(this, d(t).call(this, e)))._request = null),
                    "http:" === n._url.protocol
                      ? (n._request = _.request(A(n._url, e.httpHeaders), o))
                      : (n._request = b.request(A(n._url, e.httpHeaders), o)),
                    n._request.on("error", function (e) {
                      (n._storedError = e), n._headersCapability.reject(e);
                    }),
                    n._request.end(),
                    n
                  );
                }
                return u(t, e), t;
              })(S),
              G = (function (e) {
                function t(e, n, o) {
                  var i;
                  for (var a in (f(this, t),
                  ((i = c(this, d(t).call(this, e)))._httpHeaders = {}),
                  e.httpHeaders)) {
                    var s = e.httpHeaders[a];
                    void 0 !== s && (i._httpHeaders[a] = s);
                  }
                  i._httpHeaders.Range = "bytes=".concat(n, "-").concat(o - 1);
                  var l = function (e) {
                    if (404 !== e.statusCode) i._setReadableStream(e);
                    else {
                      var t = new r.MissingPDFException(
                        'Missing PDF "'.concat(i._url, '".')
                      );
                      i._storedError = t;
                    }
                  };
                  return (
                    (i._request = null),
                    "http:" === i._url.protocol
                      ? (i._request = _.request(A(i._url, i._httpHeaders), l))
                      : (i._request = b.request(A(i._url, i._httpHeaders), l)),
                    i._request.on("error", function (e) {
                      i._storedError = e;
                    }),
                    i._request.end(),
                    i
                  );
                }
                return u(t, e), t;
              })(E),
              P = (function (e) {
                function t(e) {
                  var n;
                  f(this, t), (n = c(this, d(t).call(this, e)));
                  var o = decodeURIComponent(n._url.path);
                  return (
                    C.test(n._url.href) && (o = o.replace(/^\//, "")),
                    v.lstat(o, function (e, t) {
                      if (e)
                        return (
                          "ENOENT" === e.code &&
                            (e = new r.MissingPDFException(
                              'Missing PDF "'.concat(o, '".')
                            )),
                          (n._storedError = e),
                          void n._headersCapability.reject(e)
                        );
                      (n._contentLength = t.size),
                        n._setReadableStream(v.createReadStream(o)),
                        n._headersCapability.resolve();
                    }),
                    n
                  );
                }
                return u(t, e), t;
              })(S),
              D = (function (e) {
                function t(e, n, o) {
                  var i;
                  f(this, t), (i = c(this, d(t).call(this, e)));
                  var a = decodeURIComponent(i._url.path);
                  return (
                    C.test(i._url.href) && (a = a.replace(/^\//, "")),
                    i._setReadableStream(
                      v.createReadStream(a, { start: n, end: o - 1 })
                    ),
                    i
                  );
                }
                return u(t, e), t;
              })(E);
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.createResponseStatusError = function (e, t) {
                return 404 === e || (0 === e && /^file:/.test(t))
                  ? new o.MissingPDFException('Missing PDF "' + t + '".')
                  : new o.UnexpectedResponseException(
                      "Unexpected server response (" +
                        e +
                        ') while retrieving PDF "' +
                        t +
                        '".',
                      e
                    );
              }),
              (t.extractFilenameFromHeader = function (e) {
                var t = e("Content-Disposition");
                if (t) {
                  var n = (0, i.getFilenameFromContentDispositionHeader)(t);
                  if (/\.pdf$/i.test(n)) return n;
                }
                return null;
              }),
              (t.validateRangeRequestCapabilities = function (e) {
                var t = e.getResponseHeader,
                  n = e.isHttp,
                  i = e.rangeChunkSize,
                  a = e.disableRange;
                (0, o.assert)(
                  i > 0,
                  "Range chunk size must be larger than zero"
                );
                var r = { allowRangeRequests: !1, suggestedLength: void 0 },
                  s = parseInt(t("Content-Length"), 10);
                return Number.isInteger(s)
                  ? ((r.suggestedLength = s),
                    s <= 2 * i ||
                      a ||
                      !n ||
                      "bytes" !== t("Accept-Ranges") ||
                      "identity" !== (t("Content-Encoding") || "identity") ||
                      (r.allowRangeRequests = !0),
                    r)
                  : r;
              }),
              (t.validateResponseStatus = function (e) {
                return 200 === e || 206 === e;
              });
            var o = n(1),
              i = n(167);
          },
          function (e, t, n) {
            "use strict";
            function o(e, t) {
              return (
                (function (e) {
                  if (Array.isArray(e)) return e;
                })(e) ||
                (function (e, t) {
                  var n = [],
                    o = !0,
                    i = !1,
                    a = void 0;
                  try {
                    for (
                      var r, s = e[Symbol.iterator]();
                      !(o = (r = s.next()).done) &&
                      (n.push(r.value), !t || n.length !== t);
                      o = !0
                    );
                  } catch (e) {
                    (i = !0), (a = e);
                  } finally {
                    try {
                      o || null == s.return || s.return();
                    } finally {
                      if (i) throw a;
                    }
                  }
                  return n;
                })(e, t) ||
                (function () {
                  throw new TypeError(
                    "Invalid attempt to destructure non-iterable instance"
                  );
                })()
              );
            }
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.getFilenameFromContentDispositionHeader = function (e) {
                var t = !0,
                  n = r("filename\\*", "i").exec(e);
                if (n) {
                  var i = c((n = n[1]));
                  return l((i = u((i = d((i = unescape(i)))))));
                }
                if (
                  (n = (function (e) {
                    for (
                      var t,
                        n = [],
                        i = r("filename\\*((?!0\\d)\\d+)(\\*?)", "ig");
                      null !== (t = i.exec(e));

                    ) {
                      var a = o(t, 4),
                        s = a[1],
                        l = a[2],
                        u = a[3];
                      if ((s = parseInt(s, 10)) in n) {
                        if (0 === s) break;
                      } else n[s] = [l, u];
                    }
                    var p = [];
                    for (s = 0; s < n.length && s in n; ++s) {
                      var g = o(n[s], 2);
                      (l = g[0]),
                        (u = c((u = g[1]))),
                        l && ((u = unescape(u)), 0 === s && (u = d(u))),
                        p.push(u);
                    }
                    return p.join("");
                  })(e))
                )
                  return l(u(n));
                if ((n = r("filename", "i").exec(e))) {
                  var a = c((n = n[1]));
                  return l((a = u(a)));
                }
                function r(e, t) {
                  return new RegExp(
                    "(?:^|;)\\s*" +
                      e +
                      '\\s*=\\s*([^";\\s][^;\\s]*|"(?:[^"\\\\]|\\\\"?)+"?)',
                    t
                  );
                }
                function s(e, n) {
                  if (e) {
                    if (!/^[\x00-\xFF]+$/.test(n)) return n;
                    try {
                      var o = new TextDecoder(e, { fatal: !0 }),
                        i = Array.from(n, function (e) {
                          return 255 & e.charCodeAt(0);
                        });
                      (n = o.decode(new Uint8Array(i))), (t = !1);
                    } catch (o) {
                      if (/^utf-?8$/i.test(e))
                        try {
                          (n = decodeURIComponent(escape(n))), (t = !1);
                        } catch (e) {}
                    }
                  }
                  return n;
                }
                function l(e) {
                  return (
                    t &&
                      /[\x80-\xff]/.test(e) &&
                      ((e = s("utf-8", e)), t && (e = s("iso-8859-1", e))),
                    e
                  );
                }
                function c(e) {
                  if (e.startsWith('"')) {
                    for (
                      var t = e.slice(1).split('\\"'), n = 0;
                      n < t.length;
                      ++n
                    ) {
                      var o = t[n].indexOf('"');
                      -1 !== o &&
                        ((t[n] = t[n].slice(0, o)), (t.length = n + 1)),
                        (t[n] = t[n].replace(/\\(.)/g, "$1"));
                    }
                    e = t.join('"');
                  }
                  return e;
                }
                function d(e) {
                  var t = e.indexOf("'");
                  return -1 === t
                    ? e
                    : s(e.slice(0, t), e.slice(t + 1).replace(/^[^']*'/, ""));
                }
                function u(e) {
                  return !e.startsWith("=?") || /[\x00-\x19\x80-\xff]/.test(e)
                    ? e
                    : e.replace(
                        /=\?([\w-]*)\?([QqBb])\?((?:[^?]|\?(?!=))*)\?=/g,
                        function (e, t, n, o) {
                          if ("q" === n || "Q" === n)
                            return s(
                              t,
                              (o = (o = o.replace(/_/g, " ")).replace(
                                /=([0-9a-fA-F]{2})/g,
                                function (e, t) {
                                  return String.fromCharCode(parseInt(t, 16));
                                }
                              ))
                            );
                          try {
                            o = atob(o);
                          } catch (e) {}
                          return s(t, o);
                        }
                      );
                }
                return "";
              });
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.PDFFetchStream = void 0);
            var o,
              i = (o = n(147)) && o.__esModule ? o : { default: o },
              a = n(1),
              r = n(166);
            function s(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function l(e) {
              return function () {
                var t = this,
                  n = arguments;
                return new Promise(function (o, i) {
                  var a = e.apply(t, n);
                  function r(e) {
                    s(a, o, i, r, l, "next", e);
                  }
                  function l(e) {
                    s(a, o, i, r, l, "throw", e);
                  }
                  r(void 0);
                });
              };
            }
            function c(e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            }
            function d(e, t) {
              for (var n = 0; n < t.length; n++) {
                var o = t[n];
                (o.enumerable = o.enumerable || !1),
                  (o.configurable = !0),
                  "value" in o && (o.writable = !0),
                  Object.defineProperty(e, o.key, o);
              }
            }
            function u(e, t, n) {
              return t && d(e.prototype, t), n && d(e, n), e;
            }
            function p(e, t, n) {
              return {
                method: "GET",
                headers: e,
                signal: n && n.signal,
                mode: "cors",
                credentials: t ? "include" : "same-origin",
                redirect: "follow",
              };
            }
            var g = (function () {
              function e(t) {
                c(this, e),
                  (this.source = t),
                  (this.isHttp = /^https?:/i.test(t.url)),
                  (this.httpHeaders = (this.isHttp && t.httpHeaders) || {}),
                  (this._fullRequestReader = null),
                  (this._rangeRequestReaders = []);
              }
              return (
                u(e, [
                  {
                    key: "getFullReader",
                    value: function () {
                      return (
                        (0, a.assert)(!this._fullRequestReader),
                        (this._fullRequestReader = new h(this)),
                        this._fullRequestReader
                      );
                    },
                  },
                  {
                    key: "getRangeReader",
                    value: function (e, t) {
                      var n = new f(this, e, t);
                      return this._rangeRequestReaders.push(n), n;
                    },
                  },
                  {
                    key: "cancelAllRequests",
                    value: function (e) {
                      this._fullRequestReader &&
                        this._fullRequestReader.cancel(e),
                        this._rangeRequestReaders
                          .slice(0)
                          .forEach(function (t) {
                            t.cancel(e);
                          });
                    },
                  },
                ]),
                e
              );
            })();
            t.PDFFetchStream = g;
            var h = (function () {
                function e(t) {
                  var n = this;
                  c(this, e),
                    (this._stream = t),
                    (this._reader = null),
                    (this._loaded = 0),
                    (this._filename = null);
                  var o = t.source;
                  for (var i in ((this._withCredentials = o.withCredentials),
                  (this._contentLength = o.length),
                  (this._headersCapability = (0, a.createPromiseCapability)()),
                  (this._disableRange = o.disableRange || !1),
                  (this._rangeChunkSize = o.rangeChunkSize),
                  this._rangeChunkSize ||
                    this._disableRange ||
                    (this._disableRange = !0),
                  "undefined" != typeof AbortController &&
                    (this._abortController = new AbortController()),
                  (this._isStreamingSupported = !o.disableStream),
                  (this._isRangeSupported = !o.disableRange),
                  (this._headers = new Headers()),
                  this._stream.httpHeaders)) {
                    var s = this._stream.httpHeaders[i];
                    void 0 !== s && this._headers.append(i, s);
                  }
                  var l = o.url;
                  fetch(
                    l,
                    p(
                      this._headers,
                      this._withCredentials,
                      this._abortController
                    )
                  )
                    .then(function (e) {
                      if (!(0, r.validateResponseStatus)(e.status))
                        throw (0, r.createResponseStatusError)(e.status, l);
                      (n._reader = e.body.getReader()),
                        n._headersCapability.resolve();
                      var t = function (t) {
                          return e.headers.get(t);
                        },
                        o = (0, r.validateRangeRequestCapabilities)({
                          getResponseHeader: t,
                          isHttp: n._stream.isHttp,
                          rangeChunkSize: n._rangeChunkSize,
                          disableRange: n._disableRange,
                        }),
                        i = o.allowRangeRequests,
                        s = o.suggestedLength;
                      (n._isRangeSupported = i),
                        (n._contentLength = s || n._contentLength),
                        (n._filename = (0, r.extractFilenameFromHeader)(t)),
                        !n._isStreamingSupported &&
                          n._isRangeSupported &&
                          n.cancel(
                            new a.AbortException("streaming is disabled")
                          );
                    })
                    .catch(this._headersCapability.reject),
                    (this.onProgress = null);
                }
                var t;
                return (
                  u(e, [
                    {
                      key: "read",
                      value:
                        ((t = l(
                          i.default.mark(function e() {
                            var t, n, o, a;
                            return i.default.wrap(
                              function (e) {
                                for (;;)
                                  switch ((e.prev = e.next)) {
                                    case 0:
                                      return (
                                        (e.next = 2),
                                        this._headersCapability.promise
                                      );
                                    case 2:
                                      return (e.next = 4), this._reader.read();
                                    case 4:
                                      if (
                                        ((t = e.sent),
                                        (n = t.value),
                                        !(o = t.done))
                                      ) {
                                        e.next = 9;
                                        break;
                                      }
                                      return e.abrupt("return", {
                                        value: n,
                                        done: o,
                                      });
                                    case 9:
                                      return (
                                        (this._loaded += n.byteLength),
                                        this.onProgress &&
                                          this.onProgress({
                                            loaded: this._loaded,
                                            total: this._contentLength,
                                          }),
                                        (a = new Uint8Array(n).buffer),
                                        e.abrupt("return", {
                                          value: a,
                                          done: !1,
                                        })
                                      );
                                    case 13:
                                    case "end":
                                      return e.stop();
                                  }
                              },
                              e,
                              this
                            );
                          })
                        )),
                        function () {
                          return t.apply(this, arguments);
                        }),
                    },
                    {
                      key: "cancel",
                      value: function (e) {
                        this._reader && this._reader.cancel(e),
                          this._abortController &&
                            this._abortController.abort();
                      },
                    },
                    {
                      key: "headersReady",
                      get: function () {
                        return this._headersCapability.promise;
                      },
                    },
                    {
                      key: "filename",
                      get: function () {
                        return this._filename;
                      },
                    },
                    {
                      key: "contentLength",
                      get: function () {
                        return this._contentLength;
                      },
                    },
                    {
                      key: "isRangeSupported",
                      get: function () {
                        return this._isRangeSupported;
                      },
                    },
                    {
                      key: "isStreamingSupported",
                      get: function () {
                        return this._isStreamingSupported;
                      },
                    },
                  ]),
                  e
                );
              })(),
              f = (function () {
                function e(t, n, o) {
                  var i = this;
                  c(this, e),
                    (this._stream = t),
                    (this._reader = null),
                    (this._loaded = 0);
                  var s = t.source;
                  for (var l in ((this._withCredentials = s.withCredentials),
                  (this._readCapability = (0, a.createPromiseCapability)()),
                  (this._isStreamingSupported = !s.disableStream),
                  "undefined" != typeof AbortController &&
                    (this._abortController = new AbortController()),
                  (this._headers = new Headers()),
                  this._stream.httpHeaders)) {
                    var d = this._stream.httpHeaders[l];
                    void 0 !== d && this._headers.append(l, d);
                  }
                  var u = n + "-" + (o - 1);
                  this._headers.append("Range", "bytes=" + u);
                  var g = s.url;
                  fetch(
                    g,
                    p(
                      this._headers,
                      this._withCredentials,
                      this._abortController
                    )
                  ).then(function (e) {
                    if (!(0, r.validateResponseStatus)(e.status))
                      throw (0, r.createResponseStatusError)(e.status, g);
                    i._readCapability.resolve(),
                      (i._reader = e.body.getReader());
                  }),
                    (this.onProgress = null);
                }
                var t;
                return (
                  u(e, [
                    {
                      key: "read",
                      value:
                        ((t = l(
                          i.default.mark(function e() {
                            var t, n, o, a;
                            return i.default.wrap(
                              function (e) {
                                for (;;)
                                  switch ((e.prev = e.next)) {
                                    case 0:
                                      return (
                                        (e.next = 2),
                                        this._readCapability.promise
                                      );
                                    case 2:
                                      return (e.next = 4), this._reader.read();
                                    case 4:
                                      if (
                                        ((t = e.sent),
                                        (n = t.value),
                                        !(o = t.done))
                                      ) {
                                        e.next = 9;
                                        break;
                                      }
                                      return e.abrupt("return", {
                                        value: n,
                                        done: o,
                                      });
                                    case 9:
                                      return (
                                        (this._loaded += n.byteLength),
                                        this.onProgress &&
                                          this.onProgress({
                                            loaded: this._loaded,
                                          }),
                                        (a = new Uint8Array(n).buffer),
                                        e.abrupt("return", {
                                          value: a,
                                          done: !1,
                                        })
                                      );
                                    case 13:
                                    case "end":
                                      return e.stop();
                                  }
                              },
                              e,
                              this
                            );
                          })
                        )),
                        function () {
                          return t.apply(this, arguments);
                        }),
                    },
                    {
                      key: "cancel",
                      value: function (e) {
                        this._reader && this._reader.cancel(e),
                          this._abortController &&
                            this._abortController.abort();
                      },
                    },
                    {
                      key: "isStreamingSupported",
                      get: function () {
                        return this._isStreamingSupported;
                      },
                    },
                  ]),
                  e
                );
              })();
          },
          function (e, t, n) {
            "use strict";
            Object.defineProperty(t, "__esModule", { value: !0 }),
              (t.PDFNetworkStream = f),
              (t.NetworkManager = d);
            var o = s(n(147)),
              i = n(1),
              a = n(166),
              r = s(n(3));
            function s(e) {
              return e && e.__esModule ? e : { default: e };
            }
            function l(e, t, n, o, i, a, r) {
              try {
                var s = e[a](r),
                  l = s.value;
              } catch (e) {
                return void n(e);
              }
              s.done ? t(l) : Promise.resolve(l).then(o, i);
            }
            function c(e) {
              return function () {
                var t = this,
                  n = arguments;
                return new Promise(function (o, i) {
                  var a = e.apply(t, n);
                  function r(e) {
                    l(a, o, i, r, s, "next", e);
                  }
                  function s(e) {
                    l(a, o, i, r, s, "throw", e);
                  }
                  r(void 0);
                });
              };
            }
            function d(e, t) {
              (this.url = e),
                (t = t || {}),
                (this.isHttp = /^https?:/i.test(e)),
                (this.httpHeaders = (this.isHttp && t.httpHeaders) || {}),
                (this.withCredentials = t.withCredentials || !1),
                (this.getXhr =
                  t.getXhr ||
                  function () {
                    return new XMLHttpRequest();
                  }),
                (this.currXhrId = 0),
                (this.pendingRequests = Object.create(null)),
                (this.loadedRequests = Object.create(null));
            }
            function u(e) {
              var t = e.response;
              return "string" != typeof t ? t : (0, i.stringToBytes)(t).buffer;
            }
            var p,
              g,
              h = (function () {
                try {
                  var e = new XMLHttpRequest();
                  return (
                    e.open("GET", r.default.location.href),
                    (e.responseType = "moz-chunked-arraybuffer"),
                    "moz-chunked-arraybuffer" === e.responseType
                  );
                } catch (e) {
                  return !1;
                }
              })();
            function f(e) {
              (this._source = e),
                (this._manager = new d(e.url, {
                  httpHeaders: e.httpHeaders,
                  withCredentials: e.withCredentials,
                })),
                (this._rangeChunkSize = e.rangeChunkSize),
                (this._fullRequestReader = null),
                (this._rangeRequestReaders = []);
            }
            function m(e, t) {
              this._manager = e;
              var n = {
                onHeadersReceived: this._onHeadersReceived.bind(this),
                onProgressiveData: t.disableStream
                  ? null
                  : this._onProgressiveData.bind(this),
                onDone: this._onDone.bind(this),
                onError: this._onError.bind(this),
                onProgress: this._onProgress.bind(this),
              };
              (this._url = t.url),
                (this._fullRequestId = e.requestFull(n)),
                (this._headersReceivedCapability = (0,
                i.createPromiseCapability)()),
                (this._disableRange = t.disableRange || !1),
                (this._contentLength = t.length),
                (this._rangeChunkSize = t.rangeChunkSize),
                this._rangeChunkSize ||
                  this._disableRange ||
                  (this._disableRange = !0),
                (this._isStreamingSupported = !1),
                (this._isRangeSupported = !1),
                (this._cachedChunks = []),
                (this._requests = []),
                (this._done = !1),
                (this._storedError = void 0),
                (this._filename = null),
                (this.onProgress = null);
            }
            function y(e, t, n) {
              this._manager = e;
              var o = {
                onDone: this._onDone.bind(this),
                onProgress: this._onProgress.bind(this),
              };
              (this._requestId = e.requestRange(t, n, o)),
                (this._requests = []),
                (this._queuedChunk = null),
                (this._done = !1),
                (this.onProgress = null),
                (this.onClosed = null);
            }
            (d.prototype = {
              requestRange: function (e, t, n) {
                var o = { begin: e, end: t };
                for (var i in n) o[i] = n[i];
                return this.request(o);
              },
              requestFull: function (e) {
                return this.request(e);
              },
              request: function (e) {
                var t = this.getXhr(),
                  n = this.currXhrId++,
                  o = (this.pendingRequests[n] = { xhr: t });
                for (var i in (t.open("GET", this.url),
                (t.withCredentials = this.withCredentials),
                this.httpHeaders)) {
                  var a = this.httpHeaders[i];
                  void 0 !== a && t.setRequestHeader(i, a);
                }
                if (this.isHttp && "begin" in e && "end" in e) {
                  var r = e.begin + "-" + (e.end - 1);
                  t.setRequestHeader("Range", "bytes=" + r),
                    (o.expectedStatus = 206);
                } else o.expectedStatus = 200;
                return (
                  h && e.onProgressiveData
                    ? ((t.responseType = "moz-chunked-arraybuffer"),
                      (o.onProgressiveData = e.onProgressiveData),
                      (o.mozChunked = !0))
                    : (t.responseType = "arraybuffer"),
                  e.onError &&
                    (t.onerror = function (n) {
                      e.onError(t.status);
                    }),
                  (t.onreadystatechange = this.onStateChange.bind(this, n)),
                  (t.onprogress = this.onProgress.bind(this, n)),
                  (o.onHeadersReceived = e.onHeadersReceived),
                  (o.onDone = e.onDone),
                  (o.onError = e.onError),
                  (o.onProgress = e.onProgress),
                  t.send(null),
                  n
                );
              },
              onProgress: function (e, t) {
                var n = this.pendingRequests[e];
                if (n) {
                  if (n.mozChunked) {
                    var o = u(n.xhr);
                    n.onProgressiveData(o);
                  }
                  var i = n.onProgress;
                  i && i(t);
                }
              },
              onStateChange: function (e, t) {
                var n = this.pendingRequests[e];
                if (n) {
                  var o = n.xhr;
                  if (
                    (o.readyState >= 2 &&
                      n.onHeadersReceived &&
                      (n.onHeadersReceived(), delete n.onHeadersReceived),
                    4 === o.readyState && e in this.pendingRequests)
                  )
                    if (
                      (delete this.pendingRequests[e],
                      0 === o.status && this.isHttp)
                    )
                      n.onError && n.onError(o.status);
                    else {
                      var i = o.status || 200;
                      if (
                        (200 === i && 206 === n.expectedStatus) ||
                        i === n.expectedStatus
                      ) {
                        this.loadedRequests[e] = !0;
                        var a = u(o);
                        if (206 === i) {
                          var r = o.getResponseHeader("Content-Range"),
                            s = /bytes (\d+)-(\d+)\/(\d+)/.exec(r),
                            l = parseInt(s[1], 10);
                          n.onDone({ begin: l, chunk: a });
                        } else
                          n.onProgressiveData
                            ? n.onDone(null)
                            : a
                            ? n.onDone({ begin: 0, chunk: a })
                            : n.onError && n.onError(o.status);
                      } else n.onError && n.onError(o.status);
                    }
                }
              },
              hasPendingRequests: function () {
                for (var e in this.pendingRequests) return !0;
                return !1;
              },
              getRequestXhr: function (e) {
                return this.pendingRequests[e].xhr;
              },
              isStreamingRequest: function (e) {
                return !!this.pendingRequests[e].onProgressiveData;
              },
              isPendingRequest: function (e) {
                return e in this.pendingRequests;
              },
              isLoadedRequest: function (e) {
                return e in this.loadedRequests;
              },
              abortAllRequests: function () {
                for (var e in this.pendingRequests) this.abortRequest(0 | e);
              },
              abortRequest: function (e) {
                var t = this.pendingRequests[e].xhr;
                delete this.pendingRequests[e], t.abort();
              },
            }),
              (f.prototype = {
                _onRangeRequestReaderClosed: function (e) {
                  var t = this._rangeRequestReaders.indexOf(e);
                  t >= 0 && this._rangeRequestReaders.splice(t, 1);
                },
                getFullReader: function () {
                  return (
                    (0, i.assert)(!this._fullRequestReader),
                    (this._fullRequestReader = new m(
                      this._manager,
                      this._source
                    )),
                    this._fullRequestReader
                  );
                },
                getRangeReader: function (e, t) {
                  var n = new y(this._manager, e, t);
                  return (
                    (n.onClosed = this._onRangeRequestReaderClosed.bind(this)),
                    this._rangeRequestReaders.push(n),
                    n
                  );
                },
                cancelAllRequests: function (e) {
                  this._fullRequestReader && this._fullRequestReader.cancel(e),
                    this._rangeRequestReaders.slice(0).forEach(function (t) {
                      t.cancel(e);
                    });
                },
              }),
              (m.prototype = {
                _onHeadersReceived: function () {
                  var e = this._fullRequestId,
                    t = this._manager.getRequestXhr(e),
                    n = function (e) {
                      return t.getResponseHeader(e);
                    },
                    o = (0, a.validateRangeRequestCapabilities)({
                      getResponseHeader: n,
                      isHttp: this._manager.isHttp,
                      rangeChunkSize: this._rangeChunkSize,
                      disableRange: this._disableRange,
                    }),
                    i = o.allowRangeRequests,
                    r = o.suggestedLength;
                  i && (this._isRangeSupported = !0),
                    (this._contentLength = r || this._contentLength),
                    (this._filename = (0, a.extractFilenameFromHeader)(n));
                  var s = this._manager;
                  s.isStreamingRequest(e)
                    ? (this._isStreamingSupported = !0)
                    : this._isRangeSupported && s.abortRequest(e),
                    this._headersReceivedCapability.resolve();
                },
                _onProgressiveData: function (e) {
                  this._requests.length > 0
                    ? this._requests.shift().resolve({ value: e, done: !1 })
                    : this._cachedChunks.push(e);
                },
                _onDone: function (e) {
                  e && this._onProgressiveData(e.chunk),
                    (this._done = !0),
                    this._cachedChunks.length > 0 ||
                      (this._requests.forEach(function (e) {
                        e.resolve({ value: void 0, done: !0 });
                      }),
                      (this._requests = []));
                },
                _onError: function (e) {
                  var t = this._url,
                    n = (0, a.createResponseStatusError)(e, t);
                  (this._storedError = n),
                    this._headersReceivedCapability.reject(n),
                    this._requests.forEach(function (e) {
                      e.reject(n);
                    }),
                    (this._requests = []),
                    (this._cachedChunks = []);
                },
                _onProgress: function (e) {
                  this.onProgress &&
                    this.onProgress({
                      loaded: e.loaded,
                      total: e.lengthComputable ? e.total : this._contentLength,
                    });
                },
                get filename() {
                  return this._filename;
                },
                get isRangeSupported() {
                  return this._isRangeSupported;
                },
                get isStreamingSupported() {
                  return this._isStreamingSupported;
                },
                get contentLength() {
                  return this._contentLength;
                },
                get headersReady() {
                  return this._headersReceivedCapability.promise;
                },
                read:
                  ((p = c(
                    o.default.mark(function e() {
                      var t, n;
                      return o.default.wrap(
                        function (e) {
                          for (;;)
                            switch ((e.prev = e.next)) {
                              case 0:
                                if (!this._storedError) {
                                  e.next = 2;
                                  break;
                                }
                                throw this._storedError;
                              case 2:
                                if (!(this._cachedChunks.length > 0)) {
                                  e.next = 5;
                                  break;
                                }
                                return (
                                  (t = this._cachedChunks.shift()),
                                  e.abrupt("return", { value: t, done: !1 })
                                );
                              case 5:
                                if (!this._done) {
                                  e.next = 7;
                                  break;
                                }
                                return e.abrupt("return", {
                                  value: void 0,
                                  done: !0,
                                });
                              case 7:
                                return (
                                  (n = (0, i.createPromiseCapability)()),
                                  this._requests.push(n),
                                  e.abrupt("return", n.promise)
                                );
                              case 10:
                              case "end":
                                return e.stop();
                            }
                        },
                        e,
                        this
                      );
                    })
                  )),
                  function () {
                    return p.apply(this, arguments);
                  }),
                cancel: function (e) {
                  (this._done = !0),
                    this._headersReceivedCapability.reject(e),
                    this._requests.forEach(function (e) {
                      e.resolve({ value: void 0, done: !0 });
                    }),
                    (this._requests = []),
                    this._manager.isPendingRequest(this._fullRequestId) &&
                      this._manager.abortRequest(this._fullRequestId),
                    (this._fullRequestReader = null);
                },
              }),
              (y.prototype = {
                _close: function () {
                  this.onClosed && this.onClosed(this);
                },
                _onDone: function (e) {
                  var t = e.chunk;
                  this._requests.length > 0
                    ? this._requests.shift().resolve({ value: t, done: !1 })
                    : (this._queuedChunk = t),
                    (this._done = !0),
                    this._requests.forEach(function (e) {
                      e.resolve({ value: void 0, done: !0 });
                    }),
                    (this._requests = []),
                    this._close();
                },
                _onProgress: function (e) {
                  !this.isStreamingSupported &&
                    this.onProgress &&
                    this.onProgress({ loaded: e.loaded });
                },
                get isStreamingSupported() {
                  return !1;
                },
                read:
                  ((g = c(
                    o.default.mark(function e() {
                      var t, n;
                      return o.default.wrap(
                        function (e) {
                          for (;;)
                            switch ((e.prev = e.next)) {
                              case 0:
                                if (null === this._queuedChunk) {
                                  e.next = 4;
                                  break;
                                }
                                return (
                                  (t = this._queuedChunk),
                                  (this._queuedChunk = null),
                                  e.abrupt("return", { value: t, done: !1 })
                                );
                              case 4:
                                if (!this._done) {
                                  e.next = 6;
                                  break;
                                }
                                return e.abrupt("return", {
                                  value: void 0,
                                  done: !0,
                                });
                              case 6:
                                return (
                                  (n = (0, i.createPromiseCapability)()),
                                  this._requests.push(n),
                                  e.abrupt("return", n.promise)
                                );
                              case 9:
                              case "end":
                                return e.stop();
                            }
                        },
                        e,
                        this
                      );
                    })
                  )),
                  function () {
                    return g.apply(this, arguments);
                  }),
                cancel: function (e) {
                  (this._done = !0),
                    this._requests.forEach(function (e) {
                      e.resolve({ value: void 0, done: !0 });
                    }),
                    (this._requests = []),
                    this._manager.isPendingRequest(this._requestId) &&
                      this._manager.abortRequest(this._requestId),
                    this._close();
                },
              });
          },
        ]);
      }),
        (e.exports = a());
    }).call(this, n(221).Buffer, n(109), n(183));
  }