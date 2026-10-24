/**
 * Webpack Module #610
 * Type: unknown
 */

function (e, t, n) {
    var o;
    !(function (i, a) {
      "use strict";
      var r = "model",
        s = "name",
        l = "type",
        c = "vendor",
        d = "version",
        u = "mobile",
        p = "tablet",
        g = "smarttv",
        h = function (e) {
          for (var t = {}, n = 0; n < e.length; n++)
            t[e[n].toUpperCase()] = e[n];
          return t;
        },
        f = function (e, t) {
          return "string" == typeof e && -1 !== m(t).indexOf(m(e));
        },
        m = function (e) {
          return e.toLowerCase();
        },
        y = function (e, t) {
          if ("string" == typeof e)
            return (
              (e = e.replace(/^\s\s*/, "")),
              void 0 === t ? e : e.substring(0, 350)
            );
        },
        v = function (e, t) {
          for (var n, o, i, a, r, s, l = 0; l < t.length && !r; ) {
            var c = t[l],
              d = t[l + 1];
            for (n = o = 0; n < c.length && !r; )
              if ((r = c[n++].exec(e)))
                for (i = 0; i < d.length; i++)
                  (s = r[++o]),
                    "object" == typeof (a = d[i]) && a.length > 0
                      ? 2 === a.length
                        ? "function" == typeof a[1]
                          ? (this[a[0]] = a[1].call(this, s))
                          : (this[a[0]] = a[1])
                        : 3 === a.length
                        ? "function" != typeof a[1] || (a[1].exec && a[1].test)
                          ? (this[a[0]] = s ? s.replace(a[1], a[2]) : void 0)
                          : (this[a[0]] = s ? a[1].call(this, s, a[2]) : void 0)
                        : 4 === a.length &&
                          (this[a[0]] = s
                            ? a[3].call(this, s.replace(a[1], a[2]))
                            : void 0)
                      : (this[a] = s || void 0);
            l += 2;
          }
        },
        _ = function (e, t) {
          for (var n in t)
            if ("object" == typeof t[n] && t[n].length > 0) {
              for (var o = 0; o < t[n].length; o++)
                if (f(t[n][o], e)) return "?" === n ? void 0 : n;
            } else if (f(t[n], e)) return "?" === n ? void 0 : n;
          return e;
        },
        b = {
          ME: "4.90",
          "NT 3.11": "NT3.51",
          "NT 4.0": "NT4.0",
          2e3: "NT 5.0",
          XP: ["NT 5.1", "NT 5.2"],
          Vista: "NT 6.0",
          7: "NT 6.1",
          8: "NT 6.2",
          8.1: "NT 6.3",
          10: ["NT 6.4", "NT 10.0"],
          RT: "ARM",
        },
        w = {
          browser: [
            [/\b(?:crmo|crios)\/([\w\.]+)/i],
            [d, [s, "Chrome"]],
            [/edg(?:e|ios|a)?\/([\w\.]+)/i],
            [d, [s, "Edge"]],
            [
              /(opera mini)\/([-\w\.]+)/i,
              /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,
              /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i,
            ],
            [s, d],
            [/opios[\/ ]+([\w\.]+)/i],
            [d, [s, "Opera Mini"]],
            [/\bopr\/([\w\.]+)/i],
            [d, [s, "Opera"]],
            [
              /(kindle)\/([\w\.]+)/i,
              /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i,
              /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i,
              /(ba?idubrowser)[\/ ]?([\w\.]+)/i,
              /(?:ms|\()(ie) ([\w\.]+)/i,
              /(flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i,
              /(weibo)__([\d\.]+)/i,
            ],
            [s, d],
            [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i],
            [d, [s, "UCBrowser"]],
            [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i],
            [d, [s, "WeChat(Win) Desktop"]],
            [/micromessenger\/([\w\.]+)/i],
            [d, [s, "WeChat"]],
            [/konqueror\/([\w\.]+)/i],
            [d, [s, "Konqueror"]],
            [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i],
            [d, [s, "IE"]],
            [/yabrowser\/([\w\.]+)/i],
            [d, [s, "Yandex"]],
            [/(avast|avg)\/([\w\.]+)/i],
            [[s, /(.+)/, "$1 Secure Browser"], d],
            [/\bfocus\/([\w\.]+)/i],
            [d, [s, "Firefox Focus"]],
            [/\bopt\/([\w\.]+)/i],
            [d, [s, "Opera Touch"]],
            [/coc_coc\w+\/([\w\.]+)/i],
            [d, [s, "Coc Coc"]],
            [/dolfin\/([\w\.]+)/i],
            [d, [s, "Dolphin"]],
            [/coast\/([\w\.]+)/i],
            [d, [s, "Opera Coast"]],
            [/miuibrowser\/([\w\.]+)/i],
            [d, [s, "MIUI Browser"]],
            [/fxios\/([-\w\.]+)/i],
            [d, [s, "Firefox"]],
            [/\bqihu|(qi?ho?o?|360)browser/i],
            [[s, "360 Browser"]],
            [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i],
            [[s, /(.+)/, "$1 Browser"], d],
            [/(comodo_dragon)\/([\w\.]+)/i],
            [[s, /_/g, " "], d],
            [
              /(electron)\/([\w\.]+) safari/i,
              /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,
              /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i,
            ],
            [s, d],
            [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i],
            [s],
            [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i],
            [[s, "Facebook"], d],
            [
              /safari (line)\/([\w\.]+)/i,
              /\b(line)\/([\w\.]+)\/iab/i,
              /(chromium|instagram)[\/ ]([-\w\.]+)/i,
            ],
            [s, d],
            [/\bgsa\/([\w\.]+) .*safari\//i],
            [d, [s, "GSA"]],
            [/headlesschrome(?:\/([\w\.]+)| )/i],
            [d, [s, "Chrome Headless"]],
            [/ wv\).+(chrome)\/([\w\.]+)/i],
            [[s, "Chrome WebView"], d],
            [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i],
            [d, [s, "Android Browser"]],
            [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i],
            [s, d],
            [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i],
            [d, [s, "Mobile Safari"]],
            [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i],
            [d, s],
            [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i],
            [
              s,
              [
                d,
                _,
                {
                  "1.0": "/8",
                  1.2: "/1",
                  1.3: "/3",
                  "2.0": "/412",
                  "2.0.2": "/416",
                  "2.0.3": "/417",
                  "2.0.4": "/419",
                  "?": "/",
                },
              ],
            ],
            [/(webkit|khtml)\/([\w\.]+)/i],
            [s, d],
            [/(navigator|netscape\d?)\/([-\w\.]+)/i],
            [[s, "Netscape"], d],
            [/mobile vr; rv:([\w\.]+)\).+firefox/i],
            [d, [s, "Firefox Reality"]],
            [
              /ekiohf.+(flow)\/([\w\.]+)/i,
              /(swiftfox)/i,
              /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i,
              /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
              /(firefox)\/([\w\.]+)/i,
              /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,
              /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
              /(links) \(([\w\.]+)/i,
            ],
            [s, d],
            [/(cobalt)\/([\w\.]+)/i],
            [s, [d, /master.|lts./, ""]],
          ],
          cpu: [
            [/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i],
            [["architecture", "amd64"]],
            [/(ia32(?=;))/i],
            [["architecture", m]],
            [/((?:i[346]|x)86)[;\)]/i],
            [["architecture", "ia32"]],
            [/\b(aarch64|arm(v?8e?l?|_?64))\b/i],
            [["architecture", "arm64"]],
            [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i],
            [["architecture", "armhf"]],
            [/windows (ce|mobile); ppc;/i],
            [["architecture", "arm"]],
            [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i],
            [["architecture", /ower/, "", m]],
            [/(sun4\w)[;\)]/i],
            [["architecture", "sparc"]],
            [
              /((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i,
            ],
            [["architecture", m]],
          ],
          device: [
            [
              /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i,
            ],
            [r, [c, "Samsung"], [l, p]],
            [
              /\b((?:s[cgp]h|gt|sm)-\w+|galaxy nexus)/i,
              /samsung[- ]([-\w]+)/i,
              /sec-(sgh\w+)/i,
            ],
            [r, [c, "Samsung"], [l, u]],
            [/((ipod|iphone)\d+,\d+)/i],
            [r, [c, "Apple"], [l, u]],
            [/(ipad\d+,\d+)/i],
            [r, [c, "Apple"], [l, p]],
            [/\((ip(?:hone|od)[\w ]*);/i],
            [r, [c, "Apple"], [l, u]],
            [
              /\((ipad);[-\w\),; ]+apple/i,
              /applecoremedia\/[\w\.]+ \((ipad)/i,
              /\b(ipad)\d\d?,\d\d?[;\]].+ios/i,
            ],
            [r, [c, "Apple"], [l, p]],
            [/(macintosh);/i],
            [r, [c, "Apple"]],
            [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i],
            [r, [c, "Huawei"], [l, p]],
            [
              /(?:huawei|honor)([-\w ]+)[;\)]/i,
              /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i,
            ],
            [r, [c, "Huawei"], [l, u]],
            [
              /\b(poco[\w ]+)(?: bui|\))/i,
              /\b; (\w+) build\/hm\1/i,
              /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,
              /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,
              /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i,
            ],
            [
              [r, /_/g, " "],
              [c, "Xiaomi"],
              [l, u],
            ],
            [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i],
            [
              [r, /_/g, " "],
              [c, "Xiaomi"],
              [l, p],
            ],
            [
              /; (\w+) bui.+ oppo/i,
              /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i,
            ],
            [r, [c, "OPPO"], [l, u]],
            [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i],
            [r, [c, "Vivo"], [l, u]],
            [/\b(rmx[12]\d{3})(?: bui|;|\))/i],
            [r, [c, "Realme"], [l, u]],
            [
              /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
              /\bmot(?:orola)?[- ](\w*)/i,
              /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i,
            ],
            [r, [c, "Motorola"], [l, u]],
            [/\b(mz60\d|xoom[2 ]{0,2}) build\//i],
            [r, [c, "Motorola"], [l, p]],
            [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i],
            [r, [c, "LG"], [l, p]],
            [
              /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
              /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i,
              /\blg-?([\d\w]+) bui/i,
            ],
            [r, [c, "LG"], [l, u]],
            [
              /(ideatab[-\w ]+)/i,
              /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i,
            ],
            [r, [c, "Lenovo"], [l, p]],
            [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i],
            [
              [r, /_/g, " "],
              [c, "Nokia"],
              [l, u],
            ],
            [/(pixel c)\b/i],
            [r, [c, "Google"], [l, p]],
            [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i],
            [r, [c, "Google"], [l, u]],
            [
              /droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i,
            ],
            [r, [c, "Sony"], [l, u]],
            [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i],
            [
              [r, "Xperia Tablet"],
              [c, "Sony"],
              [l, p],
            ],
            [
              / (kb2005|in20[12]5|be20[12][59])\b/i,
              /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i,
            ],
            [r, [c, "OnePlus"], [l, u]],
            [
              /(alexa)webm/i,
              /(kf[a-z]{2}wi)( bui|\))/i,
              /(kf[a-z]+)( bui|\)).+silk\//i,
            ],
            [r, [c, "Amazon"], [l, p]],
            [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i],
            [
              [r, /(.+)/g, "Fire Phone $1"],
              [c, "Amazon"],
              [l, u],
            ],
            [/(playbook);[-\w\),; ]+(rim)/i],
            [r, c, [l, p]],
            [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i],
            [r, [c, "BlackBerry"], [l, u]],
            [
              /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i,
            ],
            [r, [c, "ASUS"], [l, p]],
            [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i],
            [r, [c, "ASUS"], [l, u]],
            [/(nexus 9)/i],
            [r, [c, "HTC"], [l, p]],
            [
              /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,
              /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
              /(alcatel|geeksphone|nexian|panasonic|sony(?!-bra))[-_ ]?([-\w]*)/i,
            ],
            [c, [r, /_/g, " "], [l, u]],
            [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i],
            [r, [c, "Acer"], [l, p]],
            [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i],
            [r, [c, "Meizu"], [l, u]],
            [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i],
            [r, [c, "Sharp"], [l, u]],
            [
              /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i,
              /(hp) ([\w ]+\w)/i,
              /(asus)-?(\w+)/i,
              /(microsoft); (lumia[\w ]+)/i,
              /(lenovo)[-_ ]?([-\w]+)/i,
              /(jolla)/i,
              /(oppo) ?([\w ]+) bui/i,
            ],
            [c, r, [l, u]],
            [
              /(archos) (gamepad2?)/i,
              /(hp).+(touchpad(?!.+tablet)|tablet)/i,
              /(kindle)\/([\w\.]+)/i,
              /(nook)[\w ]+build\/(\w+)/i,
              /(dell) (strea[kpr\d ]*[\dko])/i,
              /(le[- ]+pan)[- ]+(\w{1,9}) bui/i,
              /(trinity)[- ]*(t\d{3}) bui/i,
              /(gigaset)[- ]+(q\w{1,9}) bui/i,
              /(vodafone) ([\w ]+)(?:\)| bui)/i,
            ],
            [c, r, [l, p]],
            [/(surface duo)/i],
            [r, [c, "Microsoft"], [l, p]],
            [/droid [\d\.]+; (fp\du?)(?: b|\))/i],
            [r, [c, "Fairphone"], [l, u]],
            [/(u304aa)/i],
            [r, [c, "AT&T"], [l, u]],
            [/\bsie-(\w*)/i],
            [r, [c, "Siemens"], [l, u]],
            [/\b(rct\w+) b/i],
            [r, [c, "RCA"], [l, p]],
            [/\b(venue[\d ]{2,7}) b/i],
            [r, [c, "Dell"], [l, p]],
            [/\b(q(?:mv|ta)\w+) b/i],
            [r, [c, "Verizon"], [l, p]],
            [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i],
            [r, [c, "Barnes & Noble"], [l, p]],
            [/\b(tm\d{3}\w+) b/i],
            [r, [c, "NuVision"], [l, p]],
            [/\b(k88) b/i],
            [r, [c, "ZTE"], [l, p]],
            [/\b(nx\d{3}j) b/i],
            [r, [c, "ZTE"], [l, u]],
            [/\b(gen\d{3}) b.+49h/i],
            [r, [c, "Swiss"], [l, u]],
            [/\b(zur\d{3}) b/i],
            [r, [c, "Swiss"], [l, p]],
            [/\b((zeki)?tb.*\b) b/i],
            [r, [c, "Zeki"], [l, p]],
            [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i],
            [[c, "Dragon Touch"], r, [l, p]],
            [/\b(ns-?\w{0,9}) b/i],
            [r, [c, "Insignia"], [l, p]],
            [/\b((nxa|next)-?\w{0,9}) b/i],
            [r, [c, "NextBook"], [l, p]],
            [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i],
            [[c, "Voice"], r, [l, u]],
            [/\b(lvtel\-)?(v1[12]) b/i],
            [[c, "LvTel"], r, [l, u]],
            [/\b(ph-1) /i],
            [r, [c, "Essential"], [l, u]],
            [/\b(v(100md|700na|7011|917g).*\b) b/i],
            [r, [c, "Envizen"], [l, p]],
            [/\b(trio[-\w\. ]+) b/i],
            [r, [c, "MachSpeed"], [l, p]],
            [/\btu_(1491) b/i],
            [r, [c, "Rotor"], [l, p]],
            [/(shield[\w ]+) b/i],
            [r, [c, "Nvidia"], [l, p]],
            [/(sprint) (\w+)/i],
            [c, r, [l, u]],
            [/(kin\.[onetw]{3})/i],
            [
              [r, /\./g, " "],
              [c, "Microsoft"],
              [l, u],
            ],
            [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i],
            [r, [c, "Zebra"], [l, p]],
            [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i],
            [r, [c, "Zebra"], [l, u]],
            [/(ouya)/i, /(nintendo) ([wids3utch]+)/i],
            [c, r, [l, "console"]],
            [/droid.+; (shield) bui/i],
            [r, [c, "Nvidia"], [l, "console"]],
            [/(playstation [345portablevi]+)/i],
            [r, [c, "Sony"], [l, "console"]],
            [/\b(xbox(?: one)?(?!; xbox))[\); ]/i],
            [r, [c, "Microsoft"], [l, "console"]],
            [/smart-tv.+(samsung)/i],
            [c, [l, g]],
            [/hbbtv.+maple;(\d+)/i],
            [
              [r, /^/, "SmartTV"],
              [c, "Samsung"],
              [l, g],
            ],
            [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i],
            [
              [c, "LG"],
              [l, g],
            ],
            [/(apple) ?tv/i],
            [c, [r, "Apple TV"], [l, g]],
            [/crkey/i],
            [
              [r, "Chromecast"],
              [c, "Google"],
              [l, g],
            ],
            [/droid.+aft(\w)( bui|\))/i],
            [r, [c, "Amazon"], [l, g]],
            [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i],
            [r, [c, "Sharp"], [l, g]],
            [/(bravia[\w ]+)( bui|\))/i],
            [r, [c, "Sony"], [l, g]],
            [/(mitv-\w{5}) bui/i],
            [r, [c, "Xiaomi"], [l, g]],
            [
              /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,
              /hbbtv\/\d+\.\d+\.\d+ +\([\w ]*; *(\w[^;]*);([^;]*)/i,
            ],
            [
              [c, y],
              [r, y],
              [l, g],
            ],
            [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i],
            [[l, g]],
            [/((pebble))app/i],
            [c, r, [l, "wearable"]],
            [/droid.+; (glass) \d/i],
            [r, [c, "Google"], [l, "wearable"]],
            [/droid.+; (wt63?0{2,3})\)/i],
            [r, [c, "Zebra"], [l, "wearable"]],
            [/(quest( 2)?)/i],
            [r, [c, "Facebook"], [l, "wearable"]],
            [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i],
            [c, [l, "embedded"]],
            [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i],
            [r, [l, u]],
            [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i],
            [r, [l, p]],
            [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i],
            [[l, p]],
            [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i],
            [[l, u]],
            [/(android[-\w\. ]{0,9});.+buil/i],
            [r, [c, "Generic"]],
          ],
          engine: [
            [/windows.+ edge\/([\w\.]+)/i],
            [d, [s, "EdgeHTML"]],
            [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i],
            [d, [s, "Blink"]],
            [
              /(presto)\/([\w\.]+)/i,
              /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,
              /ekioh(flow)\/([\w\.]+)/i,
              /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,
              /(icab)[\/ ]([23]\.[\d\.]+)/i,
            ],
            [s, d],
            [/rv\:([\w\.]{1,9})\b.+(gecko)/i],
            [d, s],
          ],
          os: [
            [/microsoft (windows) (vista|xp)/i],
            [s, d],
            [
              /(windows) nt 6\.2; (arm)/i,
              /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i,
              /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i,
            ],
            [s, [d, _, b]],
            [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i],
            [
              [s, "Windows"],
              [d, _, b],
            ],
            [
              /ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i,
              /cfnetwork\/.+darwin/i,
            ],
            [
              [d, /_/g, "."],
              [s, "iOS"],
            ],
            [
              /(mac os x) ?([\w\. ]*)/i,
              /(macintosh|mac_powerpc\b)(?!.+haiku)/i,
            ],
            [
              [s, "Mac OS"],
              [d, /_/g, "."],
            ],
            [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i],
            [d, s],
            [
              /(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i,
              /(blackberry)\w*\/([\w\.]*)/i,
              /(tizen|kaios)[\/ ]([\w\.]+)/i,
              /\((series40);/i,
            ],
            [s, d],
            [/\(bb(10);/i],
            [d, [s, "BlackBerry"]],
            [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i],
            [d, [s, "Symbian"]],
            [
              /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i,
            ],
            [d, [s, "Firefox OS"]],
            [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i],
            [d, [s, "webOS"]],
            [/crkey\/([\d\.]+)/i],
            [d, [s, "Chromecast"]],
            [/(cros) [\w]+ ([\w\.]+\w)/i],
            [[s, "Chromium OS"], d],
            [
              /(nintendo|playstation) ([wids345portablevuch]+)/i,
              /(xbox); +xbox ([^\);]+)/i,
              /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,
              /(mint)[\/\(\) ]?(\w*)/i,
              /(mageia|vectorlinux)[; ]/i,
              /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
              /(hurd|linux) ?([\w\.]*)/i,
              /(gnu) ?([\w\.]*)/i,
              /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,
              /(haiku) (\w+)/i,
            ],
            [s, d],
            [/(sunos) ?([\w\.\d]*)/i],
            [[s, "Solaris"], d],
            [
              /((?:open)?solaris)[-\/ ]?([\w\.]*)/i,
              /(aix) ((\d)(?=\.|\)| )[\w\.])*/i,
              /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux)/i,
              /(unix) ?([\w\.]*)/i,
            ],
            [s, d],
          ],
        },
        C = function (e, t) {
          if (
            ("object" == typeof e && ((t = e), (e = void 0)),
            !(this instanceof C))
          )
            return new C(e, t).getResult();
          var n =
              e ||
              (void 0 !== i && i.navigator && i.navigator.userAgent
                ? i.navigator.userAgent
                : ""),
            o = t
              ? (function (e, t) {
                  var n = {};
                  for (var o in e)
                    t[o] && t[o].length % 2 == 0
                      ? (n[o] = t[o].concat(e[o]))
                      : (n[o] = e[o]);
                  return n;
                })(w, t)
              : w;
          return (
            (this.getBrowser = function () {
              var e,
                t = {};
              return (
                (t[s] = void 0),
                (t[d] = void 0),
                v.call(t, n, o.browser),
                (t.major =
                  "string" == typeof (e = t.version)
                    ? e.replace(/[^\d\.]/g, "").split(".")[0]
                    : void 0),
                t
              );
            }),
            (this.getCPU = function () {
              var e = { architecture: void 0 };
              return v.call(e, n, o.cpu), e;
            }),
            (this.getDevice = function () {
              var e = { vendor: void 0, model: void 0, type: void 0 };
              return v.call(e, n, o.device), e;
            }),
            (this.getEngine = function () {
              var e = { name: void 0, version: void 0 };
              return v.call(e, n, o.engine), e;
            }),
            (this.getOS = function () {
              var e = { name: void 0, version: void 0 };
              return v.call(e, n, o.os), e;
            }),
            (this.getResult = function () {
              return {
                ua: this.getUA(),
                browser: this.getBrowser(),
                engine: this.getEngine(),
                os: this.getOS(),
                device: this.getDevice(),
                cpu: this.getCPU(),
              };
            }),
            (this.getUA = function () {
              return n;
            }),
            (this.setUA = function (e) {
              return (
                (n = "string" == typeof e && e.length > 350 ? y(e, 350) : e),
                this
              );
            }),
            this.setUA(n),
            this
          );
        };
      (C.VERSION = "0.7.33"),
        (C.BROWSER = h([s, d, "major"])),
        (C.CPU = h(["architecture"])),
        (C.DEVICE = h([r, c, l, "console", u, g, p, "wearable", "embedded"])),
        (C.ENGINE = C.OS = h([s, d])),
        void 0 !== t
          ? (void 0 !== e && e.exports && (t = e.exports = C), (t.UAParser = C))
          : n(414)
          ? void 0 ===
              (o = function () {
                return C;
              }.call(t, n, t, e)) || (e.exports = o)
          : void 0 !== i && (i.UAParser = C);
      var x = void 0 !== i && (i.jQuery || i.Zepto);
      if (x && !x.ua) {
        var S = new C();
        (x.ua = S.getResult()),
          (x.ua.get = function () {
            return S.getUA();
          }),
          (x.ua.set = function (e) {
            S.setUA(e);
            var t = S.getResult();
            for (var n in t) x.ua[n] = t[n];
          });
      }
    })("object" == typeof window ? window : this);
  }